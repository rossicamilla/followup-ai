const express = require('express');
const router = express.Router();
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/api/outlook/callback';
const MICROSOFT_TENANT = process.env.MICROSOFT_TENANT || 'common';

// Genera il link per autorizzazione (prima volta)
router.get('/authorize', requireAuth, (req, res) => {
  const authUrl = `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/authorize?
    client_id=${MICROSOFT_CLIENT_ID}
    &response_type=code
    &scope=https://graph.microsoft.com/Calendars.ReadWrite offline_access
    &redirect_uri=${encodeURIComponent(MICROSOFT_REDIRECT_URI)}
    &state=${req.profile.id}
    &prompt=consent`.replace(/\n/g, '').replace(/\s+/g, '');
  
  res.json({ success: true, authUrl });
});

// Callback dopo che l'utente autorizza
router.get('/callback', async (req, res) => {
  const { code, state: userId } = req.query;
  
  if (!code || !userId) {
    return res.status(400).json({ error: 'Missing code or state' });
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
        scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access'
      })
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Salva i token in Supabase
    const { error } = await supabase
      .from('outlook_tokens')
      .upsert({
        user_id: userId,
        access_token,
        refresh_token,
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

// Funzione per refreshare token se scaduto
async function getValidToken(userId) {
  const { data: tokenData, error: getError } = await supabase
    .from('outlook_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (getError) throw new Error('Token non trovato');

  // Se il token è scaduto, refresharlo
  if (new Date(tokenData.expires_at) < new Date()) {
    try {
      const refreshResponse = await axios.post(
        `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: MICROSOFT_CLIENT_ID,
          client_secret: MICROSOFT_CLIENT_SECRET,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
          scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access'
        })
      );

      const { access_token, refresh_token } = refreshResponse.data;
      
      await supabase
        .from('outlook_tokens')
        .update({
          access_token,
          refresh_token,
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
        })
        .eq('user_id', userId);

      return access_token;
    } catch (e) {
      throw new Error('Errore refresh token');
    }
  }

  return tokenData.access_token;
}

// Crea un evento in Outlook Calendar
async function createOutlookEvent(token, task) {
  const dueDate = new Date(task.due_date);
  const startTime = new Date(dueDate);
  startTime.setHours(10, 0, 0); // Evento alle 10:00
  const endTime = new Date(startTime);
  endTime.setHours(11, 0, 0); // Durata 1 ora

  const event = {
    subject: task.title,
    bodyPreview: task.notes || `Task: ${task.title}`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'Europe/Rome'
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Europe/Rome'
    },
    categories: [`followup-ai-${task.type}`],
    isReminderOn: true,
    reminderMinutesBeforeStart: 60 * 8, // 8 ore prima (mattino stesso)
    body: {
      contentType: 'HTML',
      content: `<p><strong>${task.title}</strong></p><p>Tipo: ${task.type}</p><p>Priorità: ${task.priority}</p>${task.notes ? `<p>Note: ${task.notes}</p>` : ''}`
    },
    extensions: [
      {
        '@odata.type': '#microsoft.graph.openTypeExtension',
        extensionName: 'com.followupai.task',
        taskId: task.id,
        taskType: task.type,
        taskPriority: task.priority
      }
    ]
  };

  const response = await axios.post(
    'https://graph.microsoft.com/v1.0/me/events',
    event,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  return response.data.id; // Ritorna l'ID dell'evento Outlook
}

// POST crea task E sincronizza con Outlook
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

    // Se l'utente ha Outlook connesso, crea l'evento
    try {
      const token = await getValidToken(req.profile.id);
      const outlookEventId = await createOutlookEvent(token, task);

      // Salva il collegamento task <-> outlook event nel DB
      await supabase
        .from('task_outlook_sync')
        .insert({
          task_id,
          outlook_event_id: outlookEventId,
          user_id: req.profile.id,
          synced_at: new Date().toISOString()
        });

      res.json({ success: true, synced: true, outlookEventId });
    } catch (e) {
      // Outlook non è connesso, ma il task è stato comunque creato
      res.json({ success: true, synced: false, message: 'Task creato, ma Outlook non è connesso' });
    }
  } catch (e) {
    console.error('Errore sync task:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PATCH aggiorna task E sincronizza completamento con Outlook
router.patch('/sync-task/:id', requireAuth, async (req, res) => {
  const { completed } = req.body;

  try {
    // Prendi il collegamento task-outlook
    const { data: sync, error: syncError } = await supabase
      .from('task_outlook_sync')
      .select('*')
      .eq('task_id', req.params.id)
      .single();

    if (!syncError && sync && sync.outlook_event_id) {
      const token = await getValidToken(req.profile.id);

      // Aggiorna l'evento in Outlook
      const updateData = completed ? 
        { categories: ['followup-ai-completed'] } :
        { categories: ['followup-ai-active'] };

      await axios.patch(
        `https://graph.microsoft.com/v1.0/me/events/${sync.outlook_event_id}`,
        updateData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
    }

    res.json({ success: true, synced: !!sync });
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

module.exports = router;
