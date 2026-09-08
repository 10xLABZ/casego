-- CaseGO v0.5.6 client intake fields
-- Safe/idempotent: adds only missing columns.
alter table public.clients add column if not exists middle_name text;
alter table public.clients add column if not exists date_of_birth date;
alter table public.clients add column if not exists preferred_language text;
alter table public.clients add column if not exists address_line2 text;
