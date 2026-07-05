-- Migrering: förenklar sessioner-tabellen till en enkel logg
-- (förare + tid), tar bort dag/kväll, inlämning, använda timmar
-- och status. Kör i Supabase SQL Editor.
--
-- OBS: detta tar bort all befintlig körhistorik i sessioner-
-- tabellen. Bilarna i "bilar"-tabellen påverkas inte.

drop table if exists sessioner;

create table sessioner (
  id     uuid primary key default gen_random_uuid(),
  regnr  text not null references bilar (regnr),
  datum  date not null default current_date,
  forare text not null,
  tid    timestamptz not null default now()
);

create index idx_sessioner_regnr_datum on sessioner (regnr, datum);
create index idx_sessioner_datum        on sessioner (datum);

alter table sessioner enable row level security;

create policy "sessioner_anon_all"
  on sessioner
  for all
  to anon
  using (true)
  with check (true);

grant select, insert, update, delete on sessioner to anon;
