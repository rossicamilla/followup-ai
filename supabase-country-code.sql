-- Migrazione: aggiungi paese di destinazione ai progetti
alter table public.projects
  add column if not exists country_code text,
  add column if not exists country text;
