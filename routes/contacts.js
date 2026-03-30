const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, sb } = require('../middleware/auth');

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
    res.json({ contacts: data });
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

module.exports = router;
