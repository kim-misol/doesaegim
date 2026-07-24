-- 되새김 · Supabase schema (PLAN-0004)
-- Run once in Supabase Studio → SQL Editor, or `supabase db push`.
--
-- Design notes:
--  * `due` / `created_at` / `updated_at` are epoch-ms bigints so the client's
--    SRS math (all in ms) stays identical and there are no timezone bugs.
--  * Row Level Security ensures each user only ever sees their own cards.

create table if not exists public.words (
  id          text primary key,                       -- client-generated id
  user_id     uuid not null references auth.users (id) on delete cascade,
  src_lang    text not null check (src_lang in ('ko','en','es','it','de')),
  tgt_lang    text not null check (tgt_lang in ('ko','en','es','it','de')),
  word        text not null check (char_length(word)    between 1 and 200),
  meaning     text not null check (char_length(meaning) between 1 and 500),
  box         int  not null default 0 check (box between 0 and 5),
  due         bigint not null,
  created_at  bigint not null,
  updated_at  bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- "cards due today for this user" is the hottest query.
create index if not exists words_user_due_idx on public.words (user_id, due);
create index if not exists words_user_src_idx on public.words (user_id, src_lang);

-- keep updated_at fresh on every write
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := (extract(epoch from now()) * 1000)::bigint;
  return new;
end $$;

drop trigger if exists words_touch_updated_at on public.words;
create trigger words_touch_updated_at
  before update on public.words
  for each row execute function public.touch_updated_at();

-- ---- Row Level Security -------------------------------------------------
alter table public.words enable row level security;

drop policy if exists "own rows – select" on public.words;
create policy "own rows – select" on public.words
  for select using (auth.uid() = user_id);

drop policy if exists "own rows – insert" on public.words;
create policy "own rows – insert" on public.words
  for insert with check (auth.uid() = user_id);

drop policy if exists "own rows – update" on public.words;
create policy "own rows – update" on public.words
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows – delete" on public.words;
create policy "own rows – delete" on public.words
  for delete using (auth.uid() = user_id);
