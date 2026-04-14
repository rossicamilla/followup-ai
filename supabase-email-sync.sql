-- Migrazione: aggiunge colonna last_email_sync a outlook_tokens
-- Esegui questo nell'editor SQL di Supabase

alter table public.outlook_tokens
  add column if not exists last_email_sync timestamptz default null;
