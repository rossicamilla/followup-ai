-- Migrazione: aggiungi stage 'standby' ai progetti
alter table public.projects drop constraint if exists projects_stage_check;
alter table public.projects add constraint projects_stage_check
  check (stage in ('idea', 'sviluppo', 'test', 'pronto', 'standby'));
