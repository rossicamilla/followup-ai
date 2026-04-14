-- ============================================================
-- Tabelle per sincronizzazione Microsoft Outlook Calendar
-- Esegui questo in Supabase DOPO supabase-projects-new.sql
-- ============================================================

-- Tabella per salvare i token OAuth di Outlook
create table public.outlook_tokens (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabella per tracciare i collegamenti task <-> Outlook events
create table public.task_outlook_sync (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade,
  outlook_event_id text not null,
  user_id uuid references public.profiles(id) on delete cascade,
  synced_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(task_id, outlook_event_id)
);

-- Abilita RLS
alter table public.outlook_tokens enable row level security;
alter table public.task_outlook_sync enable row level security;

-- Policies per outlook_tokens
create policy "outlook_tokens_select" on public.outlook_tokens for select using (
  user_id = auth.uid()
);

create policy "outlook_tokens_insert" on public.outlook_tokens for insert with check (
  user_id = auth.uid()
);

create policy "outlook_tokens_update" on public.outlook_tokens for update using (
  user_id = auth.uid()
);

create policy "outlook_tokens_delete" on public.outlook_tokens for delete using (
  user_id = auth.uid()
);

-- Policies per task_outlook_sync
create policy "task_outlook_sync_select" on public.task_outlook_sync for select using (
  user_id = auth.uid() or user_id in (select get_my_agents())
);

create policy "task_outlook_sync_insert" on public.task_outlook_sync for insert with check (
  user_id = auth.uid()
);

create policy "task_outlook_sync_update" on public.task_outlook_sync for update using (
  user_id = auth.uid()
);
