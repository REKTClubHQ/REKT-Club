-- REKT CLUB whitelist comment proof
-- Run once in Supabase SQL Editor for the preview/production whitelist table.

alter table public.whitelist_entries
  add column if not exists comment_url text;

create unique index if not exists whitelist_entries_comment_url_unique
  on public.whitelist_entries (lower(comment_url))
  where comment_url is not null;
