-- NAYL pilot persistence on Supabase/Postgres
-- Run this once in the Supabase SQL Editor for the project used by NAYL.
--
-- The application accesses this table only from the Node.js backend, using
-- SUPABASE_SECRET_KEY (preferred) or a legacy SUPABASE_SERVICE_ROLE_KEY.
-- Never expose either server-side key to browser code or commit it to GitHub.

create table if not exists public.nayl_state (
  state_key text primary key,
  data jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.nayl_state enable row level security;

-- Browser roles receive no access. The server's secret/service-role key has
-- the service_role database role and can operate through PostgREST despite RLS.
revoke all on table public.nayl_state from anon, authenticated;
grant select, insert, update on table public.nayl_state to service_role;

-- NAYL creates the state_key='primary' row automatically on first successful boot.
