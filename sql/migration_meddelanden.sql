-- Migrering: lägger till "meddelanden" — personalen kan
-- rapportera problem/skriva meddelanden som visas för dev-teamet
-- på /ticket. Kör i Supabase SQL Editor.

create table if not exists meddelanden (
  id         uuid primary key default gen_random_uuid(),
  regnr      text references bilar (regnr),
  forare     text not null,
  meddelande text not null,
  skapad     timestamptz not null default now()
);

create index if not exists idx_meddelanden_skapad on meddelanden (skapad desc);

alter table meddelanden enable row level security;

drop policy if exists "meddelanden_anon_all" on meddelanden;
create policy "meddelanden_anon_all"
  on meddelanden
  for all
  to anon
  using (true)
  with check (true);

grant select, insert, update, delete on meddelanden to anon;
