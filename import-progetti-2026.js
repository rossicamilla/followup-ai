/**
 * Import one-shot: legge __PROGETTI_2026.xlsx e inserisce i progetti in Supabase.
 *
 * Uso (dalla cartella followup-ai):
 *   node -r dotenv/config import-progetti-2026.js dotenv_config_path=.env.import
 *
 * Oppure con variabili inline:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node import-progetti-2026.js
 */

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EXCEL_PATH = process.env.EXCEL_PATH || path.join(__dirname, '__PROGETTI_2026.xlsx');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Variabili mancanti: SUPABASE_URL e SUPABASE_SERVICE_KEY sono obbligatorie.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function mapStage(s) {
  if (!s) return 'idea';
  const v = String(s).toLowerCase().trim();
  if (v === 'in sviluppo' || v === 'sviluppo') return 'sviluppo';
  if (v === 'pronto' || v === 'done' || v === 'completato') return 'pronto';
  if (v === 'test') return 'test';
  return 'idea';
}

function mapPriority(p) {
  if (!p) return 'media';
  const v = String(p).toUpperCase().trim();
  if (v === 'ALTA' || v === 'HIGH') return 'alta';
  if (v === 'BASSA' || v === 'LOW') return 'bassa';
  return 'media';
}

function mapMarket(m) {
  if (!m) return null;
  const v = String(m).toLowerCase().trim();
  if (v.includes('horeca') && v.includes('retail')) return 'Horeca';
  if (v.includes('horeca')) return 'Horeca';
  if (v.includes('retail')) return 'Retail';
  if (v.includes('export')) return 'Export';
  if (v.includes('interno')) return 'Interno';
  return null;
}

// Trova la chiave "Priorità" anche con encoding diverso
function getPriority(row) {
  for (const key of Object.keys(row)) {
    if (key.toLowerCase().startsWith('priorit')) return row[key];
  }
  return null;
}

async function run() {
  const { data: admin, error: adminErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .single();

  if (adminErr || !admin) {
    console.error('Admin non trovato nel DB:', adminErr?.message);
    process.exit(1);
  }
  const ownerId = admin.id;
  console.log(`Admin trovato: ${ownerId}`);

  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets['Progetti'];
  if (!ws) {
    console.error('Sheet "Progetti" non trovato nel file Excel.');
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  console.log(`Righe trovate nell'Excel: ${rows.length}`);

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = row['Nome Prodotto']?.toString().trim();
    if (!name) { skipped++; continue; }

    const clientRaw = row['Cliente']?.toString().trim().replace(/\n/g, ' / ') || null;

    const costRaw = row['Costo Indicativo'];
    const cost = costRaw != null ? parseFloat(costRaw) : null;

    const project = {
      name,
      market: mapMarket(row['Mercato / canale']),
      stage: mapStage(row['Stato Avanzamento']),
      priority: mapPriority(getPriority(row)),
      supplier: row['Fornitore']?.toString().trim() || null,
      weight_format: row['Peso']?.toString().trim() || null,
      cost_per_unit: isNaN(cost) ? null : cost,
      country_code: row['Sigla Paese']?.toString().trim() || null,
      country: row['Paese']?.toString().trim() || null,
      client: clientRaw,
      notes: row['Note']?.toString().trim() || null,
      owner_id: ownerId,
      created_by: ownerId,
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select('id')
      .single();

    if (error) {
      console.error(`Errore inserimento "${name}":`, error.message);
      skipped++;
      continue;
    }

    await supabase.from('project_members').insert({
      project_id: data.id,
      user_id: ownerId,
      role: 'owner'
    });

    console.log(`Inserito: "${name}" (${project.stage} / ${project.priority})`);
    inserted++;
  }

  console.log(`\nRiepilogo: ${inserted} inseriti, ${skipped} saltati.`);
}

run().catch(e => {
  console.error('Errore fatale:', e.message);
  process.exit(1);
});
