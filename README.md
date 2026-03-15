# G.R.I.D — Geo-Referenced Incident Database

**JM-Safety-City** is a community safety platform for **Kingston, Jamaica**. It lets residents view and report incidents on a live map, plan safer routes, and see how parishes compare over time.

---

## What the website achieves

- **Live incident map** — See reported incidents (theft, assault, vandalism, suspicious activity, traffic, other) on a map with heatmap, points, and optional 3D view. Data comes from the database or mock data for demos.
- **Incident reporting** — Submit reports with category, description, date/time, location (map picker), and optional photos. Reports are stored and shown on the map.
- **Safer routing** — Plan routes with **Fastest** and **Safest** options. The safest route avoids danger zones (hazards and incident clusters) that the fastest route passes through, using the Mapbox Directions API with exclusion points.
- **Police intelligence** — The **Most Reliable Intelligence** leaderboard ranks parishes by *credible* incident data: confirmations, photo/video evidence, and police validation (minus report age decay). It answers “where is reliable intelligence clustering?” rather than raw report count.
- **Transparency** — Filter by crime type, toggle heatmap/points/3D, and hover or click incidents for details (category, description, date/time, address).

---

## Leaderboard: Most Reliable Intelligence Areas

### What it is

A **confirmation-based, parish-level leaderboard** that ranks areas by **intelligence score** (credible incident data), not raw report count. It answers: *Where is reliable intelligence clustering?* — useful for police and government to prioritise areas with high-quality, corroborated reports.

### Confidence score (per incident)

Each report gets a **confidence score**:

| Factor | Effect |
|--------|--------|
| Citizen confirmations | +1 per confirmation |
| Photo/video evidence | +3 |
| Police validation | +5 |
| Report age decay | −0.5 per week (max −5) |

**Example:**

| Report            | Confirmations | Evidence | Police verified | Score |
|-------------------|----------------|----------|-----------------|-------|
| Robbery           | 4              | Yes      | No              | 7     |
| Gunshots          | 8              | Yes      | Yes             | 15    |
| Suspicious person | 1              | No       | No              | 1     |

### How the leaderboard works

1. **Parish assignment**  
   Each incident’s lat/lng is assigned to one of Jamaica’s 14 parishes (or “Other”) via approximate bounds in `src/data/jamaicaParishes.ts`.

2. **Time window**  
   Only incidents from the **last 90 days** (by `reported_date`) are included, so the ranking reflects recent intelligence.

3. **Aggregation**  
   For each parish, sum the confidence scores of all incidents in that window. **Intelligence score** = total of those scores (e.g. Norwood — 540, Glendevon — 470).

4. **Display**  
   Parishes are ranked by **total intelligence score descending**. The panel shows **rank**, **parish name**, **score**, and **(report count)**. #1 gets an amber highlight and “highest credible intelligence” badge.

### Where to find it

On the **Live Crime Map** page:

- Click the **City ranking** button (leaderboard icon) next to **Layers** and **Safe Routes**.  
- The panel title is **“Most Reliable Intelligence”**; the list shows parishes and their intelligence scores.

### Database (optional columns)

To use confirmations and police validation, run the migration in `supabase/migrations/20250314000000_add_confidence_columns.sql` (adds `confirmation_count` and `police_verified` to `incident_reports`). Evidence is derived from existing `image_urls` / `image_analyses`. Without the new columns, those terms are 0/false and the score still uses evidence and age decay.

---

## Tech stack

- **Frontend:** React, Vite, Tailwind CSS, Mapbox GL JS  
- **Map & routing:** Mapbox (map, Directions API for fastest/safest routes)  
- **Data:** Supabase (incident reports)  
- **Optional:** Gemini API (route risk summary, safe-route zone suggestions)

---

## Running the project

```bash
npm install
npm run dev
```

Set `VITE_MAPBOX_TOKEN` (and optionally `VITE_GEMINI_API_KEY`) in `.env` for map and routing (and AI features). Configure Supabase for incident storage and the leaderboard to use real data.
