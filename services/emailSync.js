const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { getValidToken } = require('./outlookSync');
const Anthropic = require('@anthropic-ai/sdk');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const STAGE_ORDER = { proposto: 0, campione: 1, offerta: 2, ordine: 3 };

const DEV_STEPS_KEYWORDS = {
  'Ricerca fornitore':     ['fornitore', 'supplier', 'trovato fornitore', 'ricerca fornitore'],
  'Campione ricevuto':     ['campione', 'sample', 'ricevuto campione', 'campione ricevuto', 'assaggiato'],
  'Valutazione qualità':   ['qualità', 'quality', 'valutazione', 'approvato', 'buono', 'ottimo', 'scartato'],
  'Analisi costo':         ['costo', 'prezzo', 'price', 'cost', 'euro', '€', 'quotazione', 'offerta'],
  'Etichetta / Packaging': ['etichetta', 'packaging', 'label', 'confezione', 'grafica'],
  'Approvazione finale':   ['approvato', 'approved', 'confermato', 'ok finale', 'via libera'],
};

async function syncEmailsForUser(userId) {
  // Prendi il token valido — se non connesso, salta
  let token;
  try { token = await getValidToken(userId); }
  catch { return { processed: 0, updated: 0 }; }

  // Leggi last_email_sync dall'outlook_tokens
  const { data: tokenRow } = await supabase
    .from('outlook_tokens')
    .select('last_email_sync')
    .eq('user_id', userId)
    .single();

  const lastSync = tokenRow?.last_email_sync
    ? new Date(tokenRow.last_email_sync)
    : new Date(Date.now() - 24 * 60 * 60 * 1000); // prima volta: ultime 24h

  // Fetch email nuove dalla inbox
  const since = lastSync.toISOString();
  let emails = [];
  try {
    const resp = await axios.get(
      `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages` +
      `?$top=30&$select=id,subject,from,receivedDateTime,body,bodyPreview` +
      `&$filter=receivedDateTime gt ${since}` +
      `&$orderby=receivedDateTime desc`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    emails = resp.data.value || [];
  } catch (e) {
    console.error(`[email-sync] Errore fetch email utente ${userId}:`, e.message);
    return { processed: 0, updated: 0 };
  }

  if (!emails.length) {
    // Aggiorna comunque il timestamp
    await supabase.from('outlook_tokens')
      .update({ last_email_sync: new Date().toISOString() })
      .eq('user_id', userId);
    return { processed: 0, updated: 0 };
  }

  // Carica dati CRM dell'utente
  const [{ data: projects }, { data: contacts }] = await Promise.all([
    supabase.from('projects').select('id, name, stage, dev_steps, notes').in('stage', ['idea', 'sviluppo', 'pronto']),
    supabase.from('contacts').select('id, name, email, stage, notes').eq('owner_id', userId),
  ]);

  // Prepara testo email per Claude
  const emailsText = emails.map(e => {
    const body = e.body?.content
      ?.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 600) || e.bodyPreview || '';
    return `[Da: ${e.from?.emailAddress?.name} <${e.from?.emailAddress?.address}>]\n` +
           `[Oggetto: ${e.subject}]\n${body}`;
  }).join('\n\n---\n\n');

  const projectsList = (projects || [])
    .map(p => `"${p.name}" (${p.stage})`)
    .join(', ') || 'nessuno';

  // Analisi Claude
  let analysis = { project_updates: [], new_ideas: [], contact_updates: [] };
  try {
    const msg = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Sei un assistente CRM per un'azienda italiana B2B di distribuzione alimentare.
Analizza queste email e restituisci aggiornamenti per il CRM. Rispondi SOLO con JSON valido, senza testo aggiuntivo.

PROGETTI GIÀ NEL CRM: ${projectsList}

EMAIL:
${emailsText}

JSON da restituire:
{
  "project_updates": [
    {
      "name": "nome esatto progetto dal CRM (o null se non corrisponde a nessuno)",
      "completed_steps": ["lista step completati tra: Ricerca fornitore, Campione ricevuto, Valutazione qualità, Analisi costo, Etichetta / Packaging, Approvazione finale"],
      "notes_to_add": "testo breve da aggiungere alle note oppure null",
      "pipeline": {
        "contact_email": "email mittente",
        "contact_name": "nome mittente",
        "stage": "proposto|campione|offerta|ordine",
        "notes": "note sulla trattativa oppure null"
      }
    }
  ],
  "new_ideas": [
    {
      "name": "nome prodotto/idea NON presente nel CRM",
      "notes": "descrizione breve",
      "contact_email": "email mittente",
      "market": "Horeca|Retail"
    }
  ],
  "contact_updates": [
    {
      "email": "email contatto",
      "name": "nome contatto",
      "stage_hint": "warm|hot|null",
      "notes_addition": "aggiornamento breve da aggiungere alle note del contatto"
    }
  ]
}

Includi solo elementi con dati reali e rilevanti. Se non c'è nulla di significativo restituisci array vuoti.`
      }]
    });

    const raw = msg.content?.[0]?.text || '';
    analysis = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error(`[email-sync] Errore analisi Claude utente ${userId}:`, e.message);
  }

  let updated = 0;

  // ── Aggiorna progetti esistenti ──────────────────────────────────────────────
  for (const pu of analysis.project_updates || []) {
    if (!pu.name) continue;
    const project = (projects || []).find(p =>
      p.name?.toLowerCase().trim() === pu.name?.toLowerCase().trim()
    );
    if (!project) continue;

    const upd = {};

    // Aggiorna dev_steps se siamo in sviluppo
    if (project.stage === 'sviluppo' && pu.completed_steps?.length && project.dev_steps?.length) {
      const newSteps = project.dev_steps.map(step => {
        if (step.completed) return step;
        const match = pu.completed_steps.some(cs =>
          cs.toLowerCase() === step.title?.toLowerCase()
        );
        return match
          ? { ...step, completed: true, completed_at: new Date().toISOString() }
          : step;
      });
      // Salva solo se qualcosa è cambiato
      const changed = newSteps.some((s, i) => s.completed !== project.dev_steps[i].completed);
      if (changed) upd.dev_steps = newSteps;
    }

    // Aggiungi note
    if (pu.notes_to_add) {
      const ts = new Date().toLocaleDateString('it-IT');
      upd.notes = project.notes
        ? `${project.notes}\n[${ts}] ${pu.notes_to_add}`
        : `[${ts}] ${pu.notes_to_add}`;
    }

    if (Object.keys(upd).length) {
      await supabase.from('projects').update(upd).eq('id', project.id);
      updated++;
    }

    // ── Pipeline ─────────────────────────────────────────────────────────────
    const pl = pu.pipeline;
    if (pl?.stage && pl?.contact_name) {
      const contact = (contacts || []).find(c =>
        c.email?.toLowerCase() === pl.contact_email?.toLowerCase()
      );

      const { data: existing } = await supabase
        .from('project_pipeline')
        .select('id, stage')
        .eq('project_id', project.id)
        .or(`contact_name.ilike.${pl.contact_name},contact_id.eq.${contact?.id || '00000000-0000-0000-0000-000000000000'}`)
        .not('stage', 'in', '("vinto","perso")')
        .maybeSingle();

      if (existing) {
        // Avanza stage solo se più avanti, mai indietro
        if ((STAGE_ORDER[pl.stage] ?? -1) > (STAGE_ORDER[existing.stage] ?? -1)) {
          await supabase.from('project_pipeline')
            .update({ stage: pl.stage, ...(pl.notes ? { notes: pl.notes } : {}) })
            .eq('id', existing.id);
          updated++;
        }
      } else {
        await supabase.from('project_pipeline').insert({
          project_id: project.id,
          contact_id: contact?.id || null,
          contact_name: pl.contact_name,
          stage: pl.stage,
          notes: pl.notes || null,
          owner_id: userId,
          created_by: userId,
        });
        updated++;
      }
    }
  }

  // ── Crea nuove idee ──────────────────────────────────────────────────────────
  for (const idea of analysis.new_ideas || []) {
    if (!idea.name?.trim()) continue;
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .ilike('name', idea.name.trim())
      .maybeSingle();

    if (!existing) {
      await supabase.from('projects').insert({
        name: idea.name.trim(),
        stage: 'idea',
        priority: 'media',
        market: ['Horeca', 'Retail'].includes(idea.market) ? idea.market : 'Retail',
        notes: idea.notes || null,
        owner_id: userId,
        created_by: userId,
      });
      updated++;
      console.log(`[email-sync] Nuova idea creata: "${idea.name}"`);
    }
  }

  // ── Aggiorna contatti ────────────────────────────────────────────────────────
  for (const cu of analysis.contact_updates || []) {
    if (!cu.email) continue;
    const contact = (contacts || []).find(c =>
      c.email?.toLowerCase() === cu.email.toLowerCase()
    );
    if (!contact) continue;

    const upd = {};
    if (cu.notes_addition) {
      const ts = new Date().toLocaleDateString('it-IT');
      upd.notes = contact.notes
        ? `${contact.notes}\n[${ts}] ${cu.notes_addition}`
        : `[${ts}] ${cu.notes_addition}`;
    }
    if (cu.stage_hint && ['warm', 'hot'].includes(cu.stage_hint)) {
      upd.stage = cu.stage_hint;
    }

    if (Object.keys(upd).length) {
      await supabase.from('contacts').update(upd).eq('id', contact.id);
      updated++;
    }
  }

  // Aggiorna timestamp ultima sync
  await supabase.from('outlook_tokens')
    .update({ last_email_sync: new Date().toISOString() })
    .eq('user_id', userId);

  console.log(`[email-sync] Utente ${userId}: ${emails.length} email analizzate, ${updated} aggiornamenti CRM`);
  return { processed: emails.length, updated };
}

async function runEmailSync() {
  const { data: tokens } = await supabase
    .from('outlook_tokens')
    .select('user_id');

  if (!tokens?.length) return;

  for (const { user_id } of tokens) {
    try {
      await syncEmailsForUser(user_id);
    } catch (e) {
      console.error(`[email-sync] Errore utente ${user_id}:`, e.message);
    }
  }
}

module.exports = { runEmailSync, syncEmailsForUser };
