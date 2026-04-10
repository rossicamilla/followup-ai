const express = require('express');
const router = express.Router();
const { requireAuth, sb: supabase } = require('../middleware/auth');
const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: () => require('crypto').randomUUID() } : require('crypto');

const DEFAULT_DEV_STEPS = [
  { id: '1', title: 'Ricerca fornitore',    completed: false, completed_at: null },
  { id: '2', title: 'Campione ricevuto',    completed: false, completed_at: null },
  { id: '3', title: 'Valutazione qualità',  completed: false, completed_at: null },
  { id: '4', title: 'Analisi costo',        completed: false, completed_at: null },
  { id: '5', title: 'Etichetta / Packaging',completed: false, completed_at: null },
  { id: '6', title: 'Approvazione finale',  completed: false, completed_at: null },
];

// GET tutti i progetti
router.get('/', requireAuth, async (req, res) => {
  try {
    const { stage, priority, market } = req.query;

    let query = supabase
      .from('projects')
      .select(`
        id, name, description, market, stage, priority, origin,
        supplier, weight_format, cost_per_unit, photo_url,
        country_code, country, client, notes, dev_steps,
        owner:profiles!owner_id(full_name, id),
        created_at, updated_at
      `);

    if (stage) query = query.eq('stage', stage);
    if (priority) query = query.eq('priority', priority);
    if (market) query = query.eq('market', market);

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, projects: data || [] });
  } catch (e) {
    console.error('Errore GET projects:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET progetto singolo
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json({ success: true, project: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST nuovo progetto
router.post('/', requireAuth, async (req, res) => {
  const { name, description, market, stage, priority, origin,
          supplier, weight_format, cost_per_unit, photo_url,
          notes, country_code, country, client } = req.body;

  if (!name) return res.status(400).json({ error: 'Nome progetto richiesto' });

  const finalStage = stage || 'idea';

  try {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description: description || '',
        market: market || 'Retail',
        stage: finalStage,
        priority: finalStage === 'idea' ? (priority || 'media') : null,
        origin: origin || null,
        supplier: supplier || null,
        weight_format: weight_format || null,
        cost_per_unit: cost_per_unit || null,
        photo_url: photo_url || null,
        notes: notes || null,
        country_code: country_code || null,
        country: country || null,
        client: client || null,
        dev_steps: finalStage === 'sviluppo' ? DEFAULT_DEV_STEPS : [],
        owner_id: req.profile.id,
        created_by: req.profile.id
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, project: data });
  } catch (e) {
    console.error('Errore POST project:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PATCH aggiorna progetto (dati generali)
router.patch('/:id', requireAuth, async (req, res) => {
  const { name, description, market, stage, priority, origin,
          supplier, weight_format, cost_per_unit, photo_url,
          notes, country_code, country, client, dev_steps } = req.body;

  try {
    // Se cambia stage a sviluppo e non ha dev_steps → inizializza
    let stepsUpdate = {};
    if (stage === 'sviluppo' && dev_steps === undefined) {
      const { data: current } = await supabase
        .from('projects').select('dev_steps, stage').eq('id', req.params.id).single();
      if (current && current.stage !== 'sviluppo' && (!current.dev_steps || current.dev_steps.length === 0)) {
        stepsUpdate = { dev_steps: DEFAULT_DEV_STEPS };
      }
    }

    const { data, error } = await supabase
      .from('projects')
      .update({
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(market && { market }),
        ...(stage && { stage }),
        // priority solo per idea
        ...(stage === 'idea' && priority ? { priority } : stage && stage !== 'idea' ? { priority: null } : priority ? { priority } : {}),
        ...(origin !== undefined && { origin }),
        ...(supplier !== undefined && { supplier }),
        ...(weight_format !== undefined && { weight_format }),
        ...(cost_per_unit !== undefined && { cost_per_unit }),
        ...(photo_url !== undefined && { photo_url }),
        ...(notes !== undefined && { notes }),
        ...(country_code !== undefined && { country_code }),
        ...(country !== undefined && { country }),
        ...(client !== undefined && { client }),
        ...(dev_steps !== undefined && { dev_steps }),
        ...stepsUpdate,
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, project: data });
  } catch (e) {
    console.error('Errore PATCH project:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PATCH aggiorna solo dev_steps (ottimizzato per checklist frequente)
router.patch('/:id/steps', requireAuth, async (req, res) => {
  const { dev_steps } = req.body;
  if (!dev_steps) return res.status(400).json({ error: 'dev_steps richiesto' });

  try {
    const { data, error } = await supabase
      .from('projects')
      .update({ dev_steps })
      .eq('id', req.params.id)
      .select('id, dev_steps')
      .single();

    if (error) throw error;
    res.json({ success: true, dev_steps: data.dev_steps });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE progetto
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('projects').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
