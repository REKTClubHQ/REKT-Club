-- REKT CLUB WL curation status
-- Run once in Supabase SQL Editor.

alter table public.whitelist_entries
  add column if not exists status text not null default 'pending';

alter table public.whitelist_entries
  drop constraint if exists whitelist_entries_status_check;

alter table public.whitelist_entries
  add constraint whitelist_entries_status_check
  check (status in ('pending','gtd','fcfs','not_selected'));

create index if not exists whitelist_entries_status_idx
  on public.whitelist_entries (status);
