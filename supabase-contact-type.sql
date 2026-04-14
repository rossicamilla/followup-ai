-- Migrazione: aggiungi campo tipo (cliente/fornitore/agente) ai contatti
alter table public.contacts
  add column if not exists contact_type text default null;

-- Aggiorna il constraint per includere 'agente'
alter table public.contacts drop constraint if exists contacts_contact_type_check;
alter table public.contacts add constraint contacts_contact_type_check
  check (contact_type in ('cliente', 'fornitore', 'agente'));
