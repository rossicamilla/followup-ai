const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, sb } = require('../middleware/auth');

router.get('/', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    let query = sb.from('profiles').select('*').order('full_name');
    if (req.profile.role === 'manager') {
      query = query.eq('manager_id', req.profile.id);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({ members: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/stats', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    let teamIds = [req.profile.id];
    if (req.profile.role === 'admin') {
      const { data: all } = await sb.from('profiles').select('id');
      teamIds = (all || []).map(p => p.id);
    } else {
      const { data: agents } = await sb.from('profiles').select('id').eq('manager_id', req.profile.id);
      teamIds.push(...(agents || []).map(a => a.id));
    }

    const [contactsRes, tasksRes, profilesRes] = await Promise.all([
      sb.from('contacts').select('owner_id, stage').in('owner_id', teamIds),
      sb.from('tasks').select('assigned_to, completed, urgent, due_date').in('assigned_to', teamIds),
      sb.from('profiles').select('id, full_name, role').in('id', teamIds)
    ]);

    const contacts = contactsRes.data || [];
    const tasks = tasksRes.data || [];
    const profiles = profilesRes.data || [];
    const today = new Date().toISOString().split('T')[0];

    const memberStats = profiles.map(p => {
      const myContacts = contacts.filter(c => c.owner_id === p.id);
      const myTasks = tasks.filter(t => t.assigned_to === p.id);
      return {
        id: p.id,
        full_name: p.full_name,
        role: p.role,
        contacts_total: myContacts.length,
        contacts_hot: myContacts.filter(c => c.stage === 'hot').length,
        contacts_won: myContacts.filter(c => c.stage === 'won').length,
        tasks_open: myTasks.filter(t => !t.completed).length,
        tasks_urgent: myTasks.filter(t => t.urgent && !t.completed).length,
        tasks_overdue: myTasks.filter(t => !t.completed && t.due_date && t.due_date < today).length,
        tasks_done: myTasks.filter(t => t.completed).length,
      };
    });

    res.json({ members: memberStats });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:userId/role', requireAuth, requireRole('admin'), async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'manager', 'agent'].includes(role)) {
    return res.status(400).json({ error: 'Ruolo non valido' });
  }
  try {
    const { data, error } = await sb
      .from('profiles')
      .update({ role })
      .eq('id', req.params.userId)
      .select()
      .single();
    if (error) throw error;
    res.json({ profile: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:userId/manager', requireAuth, requireRole('admin'), async (req, res) => {
  const { manager_id } = req.body;
  try {
    const { data, error } = await sb
      .from('profiles')
      .update({ manager_id: manager_id || null })
      .eq('id', req.params.userId)
      .select()
      .single();
    if (error) throw error;
    res.json({ profile: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
