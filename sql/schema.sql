-- Billista för hemtjänst — Supabase schema
-- Kör detta i Supabase SQL Editor (Database > SQL Editor > New query)

-- =========================================================
-- Tabell: bilar
-- =========================================================
create table if not exists bilar (
  regnr  text primary key,
  skapad timestamptz not null default now()
);

-- =========================================================
-- Tabell: sessioner
-- Enkel logg: varje skanning skapar en ny rad (förare + tid).
-- Ingen separat "lämna in"-åtgärd — nästa skanning av samma bil
-- innebär automatiskt att föregående förares körning är slut.
-- regnr har ingen ON DELETE/UPDATE CASCADE med flit: om en bil
-- har sessioner ska man inte kunna ta bort eller byta regnr på
-- bilen förrän sessionerna är borttagna/omflyttade (se admin-vy).
-- =========================================================
create table if not exists sessioner (
  id     uuid primary key default gen_random_uuid(),
  regnr  text not null references bilar (regnr),
  datum  date not null default current_date,
  forare text not null,
  tid    timestamptz not null default now()
);

create index if not exists idx_sessioner_regnr_datum on sessioner (regnr, datum);
create index if not exists idx_sessioner_datum        on sessioner (datum);

-- =========================================================
-- RLS — appen är intern och autentiserar inte användare,
-- så anon-nyckeln ges full åtkomst till båda tabellerna.
-- =========================================================
alter table bilar     enable row level security;
alter table sessioner enable row level security;

drop policy if exists "bilar_anon_all" on bilar;
create policy "bilar_anon_all"
  on bilar
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "sessioner_anon_all" on sessioner;
create policy "sessioner_anon_all"
  on sessioner
  for all
  to anon
  using (true)
  with check (true);

grant usage on schema public to anon;
grant select, insert, update, delete on bilar     to anon;
grant select, insert, update, delete on sessioner to anon;
