const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const { requireAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');
const { syncTaskToOutlook, updateOutlookEvent, getValidToken } = require('../services/outlookSync');
const { encrypt } = require('../services/tokenCrypto');

// In-memory store for OAuth state nonces: nonce -> { userId, expiresAt }
// TTL of 10 minutes is sufficient for the OAuth redirect round-trip.
const oauthStateStore = new Map();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function generateOAuthState(userId) {
  const nonce = crypto.randomBytes(32).toString('hex');
  oauthStateStore.set(nonce, { userId, expiresAt: Date.now() + OAUTH_STATE_TTL_MS });
  return nonce;
}

function consumeOAuthState(nonce) {
  const entry = oauthStateStore.get(nonce);
  if (!entry) return null;
  oauthStateStore.delete(nonce);
  if (Date.now() > entry.expiresAt) return null;
  return entry.userId;
}

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Service key: necessario lato server per scrivere outlook_tokens bypassando RLS
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/api/outlook/callback';
const MICROSOFT_TENANT = process.env.MICROSOFT_TENANT || 'common';

// Genera il link per autorizzazione (prima volta)
router.get('/authorize', requireAuth, (req, res) => {
  const scope = encodeURIComponent('https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Contacts.Read offline_access');
  const state = generateOAuthState(req.profile.id);
  const authUrl = `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/authorize?client_id=${MICROSOFT_CLIENT_ID}&response_type=code&scope=${scope}&redirect_uri=${encodeURIComponent(MICROSOFT_REDIRECT_URI)}&state=${state}&prompt=consent`;
  res.json({ success: true, authUrl });
});

// Callback dopo che l'utente autorizza
router.get('/callback', async (req, res) => {
  const { code, state: nonce, error, error_description } = req.query;

  // Microsoft ha restituito un errore OAuth
  if (error) {
    console.error('Outlook OAuth error:', error, error_description);
    return res.redirect(`/?outlook=error&msg=${encodeURIComponent(error_description || error)}`);
  }

  if (!code || !nonce) {
    return res.redirect('/?outlook=error&msg=Missing+code+or+state');
  }

  // Validate and consume the state nonce — rejects forged/replayed callbacks
  const userId = consumeOAuthState(nonce);
  if (!userId) {
    console.error('Outlook OAuth: invalid or expired state nonce');
    return res.redirect('/?outlook=error&msg=Invalid+or+expired+state');
  }

  try {
    // Scambia il code con access token
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri: MICROSOFT_REDIRECT_URI,
        grant_type: 'authorization_code',
        scope: 'https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Mail.Read offline_access'
      })
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Cifra i token prima di salvarli (AES-256-GCM)
    const { error } = await supabase
      .from('outlook_tokens')
      .upsert({
        user_id: userId,
        access_token: encrypt(access_token),
        refresh_token: encrypt(refresh_token),
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw error;

    // Redirect al frontend con successo
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}?outlook=success`);
  } catch (e) {
    console.error('Errore OAuth Outlook:', e.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}?outlook=error`);
  }
});

