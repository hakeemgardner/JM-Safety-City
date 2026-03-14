# Supabase setup for SafeCity incident reports

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. In **Project Settings → API**, copy:
   - **Project URL** → use as `VITE_SUPABASE_URL`
   - **anon public** key → use as `VITE_SUPABASE_ANON_KEY`

## 2. Environment variables

Add to your `.env` (see `.env.example`):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 3. Create the `incident_reports` table

In the Supabase **SQL Editor**, run:

```sql
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

-- If the table already exists, add the column:
-- alter table public.incident_reports add column if not exists image_analyses jsonb;

-- Optional: enable Row Level Security (RLS) and allow anonymous insert for reports
alter table public.incident_reports enable row level security;

create policy "Allow anonymous insert for incident reports"
  on public.incident_reports for insert
  to anon
  with check (true);

create policy "Allow read for authenticated or anon (e.g. for dashboard)"
  on public.incident_reports for select
  to anon
  using (true);
```

Adjust policies if you want only authenticated users to read.

## 4. Create the Storage bucket for images

1. In Supabase go to **Storage**.
2. Click **New bucket**.
3. Name: `report`.
4. Set **Public bucket** to **Yes** if you want image URLs to be viewable without auth (needed for showing images in the app by URL).
5. Create the bucket.

Then in **Storage → Policies** for `report`, add a policy to allow uploads:

- **Policy name:** Allow anonymous uploads  
- **Allowed operation:** INSERT  
- **Target roles:** anon  
- **Policy definition:** `true` (or restrict by bucket and path if you prefer)

For public read access so image URLs work:

- **Policy name:** Public read  
- **Allowed operation:** SELECT  
- **Target roles:** anon  
- **Policy definition:** `true`

Alternatively in **SQL Editor**:

```sql
-- Allow uploads to report bucket (anon)
insert into storage.buckets (id, name, public)
values ('report', 'report', true)
on conflict (id) do update set public = true;

create policy "Allow anonymous uploads to report"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'report');

create policy "Public read report"
  on storage.objects for select
  to anon
  using (bucket_id = 'report');
```

## 5. Troubleshooting

- **ERR_NAME_NOT_RESOLVED** or **Failed to fetch** when submitting:
  - Check that `VITE_SUPABASE_URL` in `.env` exactly matches **Project URL** from Supabase (Dashboard → Project Settings → API). It should look like `https://xxxxxxxxxx.supabase.co` with no typos or extra spaces.
  - Restart the dev server (`npm run dev`) after changing `.env`.
  - Ensure the Supabase project is running (not paused).

## 6. Google Cloud Vision API (optional – image analysis for evaluators)

So evaluators can see what was detected in each photo (e.g. weapon, broken glass, violence):

1. **Google Cloud Console**: [console.cloud.google.com](https://console.cloud.google.com)
2. Create or select a project → **APIs & Services** → **Enable APIs** → enable **Cloud Vision API**.
3. **Credentials** → **Create credentials** → **API key**. Copy the key.
4. In **Supabase**: **Project Settings** → **Edge Functions** → **Secrets** → add:
   - `GOOGLE_VISION_API_KEY` = your Vision API key
5. Deploy the Edge Function (from your project root):
   ```bash
   npx supabase functions deploy analyze-report-images
   ```
6. **Trigger analysis from the database (avoids CORS):** The app no longer calls the function from the browser. Instead, trigger it from Supabase when a report is inserted:
   - In Supabase Dashboard go to **Database** → **Webhooks** (or **Database** → **Triggers** / **Webhooks**).
   - Click **Create a new webhook**.
   - **Name:** e.g. `on_incident_report_analyze_images`
   - **Table:** `incident_reports`
   - **Events:** tick **Insert**
   - **Type:** HTTP Request (or **Supabase Edge Function** if available).
   - **URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/analyze-report-images`  
     (replace `YOUR_PROJECT_REF` with your project ref, e.g. `aiwwroepaqkhoxqwmyxs`).
   - **HTTP method:** POST.
   - If the webhook asks for **headers**, add: `Content-Type: application/json`. If the function returns 401, add `Authorization: Bearer YOUR_SERVICE_ROLE_KEY` (from Project Settings → API).
   - Save. The webhook payload includes the new `record`; the function uses `record.id` to run Vision on that report’s images.
7. Add columns if you created the table before this (SQL Editor):
   ```sql
   alter table public.incident_reports add column if not exists image_analyses jsonb;
   alter table public.incident_reports add column if not exists gemini_evaluation jsonb;
   ```

After a report with images is submitted, the database webhook calls the Edge Function. It runs Vision (image labels) and then **Gemini** (evaluation: short summary + whether the report needs human review). Results are stored in `image_analyses` and `gemini_evaluation`. Evaluators see them at **/EvaluatorPage** with "Needs review" or "Evaluated" badges.

**If the app gets 400 when polling for `image_analyses`** (receipt or console): ensure the `image_analyses` column exists (`alter table public.incident_reports add column if not exists image_analyses jsonb;`) and that RLS allows `SELECT` on `incident_reports` for the anon (or authenticated) role so the client can read the row by `id`.

**If "Google Cloud Vision API" never loads** (stays on "Analyzing images…" or shows "Analysis did not load"):

1. **Database webhook** – In Supabase **Database → Webhooks**, confirm a webhook fires on **INSERT** for table `incident_reports` and calls the `analyze-report-images` Edge Function (POST to `https://YOUR_PROJECT_REF.supabase.co/functions/v1/analyze-report-images`). The payload must include the new row (e.g. `record.id`).
2. **Edge Function deployed** – Deploy the function: `supabase functions deploy analyze-report-images`.
3. **Secrets** – In **Edge Functions → Secrets**, set:
   - `GOOGLE_VISION_API_KEY` – Google Cloud Vision API key (for image labels).
   - `GEMINI_API_KEY` – Google AI Studio API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)); used to evaluate each report (summary, needs_review) before it appears on the evaluator dashboard.
4. **Logs** – In Supabase **Edge Functions → analyze-report-images → Logs**, check for errors (e.g. "Report not found", "GOOGLE_VISION_API_KEY not set", or Vision API errors). The function downloads images (public URL or from Storage) and sends them as base64 to Vision, so it works with both public and private buckets.

## 7. Done

Restart the app (`npm run dev`) and submit a report. It will:

- Save the report to `incident_reports` (case ID, date, time, category, description, location, address).
- Upload images to the `report` bucket and store their public URLs in `image_urls`.
- If the Edge Function is deployed with `GOOGLE_VISION_API_KEY` and `GEMINI_API_KEY` set, images are analyzed and each report is evaluated by Gemini (summary + needs_review) before it appears on the evaluator dashboard.
