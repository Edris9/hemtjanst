-- Billista för hemtjänst — Supabase schema
-- Kör detta i Supabase SQL Editor (Database > SQL Editor > New query)

-- =========================================================
-- Tabell: bilar
-- =========================================================
create table if not exists bilar (
  regnr             text primary key,
  skapad            timestamptz not null default now(),
  ansvarig_personal text
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
-- Vy: sessioner_med_sluttid
-- Beräknar "slut"-tid per session: nästa förares starttid samma
-- bil/dag, annars kl 22:00 (registreringsfönstret är 07:00–22:00).
-- =========================================================
create or replace view sessioner_med_sluttid as
select
  s.*,
  coalesce(
    lead(s.tid) over (partition by s.regnr, s.datum order by s.tid),
    (s.datum + time '22:00') at time zone 'Europe/Stockholm'
  ) as slut
from sessioner s;

-- =========================================================
-- Tabell: meddelanden
-- Personalen kan rapportera problem/skriva meddelanden.
-- Visas för dev-teamet på /ticket.
-- =========================================================
create table if not exists meddelanden (
  id         uuid primary key default gen_random_uuid(),
  regnr      text references bilar (regnr),
  forare     text not null,
  meddelande text not null,
  skapad     timestamptz not null default now()
);

create index if not exists idx_meddelanden_skapad on meddelanden (skapad desc);

-- =========================================================
-- RLS — appen är intern och autentiserar inte användare,
-- så anon-nyckeln ges full åtkomst till alla tabeller.
-- =========================================================
alter table bilar       enable row level security;
alter table sessioner   enable row level security;
alter table meddelanden enable row level security;

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

drop policy if exists "meddelanden_anon_all" on meddelanden;
create policy "meddelanden_anon_all"
  on meddelanden
  for all
  to anon
  using (true)
  with check (true);

grant usage on schema public to anon;
grant select, insert, update, delete on bilar       to anon;
grant select, insert, update, delete on sessioner   to anon;
grant select, insert, update, delete on meddelanden to anon;
grant select on sessioner_med_sluttid to anon;
