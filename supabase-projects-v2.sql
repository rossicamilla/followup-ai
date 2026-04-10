-- ============================================================
-- MIGRATION: Projects v2 — origin + dev_steps
-- Esegui nell'SQL Editor di Supabase
-- ============================================================

-- Origine del progetto (solo rilevante per stage = 'idea')
alter table public.projects
  add column if not exists origin text
  check (origin in ('cliente', 'interna'));

-- Step di sviluppo come array JSON
-- Ogni step: { "id": "uuid", "title": "...", "completed": false, "completed_at": null }
alter table public.projects
  add column if not exists dev_steps jsonb default '[]'::jsonb;

-- Migra i progetti in stage 'test' → 'sviluppo' (rimuoviamo test dalla UI)
update public.projects set stage = 'sviluppo' where stage = 'test';
