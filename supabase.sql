-- Billio: run this once in Supabase, SQL Editor, then Run.

create table if not exists public.billio_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  onboarded boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.billio_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  cur text not null,
  last4 text not null default '',
  primary key (user_id, id)
);

create table if not exists public.billio_subs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  amount numeric not null,
  cur text not null,
  cycle text not null,
  anchor text not null,
  card text not null default '',
  domain text,
  primary key (user_id, id)
);

alter table public.billio_profile enable row level security;
alter table public.billio_cards enable row level security;
alter table public.billio_subs enable row level security;

drop policy if exists "own profile" on public.billio_profile;
drop policy if exists "own cards" on public.billio_cards;
drop policy if exists "own subs" on public.billio_subs;

create policy "own profile" on public.billio_profile for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own cards" on public.billio_cards for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own subs" on public.billio_subs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
