-- =============================================================================
-- SafeCity: Run this in Supabase → SQL Editor (one time)
-- =============================================================================

-- 1. Table: incident_reports
-- -----------------------------------------------------------------------------
create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  reported_date date not null,
  reported_time time not null,
  category text not null,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  image_urls text[],
  image_analyses jsonb,
  created_at timestamptz default now()
);

-- Add Vision column if table already existed
alter table public.incident_reports add column if not exists image_analyses jsonb;

-- Gemini evaluation (run before report is fully "live" – summary, needs_review)
alter table public.incident_reports add column if not exists gemini_evaluation jsonb;

-- 2. RLS: allow insert (report) and select (receipt + evaluator)
-- -----------------------------------------------------------------------------
alter table public.incident_reports enable row level security;

drop policy if exists "Allow anonymous insert for incident reports" on public.incident_reports;
create policy "Allow anonymous insert for incident reports"
  on public.incident_reports for insert
  to anon
  with check (true);

drop policy if exists "Allow read for authenticated or anon (e.g. for dashboard)" on public.incident_reports;
create policy "Allow read for authenticated or anon (e.g. for dashboard)"
  on public.incident_reports for select
  to anon
  using (true);

-- 3. Storage bucket + policies for report images
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('report', 'report', true)
on conflict (id) do update set public = true;

drop policy if exists "Allow anonymous uploads to report" on storage.objects;
create policy "Allow anonymous uploads to report"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'report');

drop policy if exists "Public read report" on storage.objects;
create policy "Public read report"
  on storage.objects for select
  to anon
  using (bucket_id = 'report');

-- =============================================================================
-- EDGE FUNCTION SECRETS (Dashboard: Edge Functions → Secrets)
-- =============================================================================
-- Add GOOGLE_VISION_API_KEY (for image labels).
-- Add GEMINI_API_KEY (for evaluating reports before they go live). Get key at https://aistudio.google.com/apikey
-- =============================================================================
-- WEBHOOK (no SQL – create in Dashboard)
-- =============================================================================
-- 1. Go to: Database → Webhooks → Create a new webhook
-- 2. Name: e.g. "Trigger Vision on new report"
-- 3. Table: incident_reports
-- 4. Events: Insert (checked)
-- 5. Type: HTTP Request
-- 6. URL: https://aiwwroepaqkhoxqwmyxs.supabase.co/functions/v1/analyze-report-images
-- 7. Method: POST
-- 8. Headers: Content-Type = application/json
-- 9. Save
-- =============================================================================
