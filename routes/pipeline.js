const express = require('express');
const router = express.Router();
const { requireAuth, sb } = require('../middleware/auth');

const SELECT_FIELDS = `
  id, stage, notes, value_estimate, contact_name, created_at, updated_at, closed_at,
  project:projects(id, name, market, weight_format),
  contact:contacts(id, name, company),
  owner:profiles!owner_id(id, full_name),
  assigned:profiles!assigned_to(id, full_name)
`;

// GET — tutte le opportunità (escluse 'vinto' e 'perso' per il kanban; ?storico=true per lo storico)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { project_id, storico } = req.query;
    const role = req.profile.role;

    let query = sb
      .from('project_pipeline')
      .select(SELECT_FIELDS)
      .order('updated_at', { ascending: false });

    if (storico === 'true') {
      query = query.eq('stage', 'vinto');
    } else {
      query = query.not('stage', 'in', '("vinto","perso")');
    }

    if (project_id) query = query.eq('project_id', project_id);

    if (role === 'agent') {
      query = query.eq('assigned_to', req.profile.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, pipeline: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /stats — statistiche pipeline (vinto + attivo)
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const role = req.profile.role;

    let query = sb
      .from('project_pipeline')
      .select(SELECT_FIELDS);

    if (role === 'agent') query = query.eq('assigned_to', req.profile.id);

    const { data, error } = await query;
    if (error) throw error;

    const all = data || [];
    const vinti = all.filter(o => o.stage === 'vinto');
    const attivi = all.filter(o => !['vinto', 'perso'].includes(o.stage));

    // Valore totale vinto
    const totaleVinto = vinti.reduce((s, o) => s + (Number(o.value_estimate) || 0), 0);

    // Valore pipeline attiva
    const totaleAttivo = attivi.reduce((s, o) => s + (Number(o.value_estimate) || 0), 0);

    // Per prodotto (vinti)
    const perProdotto = {};
    vinti.forEach(o => {
      const k = o.project?.name || '—';
      if (!perProdotto[k]) perProdotto[k] = { name: k, market: o.project?.market, count: 0, value: 0 };
      perProdotto[k].count++;
      perProdotto[k].value += Number(o.value_estimate) || 0;
    });

    // Per agente (vinti)
    const perAgente = {};
    vinti.forEach(o => {
      const k = o.assigned?.full_name || o.owner?.full_name || 'N/D';
      if (!perAgente[k]) perAgente[k] = { name: k, count: 0, value: 0 };
      perAgente[k].count++;
      perAgente[k].value += Number(o.value_estimate) || 0;
    });

    // Per mercato (vinti)
    const perMercato = {};
    vinti.forEach(o => {
      const k = o.project?.market || 'N/D';
      if (!perMercato[k]) perMercato[k] = { name: k, count: 0, value: 0 };
      perMercato[k].count++;
      perMercato[k].value += Number(o.value_estimate) || 0;
    });

    // Conversione per fase (quanti attivi per stage)
    const perFase = {};
    attivi.forEach(o => {
      perFase[o.stage] = (perFase[o.stage] || 0) + 1;
    });

    res.json({
      totaleVinto,
      totaleAttivo,
      ordiniVinti: vinti.length,
      ordiniAttivi: attivi.length,
      perProdotto: Object.values(perProdotto).sort((a, b) => b.value - a.value),
      perAgente:   Object.values(perAgente).sort((a, b) => b.value - a.value),
      perMercato:  Object.values(perMercato).sort((a, b) => b.value - a.value),
      perFase,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /:id/close — chiude un ordine come "vinto"
router.post('/:id/close', requireAuth, async (req, res) => {
  const role = req.profile.role;
  if (!['admin', 'manager', 'agent'].includes(role)) {
    return res.status(403).json({ error: 'Non autorizzato' });
  }
  try {
    // Chiudi opportunità
    const { data: opp, error: oe } = await sb
      .from('project_pipeline')
      .update({ stage: 'vinto', closed_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select(SELECT_FIELDS)
      .single();
    if (oe) throw oe;

    // Aggiorna stage contatto a 'won' se collegato
    if (opp.contact?.id) {
      await sb.from('contacts').update({ stage: 'won' }).eq('id', opp.contact.id);
    }

    // Crea task di follow-up
    const taskTemplates = [
      { title: `Conferma ordine al fornitore — ${opp.project?.name || ''}`, task_type: 'task', urgent: true },
      { title: `Invia documentazione al cliente — ${opp.contact?.name || opp.contact_name || ''}`, task_type: 'email', urgent: false },
      { title: `Verifica consegna — ${opp.project?.name || ''}`, task_type: 'task', urgent: false },
    ];

    await sb.from('tasks').insert(taskTemplates.map(t => ({
      ...t,
      assigned_to: opp.assigned?.id || req.profile.id,
      created_by: req.profile.id,
      ai_generated: false,
    })));

    res.json({ success: true, opportunity: opp });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST — nuova opportunità (solo admin e manager)
router.post('/', requireAuth, async (req, res) => {
  const role = req.profile.role;
  if (!['admin', 'manager'].includes(role)) {
    return res.status(403).json({ error: 'Non autorizzato' });
  }

  const { project_id, contact_id, contact_name, stage, notes, value_estimate, assigned_to } = req.body;
  if (!project_id) return res.status(400).json({ error: 'project_id richiesto' });

  try {
    const { data, error } = await sb
      .from('project_pipeline')
      .insert({
        project_id,
        contact_id: contact_id || null,
        contact_name: contact_name || null,
        stage: stage || 'proposto',
        notes: notes || null,
        value_estimate: value_estimate || null,
        assigned_to: assigned_to || null,
        owner_id: req.profile.id,
        created_by: req.profile.id,
      })
      .select(SELECT_FIELDS)
      .single();

    if (error) throw error;
    res.json({ success: true, opportunity: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH — aggiorna opportunità
router.patch('/:id', requireAuth, async (req, res) => {
  const role = req.profile.role;
  const { stage, notes, value_estimate, contact_id, contact_name, assigned_to } = req.body;

  try {
    // Agente può aggiornare solo stage e notes (non riassegnare, non cambiare cliente/valore)
    let updateData = {};
    if (role === 'agent') {
      if (stage) updateData.stage = stage;
      if (notes !== undefined) updateData.notes = notes;
    } else {
      // admin e manager aggiornano tutto
      if (stage) updateData.stage = stage;
      if (notes !== undefined) updateData.notes = notes;
      if (value_estimate !== undefined) updateData.value_estimate = value_estimate;
      if (contact_id !== undefined) updateData.contact_id = contact_id;
      if (contact_name !== undefined) updateData.contact_name = contact_name;
      if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    }

    const { data, error } = await sb
      .from('project_pipeline')
      .update(updateData)
      .eq('id', req.params.id)
      .select(SELECT_FIELDS)
      .single();

    if (error) throw error;
    res.json({ success: true, opportunity: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE — solo admin
router.delete('/:id', requireAuth, async (req, res) => {
  if (req.profile.role !== 'admin') {
    return res.status(403).json({ error: 'Solo admin può eliminare' });
  }
  try {
    const { error } = await sb.from('project_pipeline').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
