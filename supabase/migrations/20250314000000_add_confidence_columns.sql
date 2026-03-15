-- Confirmation-based intelligence: optional columns for leaderboard scoring
-- Run in Supabase → SQL Editor if your table already exists

alter table public.incident_reports add column if not exists confirmation_count int not null default 0;
alter table public.incident_reports add column if not exists police_verified boolean not null default false;

comment on column public.incident_reports.confirmation_count is 'Number of citizen confirmations for this incident (increases confidence score).';
comment on column public.incident_reports.police_verified is 'True when police have validated this report (increases confidence score).';
