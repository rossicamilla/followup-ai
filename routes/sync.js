/**
 * routes/sync.js — Endpoint per sincronizzare progetti da file Excel
 *
 * POST /api/sync/progetti
 *   - Header: Authorization: Bearer <token>  (solo admin)
 *   - Body: multipart/form-data con campo "file" (Excel .xlsx)
 *   - Oppure: Bearer speciale via SYNC_SECRET per chiamate da n8n/cron
 *
 * Risposta: { inserted, updated, skipped, deleted_duplicates, errors[] }
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { requireAuth, requireRole, sb } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Middleware alternativo per chiamate machine-to-machine (n8n, cron)
function requireSyncAuth(req, res, next) {
  const secret = process.env.SYNC_SECRET;
  const authHeader = req.headers.authorization || '';

  // Se c'è SYNC_SECRET configurato e il token corrisponde → ok
  if (secret && authHeader === `Bearer ${secret}`) return next();

  // Altrimenti richiedi auth normale da admin
  requireAuth(req, res, () => requireRole('admin')(req, res, next));
}

// ── Mapping Excel → DB ────────────────────────────────────────────────────────
function mapStage(s) {
  if (!s) return 'idea';
  const v = String(s).toLowerCase().trim();
  if (v.includes('standby') || v.includes('stand by') || v.includes('pausa') || v.includes('sospeso')) return 'standby';
  if (v.includes('pronto') || v.includes('ready')) return 'pronto';
  if (v.includes('sviluppo') || v.includes('development')) return 'sviluppo';
  if (v.includes('test')) return 'test';
  return 'idea';
}

function mapMarket(m) {
  if (!m) return null;
  const v = String(m).toLowerCase().trim();
  if (v.includes('horeca')) return 'Horeca';
  if (v.includes('retail')) return 'Retail';
  if (v.includes('export')) return 'Export';
  if (v.includes('interno')) return 'Interno';
  return null;
}

function mapPriority(p) {
  if (!p) return 'media';
  const v = String(p).toUpperCase().trim();
  if (v === 'ALTA' || v === 'HIGH') return 'alta';
  if (v === 'BASSA' || v === 'LOW') return 'bassa';
  return 'media';
}

// Trova la chiave "Priorità" anche con encoding diverso
function getPriority(row) {
  for (const key of Object.keys(row)) {
    if (key.toLowerCase().startsWith('priorit')) return row[key];
  }
  return null;
}

function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets['Progetti'];
  if (!ws) throw new Error('Sheet "Progetti" non trovato nel file Excel');

  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  return rows
    .filter(r => r['Nome Prodotto']?.toString().trim())
    .map(r => {
      const costRaw = r['Costo Indicativo'];
      const cost = costRaw != null ? parseFloat(costRaw) : null;
      return {
        name: r['Nome Prodotto'].toString().trim(),
        market: mapMarket(r['Mercato / canale']),
        weight_format: r['Peso']?.toString().trim() || null,
        stage: mapStage(r['Stato Avanzamento']),
        priority: mapPriority(getPriority(r)),
        supplier: r['Fornitore']?.toString().trim() || null,
        cost_per_unit: isNaN(cost) ? null : cost,
        country_code: r['Sigla Paese']?.toString().trim() || null,
        country: r['Paese']?.toString().trim() || null,
        client: r['Cliente']?.toString().trim().replace(/\n/g, ' / ') || null,
        notes: r['Note']?.toString().trim() || null,
      };
    });
}

// ── POST /api/sync/progetti ───────────────────────────────────────────────────
router.post('/progetti', requireSyncAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Campo "file" mancante (multipart/form-data)' });
  }

  const stats = { inserted: 0, updated: 0, skipped: 0, deleted_duplicates: 0, errors: [] };

  try {
    // 1. Leggi Excel dal buffer in memoria
    const excelProjects = parseExcel(req.file.buffer);
    console.log(`📂  Sync: ${excelProjects.length} progetti dall'Excel`);

    // 2. Recupera progetti dal DB
    const { data: dbProjects, error: dbErr } = await sb
      .from('projects')
      .select('id, name, market, stage, priority, client, notes, weight_format, supplier, cost_per_unit, country_code, country, created_at')
      .order('created_at', { ascending: true });

    if (dbErr) throw new Error(dbErr.message);

    // 3. Rimuovi duplicati dal DB (tieni il più vecchio)
    const seen = new Map();
    const toDelete = [];
    for (const p of dbProjects) {
      const key = p.name.trim().toLowerCase();
      if (seen.has(key)) {
        toDelete.push(p.id);
      } else {
        seen.set(key, p);
      }
    }
    if (toDelete.length > 0) {
      await sb.from('projects').delete().in('id', toDelete);
      stats.deleted_duplicates = toDelete.length;
      console.log(`🧹  Rimossi ${toDelete.length} duplicati`);
    }

    // 4. Mappa DB per nome (dopo dedup)
    const dbMap = new Map();
    for (const p of dbProjects) {
      if (!toDelete.includes(p.id)) {
        dbMap.set(p.name.trim().toLowerCase(), p);
      }
    }

    // 5. Recupera owner_id admin
    const { data: admin } = await sb
      .from('profiles').select('id').eq('role', 'admin').single();
    const ownerId = admin?.id;

    // 6. Confronta e sincronizza
    for (const ep of excelProjects) {
      const key = ep.name.toLowerCase();
      const existing = dbMap.get(key);

      if (!existing) {
        // Inserisci nuovo
        const { error } = await sb.from('projects').insert({
          ...ep,
          owner_id: ownerId,
          created_by: ownerId,
        });
        if (error) stats.errors.push(`INSERT ${ep.name}: ${error.message}`);
        else stats.inserted++;
      } else {
        // Controlla se ci sono differenze
        const changed =
          ep.market !== existing.market ||
          ep.stage !== existing.stage ||
          ep.priority !== existing.priority ||
          ep.client !== existing.client ||
          ep.weight_format !== existing.weight_format ||
          ep.supplier !== existing.supplier ||
          (ep.cost_per_unit ?? null) !== (existing.cost_per_unit ?? null) ||
          ep.country_code !== existing.country_code ||
          ep.country !== existing.country ||
          ep.notes !== existing.notes;

        if (changed) {
          const { error } = await sb.from('projects')
            .update({
              market: ep.market, stage: ep.stage, priority: ep.priority,
              client: ep.client, weight_format: ep.weight_format, notes: ep.notes,
              supplier: ep.supplier, cost_per_unit: ep.cost_per_unit,
              country_code: ep.country_code, country: ep.country,
            })
            .eq('id', existing.id);
          if (error) stats.errors.push(`UPDATE ${ep.name}: ${error.message}`);
          else stats.updated++;
        } else {
          stats.skipped++;
        }
      }
    }

    console.log(`✅  Sync completato: +${stats.inserted} inseriti, ~${stats.updated} aggiornati, =${stats.skipped} invariati`);
    res.json({ success: true, ...stats });

  } catch (e) {
    console.error('Errore sync progetti:', e.message);
    res.status(500).json({ error: e.message, ...stats });
  }
});

// ── POST /api/sync/dedup — rimuovi duplicati senza file Excel ────────────────
router.post('/dedup', requireSyncAuth, async (req, res) => {
  try {
    const { data, error } = await sb
      .from('projects')
      .select('id, name, created_at')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    const seen = new Map();
    const toDelete = [];
    for (const p of data) {
      const key = p.name.trim().toLowerCase();
      if (seen.has(key)) toDelete.push(p.id);
      else seen.set(key, p.id);
    }

    if (toDelete.length > 0) {
      const { error: delErr } = await sb.from('projects').delete().in('id', toDelete);
      if (delErr) throw new Error(delErr.message);
    }

    res.json({ success: true, deleted: toDelete.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
