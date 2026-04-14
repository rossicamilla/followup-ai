const express = require('express');
const router = express.Router();
const { requireAuth, sb } = require('../middleware/auth');

// GET /api/ai-log — items non revisionati dell'utente corrente
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await sb
      .from('ai_sync_log')
      .select('*')
      .eq('user_id', req.profile.id)
      .eq('reviewed', false)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ items: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/ai-log/count — conteggio non revisionati
router.get('/count', requireAuth, async (req, res) => {
  try {
    const { count, error } = await sb
      .from('ai_sync_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.profile.id)
      .eq('reviewed', false);
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (e) {
    res.json({ count: 0 });
  }
});

// POST /api/ai-log/:id/review — segna singolo come visto
router.post('/:id/review', requireAuth, async (req, res) => {
  try {
    const { error } = await sb
      .from('ai_sync_log')
      .update({ reviewed: true })
      .eq('id', req.params.id)
      .eq('user_id', req.profile.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai-log/review-all — segna tutti come visti
router.post('/review-all', requireAuth, async (req, res) => {
  try {
    const { error } = await sb
      .from('ai_sync_log')
      .update({ reviewed: true })
      .eq('user_id', req.profile.id)
      .eq('reviewed', false);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
