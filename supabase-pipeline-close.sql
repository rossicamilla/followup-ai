-- Aggiunge closed_at alla pipeline per tracciare quando un ordine è stato chiuso
alter table public.project_pipeline
  add column if not exists closed_at timestamptz;
