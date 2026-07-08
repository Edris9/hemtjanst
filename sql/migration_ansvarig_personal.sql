-- Migrering: lägger till "ansvarig_personal" på bilar — personalen
-- som ska meddelas om något händer med bilen. Redigeras från admin.
-- Kör i Supabase SQL Editor.

alter table bilar add column if not exists ansvarig_personal text;
