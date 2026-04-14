const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, sb } = require('../middleware/auth');
const Anthropic = require('@anthropic-ai/sdk');
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.get('/', requireAuth, async (req, res) => {
  try {
    let query = sb
      .from('contacts')
      .select(`
        *,
        owner:profiles!contacts_owner_id_fkey(id, full_name, role),
        tasks(id, title, task_type, due_date, completed, urgent,
          assignee:profiles!tasks_assigned_to_fkey(id, full_name))
      `)
      .order('created_at', { ascending: false });

    const role = req.profile.role;
    if (role === 'agent') {
      query = query.eq('owner_id', req.profile.id);
    } else if (role === 'manager') {
      const { data: agents } = await sb
        .from('profiles')
        .select('id')
        .eq('manager_id', req.profile.id);
      const agentIds = (agents || []).map(a => a.id);
      query = query.in('owner_id', [req.profile.id, ...agentIds]);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Fetch open projects and pipeline per contact (matched by contact_name/client text field)
    const [projectsRes, pipelineRes] = await Promise.all([
      sb.from('projects')
        .select('id, client, stage')
        .in('stage', ['idea', 'sviluppo', 'pronto']),
      sb.from('project_pipeline')
        .select('id, contact_id, contact_name, stage')
        .not('stage', 'eq', 'perso'),
    ]);

    const allProjects = projectsRes.data || [];
    const allPipeline = pipelineRes.data || [];

    // Match projects by client text (case-insensitive)
    const projByName = {};
    allProjects.forEach(p => {
      if (p.client) {
        const key = p.client.toLowerCase();
        projByName[key] = (projByName[key] || 0) + 1;
      }
    });

    // Match pipeline by contact_id (structured) or contact_name (text)
    const pipeByContact = {};
    const pipeByName = {};
    allPipeline.forEach(p => {
      if (p.contact_id) {
        pipeByContact[p.contact_id] = (pipeByContact[p.contact_id] || 0) + 1;
      } else if (p.contact_name) {
        pipeByName[p.contact_name.toLowerCase()] = (pipeByName[p.contact_name.toLowerCase()] || 0) + 1;
      }
    });

    const enriched = (data || []).map(c => ({
      ...c,
      open_projects: projByName[c.name?.toLowerCase()] || 0,
      open_pipeline: (pipeByContact[c.id] || 0) + (pipeByName[c.name?.toLowerCase()] || 0),
    }));

    res.json({ contacts: enriched });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/contacts/import-from-projects — importa i client dai progetti come contatti
router.post('/import-from-projects', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Prendi tutti i client unici dai progetti
    const { data: projects, error: pe } = await sb
      .from('projects')
      .select('client, supplier')
      .not('client', 'is', null);
    if (pe) throw pe;

    // Prendi tutti i contact_name dalla pipeline
    const { data: pipeline } = await sb
      .from('project_pipeline')
      .select('contact_name')
      .not('contact_name', 'is', null);

    // Prendi contatti esistenti
    const { data: existing } = await sb.from('contacts').select('name');
    const existingNames = new Set((existing || []).map(c => c.name?.toLowerCase()));

    const toImport = [];
    const seen = new Set();

    // Da progetti (campo client)
    for (const p of projects || []) {
      const name = p.client?.trim();
      if (name && !existingNames.has(name.toLowerCase()) && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        toImport.push({ name, stage: 'warm', created_by: req.profile.id, owner_id: req.profile.id });
      }
    }

    // Da pipeline (contact_name)
    for (const p of pipeline || []) {
      const name = p.contact_name?.trim();
      if (name && !existingNames.has(name.toLowerCase()) && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        toImport.push({ name, stage: 'warm', created_by: req.profile.id, owner_id: req.profile.id });
      }
    }

    if (!toImport.length) {
      return res.json({ imported: 0, message: 'Nessun nuovo contatto da importare' });
    }

    const { data: inserted, error: ie } = await sb.from('contacts').insert(toImport).select();
    if (ie) throw ie;

    res.json({ imported: inserted.length, contacts: inserted });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { name, company, email, phone, stage, owner_id, notes, source } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obbligatorio' });

  const assignedOwner = req.profile.role === 'agent'
    ? req.profile.id
    : (owner_id || req.profile.id);

  try {
    const { data, error } = await sb.from('contacts').insert({
      name, company, email, phone, source,
      stage: stage || 'new',
      owner_id: assignedOwner,
      created_by: req.profile.id,
      notes
    }).select().single();
    if (error) throw error;

    await sb.from('activity_log').insert({
      contact_id: data.id,
      user_id: req.profile.id,
      action: 'contact_created',
      payload: { name, company }
    });

    res.status(201).json({ contact: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  const allowed = ['name', 'company', 'email', 'phone', 'stage', 'notes', 'owner_id'];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nessun campo da aggiornare' });
  if (updates.owner_id && req.profile.role !== 'admin' && req.profile.role !== 'manager') {
    delete updates.owner_id;
  }
  try {
    const { data, error } = await sb.from('contacts').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ contact: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { error } = await sb.from('contacts').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id/tasks', requireAuth, async (req, res) => {
  try {
    const { data, error } = await sb
      .from('tasks')
      .select('*, assignee:profiles!tasks_assigned_to_fkey(id,full_name)')
      .eq('contact_id', req.params.id)
      .order('due_date', { ascending: true });
    if (error) throw error;
    res.json({ tasks: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/tasks', requireAuth, async (req, res) => {
  const { title, task_type, due_date, urgent, assigned_to, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'Titolo task obbligatorio' });

  const assignee = req.profile.role === 'agent'
    ? req.profile.id
    : (assigned_to || req.profile.id);

  try {
    const { data, error } = await sb.from('tasks').insert({
      contact_id: req.params.id,
      title, task_type, due_date, notes,
      urgent: urgent || false,
      assigned_to: assignee,
      created_by: req.profile.id,
      ai_generated: false
    }).select().single();
    if (error) throw error;
    res.status(201).json({ task: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/tasks/:taskId', requireAuth, async (req, res) => {
  const { taskId } = req.params;
  const updates = {};
  if (req.body.completed !== undefined) {
    updates.completed = req.body.completed;
    updates.completed_at = req.body.completed ? new Date().toISOString() : null;
  }
  if (req.body.title) updates.title = req.body.title;
  if (req.body.due_date) updates.due_date = req.body.due_date;
  if (req.body.assigned_to && req.profile.role !== 'agent') updates.assigned_to = req.body.assigned_to;

  try {
    const { data, error } = await sb.from('tasks').update(updates).eq('id', taskId).select().single();
    if (error) throw error;
    res.json({ task: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/contacts/:id/timeline — tutti gli eventi del contatto in ordine cronologico
router.get('/:id/timeline', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const [contactRes, tasksRes, activityRes] = await Promise.all([
      sb.from('contacts').select('*, owner:profiles!contacts_owner_id_fkey(full_name)').eq('id', id).single(),
      sb.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(full_name), creator:profiles!tasks_created_by_fkey(full_name)')
        .eq('contact_id', id).order('created_at', { ascending: true }),
      sb.from('activity_log').select('*, actor:profiles(full_name)').eq('contact_id', id).order('created_at', { ascending: true })
    ]);

    if (contactRes.error) throw contactRes.error;
    const contact = contactRes.data;
    const tasks = tasksRes.data || [];
    const activity = activityRes.data || [];

    // Costruisce timeline unificata
    const events = [];

    // Creazione contatto
    events.push({
      type: 'created', date: contact.created_at,
      label: 'Contatto creato',
      detail: `Stage iniziale: ${contact.stage}`,
      actor: contact.owner?.full_name || null,
      icon: 'contact'
    });

    // Activity log (cambi stage, ecc.)
    activity.forEach(a => {
      if (a.action === 'contact_created') return; // già mostrato
      events.push({
        type: 'activity', date: a.created_at,
        label: a.action === 'stage_changed' ? `Stage → ${a.payload?.to || ''}` : a.action,
        detail: a.payload ? JSON.stringify(a.payload) : null,
        actor: a.actor?.full_name || null,
        icon: 'activity'
      });
    });

    // Task
    tasks.forEach(t => {
      events.push({
        type: 'task_created', date: t.created_at,
        label: `Task: ${t.title}`,
        detail: [t.type, t.due_date && `scadenza ${new Date(t.due_date + 'T12:00:00').toLocaleDateString('it-IT')}`, t.urgent && '⚡ urgente'].filter(Boolean).join(' · '),
        actor: t.creator?.full_name || null,
        assignee: t.assignee?.full_name || null,
        completed: t.completed,
        completed_at: t.completed_at,
        icon: 'task'
      });
      if (t.completed && t.completed_at) {
        events.push({
          type: 'task_done', date: t.completed_at,
          label: `Task completato: ${t.title}`,
          actor: t.assignee?.full_name || null,
          icon: 'check'
        });
      }
    });

    // Ordina per data
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ timeline: events, contact });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/contacts/:id/summary — riepilogo narrativo Claude
router.get('/:id/summary', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const [contactRes, tasksRes] = await Promise.all([
      sb.from('contacts').select('*, owner:profiles!contacts_owner_id_fkey(full_name)').eq('id', id).single(),
      sb.from('tasks').select('title, type, completed, due_date, urgent, created_at').eq('contact_id', id).order('created_at', { ascending: false }).limit(20)
    ]);

    const contact = contactRes.data;
    const tasks = tasksRes.data || [];

    const prompt = `Sei un assistente CRM italiano. Genera un riepilogo conciso (3-5 frasi) della relazione con questo contatto, in italiano, tono professionale e diretto.

CONTATTO: ${contact.name}${contact.company ? ` — ${contact.company}` : ''}
Stage pipeline: ${contact.stage}
Responsabile: ${contact.owner?.full_name || 'non assegnato'}
Note: ${contact.notes || 'nessuna'}

STORICO TASK (${tasks.length}):
${tasks.map(t => `- [${t.completed ? 'completato' : 'aperto'}] ${t.title}${t.due_date ? ` (scadenza ${t.due_date})` : ''}${t.urgent ? ' ⚡' : ''}`).join('\n') || 'nessun task'}

Rispondi SOLO con il testo del riepilogo, senza titoli o formattazioni markdown.`;

    const message = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    const summary = message.content?.[0]?.text?.trim() || '';
    res.json({ summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/contacts/mine?source=outlook — elimina i propri contatti (opzionalmente filtrati per source)
router.delete('/mine', requireAuth, async (req, res) => {
  const { source } = req.query;
  try {
    let query = sb.from('contacts').delete().eq('owner_id', req.profile.id);
    if (source) query = query.eq('source', source);
    const { error, count } = await query.select('id', { count: 'exact', head: false });
    if (error) throw error;
    res.json({ deleted: count || 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
