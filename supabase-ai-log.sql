-- Migrazione: tabella log azioni AI per notifiche di revisione
-- Esegui questo nell'editor SQL di Supabase

create table if not exists public.ai_sync_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  entity_name text,
  details jsonb default '{}',
  reviewed boolean default false,
  created_at timestamptz default now()
);

create index if not exists ai_sync_log_user_reviewed
  on public.ai_sync_log(user_id, reviewed);

-- RLS
alter table public.ai_sync_log enable row level security;

create policy "ai_sync_log_own" on public.ai_sync_log
  using (user_id = auth.uid());
