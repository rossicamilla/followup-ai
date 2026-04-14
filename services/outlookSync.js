const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { encrypt, decrypt, isEncrypted } = require('./tokenCrypto');

// Service key: bypassa RLS per operazioni server-side sui token OAuth
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_TENANT = process.env.MICROSOFT_TENANT || 'common';

async function getValidToken(userId) {
  const { data: tokenData, error } = await supabase
    .from('outlook_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw new Error('Token Outlook non trovato — collega prima il calendario');

  // Decifra i token letti dal DB (gestisce anche token non ancora cifrati per retrocompatibilità)
  const storedRefresh = tokenData.refresh_token;
  const decryptedRefresh = isEncrypted(storedRefresh) ? decrypt(storedRefresh) : storedRefresh;
  const storedAccess = tokenData.access_token;
  const decryptedAccess = isEncrypted(storedAccess) ? decrypt(storedAccess) : storedAccess;

  if (new Date(tokenData.expires_at) < new Date()) {
    const refreshResponse = await axios.post(
      `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        refresh_token: decryptedRefresh,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Mail.Read offline_access'
      })
    );

    const { access_token, refresh_token } = refreshResponse.data;
    // Salva i nuovi token cifrati
    await supabase
      .from('outlook_tokens')
      .update({
        access_token: encrypt(access_token),
        refresh_token: encrypt(refresh_token),
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
      })
      .eq('user_id', userId);

    return access_token;
  }

  return decryptedAccess;
}

async function createOutlookEvent(token, task) {
  const dueDate = new Date(task.due_date);
  const startTime = new Date(dueDate);
  startTime.setHours(10, 0, 0, 0);
  const endTime = new Date(startTime);
  endTime.setHours(11, 0, 0, 0);

  const event = {
    subject: task.title,
    start: { dateTime: startTime.toISOString(), timeZone: 'Europe/Rome' },
    end: { dateTime: endTime.toISOString(), timeZone: 'Europe/Rome' },
    categories: [`followup-ai-${task.type || 'task'}`],
    isReminderOn: true,
    reminderMinutesBeforeStart: 480,
    body: {
      contentType: 'HTML',
      content: `<p><strong>${task.title}</strong></p><p>Tipo: ${task.type || 'task'}</p><p>Priorità: ${task.priority || 'media'}</p>${task.notes ? `<p>Note: ${task.notes}</p>` : ''}`
    }
  };

  const response = await axios.post(
    'https://graph.microsoft.com/v1.0/me/events',
    event,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data.id;
}

async function syncTaskToOutlook(userId, task) {
  if (!task.due_date) return { synced: false, reason: 'Nessuna scadenza' };
  try {
    const token = await getValidToken(userId);
    const outlookEventId = await createOutlookEvent(token, task);
    await supabase.from('task_outlook_sync').insert({
      task_id: task.id,
      outlook_event_id: outlookEventId,
      user_id: userId,
      synced_at: new Date().toISOString()
    });
    return { synced: true, outlookEventId };
  } catch (e) {
    return { synced: false, reason: e.message };
  }
}

async function updateOutlookEvent(userId, taskId, completed) {
  try {
    const { data: sync } = await supabase
      .from('task_outlook_sync')
      .select('*')
      .eq('task_id', taskId)
      .single();

    if (!sync?.outlook_event_id) return { synced: false };

    const token = await getValidToken(userId);
    await axios.patch(
      `https://graph.microsoft.com/v1.0/me/events/${sync.outlook_event_id}`,
      { categories: [completed ? 'followup-ai-completed' : 'followup-ai-active'] },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { synced: true };
  } catch (e) {
    return { synced: false, reason: e.message };
  }
}

module.exports = { getValidToken, createOutlookEvent, syncTaskToOutlook, updateOutlookEvent };
