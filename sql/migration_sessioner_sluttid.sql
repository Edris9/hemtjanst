-- Migrering: vy som beräknar "slut"-tid per session.
--
-- Regler:
--  - Tar en annan förare över samma bil samma dag ska den nya
--    förarens starttid räknas som slut för den föregående.
--  - Har ingen tagit över bilen innan dagen är slut räknas
--    slut som kl 22:00 (registreringsfönstret är 07:00–22:00).
--
-- Kör i Supabase SQL Editor.

create or replace view sessioner_med_sluttid as
select
  s.*,
  coalesce(
    lead(s.tid) over (partition by s.regnr, s.datum order by s.tid),
    (s.datum + time '22:00') at time zone 'Europe/Stockholm'
  ) as slut
from sessioner s;

grant select on sessioner_med_sluttid to anon;