// POST sincronizza task esistente con Outlook
router.post('/sync-task', requireAuth, async (req, res) => {
  const { task_id } = req.body;

  try {
    // Prendi il task dal DB
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', task_id)
      .single();

    if (taskError) throw taskError;

    const result = await syncTaskToOutlook(req.profile.id, task);
    res.json({ success: true, ...result });
  } catch (e) {
    console.error('Errore sync task:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PATCH aggiorna task E sincronizza completamento con Outlook
router.patch('/sync-task/:id', requireAuth, async (req, res) => {
  const { completed } = req.body;

  try {
    const result = await updateOutlookEvent(req.profile.id, req.params.id, completed);
    res.json({ success: true, ...result });
  } catch (e) {
    console.error('Errore update sync:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET status connessione Outlook
router.get('/status', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('outlook_tokens')
      .select('user_id')
      .eq('user_id', req.profile.id)
      .single();

    res.json({ 
      connected: !error && !!data,
      message: error ? 'Non connesso' : 'Connesso a Outlook'
    });
  } catch (e) {
    res.json({ connected: false, error: e.message });
  }
});

// GET ultime email dalla inbox Outlook
router.get('/emails', requireAuth, async (req, res) => {
  try {
    const token = await getValidToken(req.profile.id);
    const limit = parseInt(req.query.limit) || 20;

    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=${limit}&$select=id,subject,from,receivedDateTime,bodyPreview,isRead&$orderby=receivedDateTime desc`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const emails = (response.data.value || []).map(e => ({
      id: e.id,
      subject: e.subject,
      from_name: e.from?.emailAddress?.name,
      from_email: e.from?.emailAddress?.address,
      received_at: e.receivedDateTime,
      preview: e.bodyPreview?.slice(0, 200),
      is_read: e.isRead
    }));

    res.json({ emails });
  } catch (e) {
    if (e.message?.includes('Token Outlook non trovato')) {
      return res.json({ emails: [], not_connected: true });
    }
    res.status(500).json({ error: e.message });
  }
});

// POST /api/outlook/process-emails — legge le ultime email e le analizza con Claude
// Crea task/contatti automaticamente
router.post('/process-emails', requireAuth, async (req, res) => {
  try {
    const token = await getValidToken(req.profile.id);

    // Leggi le ultime 10 email non lette
    const response = await axios.get(
      'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=10&$select=id,subject,from,receivedDateTime,body,bodyPreview&$filter=isRead eq false&$orderby=receivedDateTime desc',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const emails = response.data.value || [];
    if (!emails.length) return res.json({ processed: 0, message: 'Nessuna email non letta' });

    const results = [];

    for (const email of emails) {
      const body = email.body?.content?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800);
      const fromEmail = email.from?.emailAddress?.address;
      const fromName = email.from?.emailAddress?.name;

      // Analisi Claude
      const message = await claude.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `Sei un assistente CRM per un'azienda italiana di distribuzione alimentare B2B.
Analizza questa email e restituisci SOLO JSON valido.

DA: ${fromName} <${fromEmail}>
OGGETTO: ${email.subject}
TESTO: ${body}

{
  "relevant": true/false,
  "contact_name": "nome mittente o null",
  "company": "azienda mittente se rilevabile o null",
  "intent": "cosa vuole il mittente in max 10 parole",
  "urgency": "alta | media | bassa",
  "suggested_stage": "new | warm | hot | won | null",
  "tasks": [
    { "text": "azione da fare", "type": "email | chiamata | meeting | task", "when": "oggi | domani | questa settimana", "urgent": true/false }
  ],
  "should_reply": true/false,
  "reply_hint": "hint per risposta o null"
}`
        }]
      });

      const raw = message.content?.[0]?.text || '';
      let analysis;
      try { analysis = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
      catch { continue; }

      if (!analysis.relevant) continue;

      // Crea task se ci sono azioni da fare
      if (analysis.tasks?.length) {
        const supabase = require('../middleware/auth').sb;
        const tasksToInsert = analysis.tasks.map(t => ({
          title: t.text,
          type: t.type || 'email',
          urgent: t.urgent || false,
          priority: analysis.urgency === 'alta' ? 'alta' : 'media',
          assigned_to: req.profile.id,
          created_by: req.profile.id,
          ai_generated: true
        }));
        await supabase.from('tasks').insert(tasksToInsert);
      }

      results.push({
        email_id: email.id,
        subject: email.subject,
        from: fromName,
        analysis
      });
    }

    res.json({ processed: results.length, results });
  } catch (e) {
    if (e.message?.includes('Token Outlook non trovato')) {
      return res.status(400).json({ error: 'Outlook non connesso', not_connected: true });
    }
    res.status(500).json({ error: e.message });
  }
});

// POST /api/outlook/import-contacts — importa contatti dalla rubrica Outlook
router.post('/import-contacts', requireAuth, async (req, res) => {
  try {
    const token = await getValidToken(req.profile.id)

    // Leggi tutti i contatti dalla rubrica (paginazione fino a 500)
    let contacts = []
    let url = 'https://graph.microsoft.com/v1.0/me/contacts?$select=displayName,emailAddresses,mobilePhone,businessPhones,companyName&$top=100'

    while (url) {
      const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
      contacts = contacts.concat(response.data.value || [])
      url = response.data['@odata.nextLink'] || null
      if (contacts.length >= 500) break
    }

    if (!contacts.length) return res.json({ imported: 0, skipped: 0 })

    // Leggi email già presenti nel CRM per evitare duplicati
    const { data: existing } = await supabase
      .from('contacts')
      .select('email')

    const existingEmails = new Set((existing || []).map(c => c.email?.toLowerCase()).filter(Boolean))

    let imported = 0
    let skipped = 0

    for (const c of contacts) {
      const name = c.displayName?.trim()
      if (!name) { skipped++; continue }

      const email = c.emailAddresses?.[0]?.address?.toLowerCase().trim() || null
      const phone = c.mobilePhone || c.businessPhones?.[0] || null
      const company = c.companyName?.trim() || null

      // Skip se email già presente
      if (email && existingEmails.has(email)) { skipped++; continue }

      const { error } = await supabase.from('contacts').insert({
        name,
        email,
        phone,
        company,
        source: 'outlook',
        stage: 'new',
        owner_id: req.profile.id,
        created_by: req.profile.id,
      })

      if (error) { skipped++; continue }
      if (email) existingEmails.add(email)
      imported++
    }

    res.json({ imported, skipped, total: contacts.length })
  } catch (e) {
    if (e.message?.includes('Token Outlook non trovato')) {
      return res.status(400).json({ error: 'Outlook non connesso', not_connected: true })
    }
    res.status(500).json({ error: e.message })
  }
})

// POST /api/outlook/import-contacts-from-emails — estrae mittenti unici dalla inbox,
// Claude classifica chi è contatto di lavoro vs pubblicità, importa solo i business
router.post('/import-contacts-from-emails', requireAuth, async (req, res) => {
  try {
    const token = await getValidToken(req.profile.id)

    // Leggi le ultime 100 email dalla inbox
    const response = await axios.get(
      'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=100&$select=from,receivedDateTime&$orderby=receivedDateTime desc',
      { headers: { Authorization: `Bearer ${token}` } }
    )

    const emails = response.data.value || []
    if (!emails.length) return res.json({ imported: 0, skipped: 0, spam: 0 })

    // Estrai mittenti unici (per email)
    const seenEmails = new Map()
    for (const e of emails) {
      const addr = e.from?.emailAddress?.address?.toLowerCase().trim()
      const name = e.from?.emailAddress?.name?.trim()
      if (addr && name && !seenEmails.has(addr)) {
        seenEmails.set(addr, name)
      }
    }

    if (!seenEmails.size) return res.json({ imported: 0, skipped: 0, spam: 0 })

    // Leggi contatti già presenti nel CRM per evitare duplicati
    const { data: existing } = await supabase.from('contacts').select('email')
    const existingEmails = new Set((existing || []).map(c => c.email?.toLowerCase()).filter(Boolean))

    // Filtra già presenti
    const candidates = [...seenEmails.entries()]
      .filter(([email]) => !existingEmails.has(email))
      .map(([email, name]) => ({ email, name }))

    if (!candidates.length) return res.json({ imported: 0, skipped: seenEmails.size, spam: 0 })

    // Claude classifica i mittenti in batch
    const list = candidates.map((c, i) => `${i + 1}. ${c.name} <${c.email}>`).join('\n')
    const message = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Sei un assistente CRM per un'azienda italiana B2B di distribuzione alimentare.
Classifica questi mittenti email come "business" (contatto di lavoro: fornitori, clienti, partner, colleghi) o "spam" (newsletter, pubblicità, notifiche automatiche, noreply, marketing).

${list}

Rispondi SOLO con un array JSON, un elemento per ogni mittente nello stesso ordine:
[{"i":1,"type":"business","company":"azienda se deducibile o null"},...]`
      }]
    })

    let classifications = []
    try {
      const raw = message.content?.[0]?.text || ''
      classifications = JSON.parse(raw.replace(/```json|```/g, '').trim())
    } catch { classifications = [] }

    let imported = 0, spam = 0, skipped = 0

    for (let idx = 0; idx < candidates.length; idx++) {
      const c = candidates[idx]
      const cl = classifications.find(x => x.i === idx + 1)

      if (!cl || cl.type !== 'business') { spam++; continue }

      const { error } = await supabase.from('contacts').insert({
        name: c.name,
        email: c.email,
        company: cl.company || null,
        source: 'outlook_email',
        stage: 'new',
        owner_id: req.profile.id,
        created_by: req.profile.id,
      })

      if (error) { skipped++; continue }
      imported++
    }

    res.json({ imported, skipped, spam, total: candidates.length })
  } catch (e) {
    if (e.message?.includes('Token Outlook non trovato')) {
      return res.status(400).json({ error: 'Outlook non connesso', not_connected: true })
    }
    res.status(500).json({ error: e.message })
  }
})

// POST /api/outlook/sync-now — trigger manuale sync email → CRM
router.post('/sync-now', requireAuth, async (req, res) => {
  try {
    const { syncEmailsForUser } = require('../services/emailSync');
    const result = await syncEmailsForUser(req.profile.id);
    res.json({ success: true, ...result });
  } catch (e) {
    if (e.message?.includes('Token Outlook non trovato')) {
      return res.status(400).json({ error: 'Outlook non connesso', not_connected: true });
    }
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
