/**
 * AI route risk analysis using Gemini.
 * Uses location, time, hazard/crime history along the route to produce a short risk summary.
 * Better predictions require large historical datasets; this uses mock + route context.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

export type RouteRiskInput = {
  /** Route duration in seconds */
  durationSec: number;
  /** Route distance in meters */
  distanceM: number;
  /** Hazard counts along the route */
  hazards: { high: number; medium: number; low: number };
  /** Incidents (crimes) near the route: category, time, location */
  incidents: Array<{
    category: string;
    description?: string;
    address?: string;
    reported_date?: string;
    reported_time?: string;
  }>;
  /** Current time of day for context (e.g. "night", "evening", "rush hour") */
  timeOfDay: string;
  /** Optional: weather (mock) */
  weather?: string;
  /** Optional: crowd density (mock) */
  crowdDensity?: string;
};

export type RouteRiskResult = {
  summary: string;
  riskLevel?: "low" | "moderate" | "high";
  riskProbability?: string;
};

function getApiKey(): string | undefined {
  return (import.meta.env.VITE_GEMINI_API_KEY as string) || undefined;
}

/**
 * Call Gemini to analyze route safety and return a short summary + optional risk level.
 */
export async function getRouteRiskAnalysis(input: RouteRiskInput): Promise<RouteRiskResult | null> {
  const key = getApiKey();
  if (!key?.trim()) return null;

  const incidentList =
    input.incidents.length > 0
      ? input.incidents
          .slice(0, 25)
          .map(
            (i) =>
              `- ${i.category}${i.address ? ` at ${i.address}` : ""}${i.reported_date || i.reported_time ? ` (${[i.reported_date, i.reported_time].filter(Boolean).join(" ")})` : ""}${i.description ? `: ${i.description}` : ""}`
          )
          .join("\n")
      : "None reported near this route.";

  const prompt = `You are a safety analyst for a community crime map in Kingston, Jamaica. Based on the following route and incident data, give a very short safety summary (2–3 sentences) and optionally a risk level (low/moderate/high) and a one-line risk probability if relevant.

Route: ${(input.distanceM / 1000).toFixed(1)} km, ~${Math.round(input.durationSec / 60)} min.
Time of day: ${input.timeOfDay}.
Hazards along route: High=${input.hazards.high}, Medium=${input.hazards.medium}, Low=${input.hazards.low}.
Incidents near or along this route (from historical/mock data):
${incidentList}
${input.weather ? `Weather: ${input.weather}.` : ""}
${input.crowdDensity ? `Crowd density: ${input.crowdDensity}.` : ""}

Respond in JSON only, with this exact structure (no markdown, no extra text):
{"summary":"...","riskLevel":"low|moderate|high","riskProbability":"optional one-line e.g. This road has a 63% higher robbery risk at night."}`;

  const url = `${GEMINI_BASE}/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 400,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn("Gemini route risk error:", res.status, err);
      return null;
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text?.trim()) return null;

    const parsed = JSON.parse(text) as { summary?: string; riskLevel?: string; riskProbability?: string };
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    if (!summary) return null;

    const riskLevel =
      parsed.riskLevel === "low" || parsed.riskLevel === "moderate" || parsed.riskLevel === "high"
        ? parsed.riskLevel
        : undefined;

    return {
      summary,
      riskLevel,
      riskProbability: typeof parsed.riskProbability === "string" ? parsed.riskProbability.trim() : undefined,
    };
  } catch (e) {
    console.warn("Gemini route risk request failed:", e);
    return null;
  }
}

/**
 * Derive time-of-day label from current time for the prompt.
 */
export function getTimeOfDayLabel(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/** One zone (hazard or crime) that can be avoided when routing. */
export type ExcludeZone = {
  id: number;
  type: "hazard" | "crime";
  lng: number;
  lat: number;
  /** For hazard: high | medium | low */
  severity?: string;
  /** For crime: category */
  category?: string;
  radiusM: number;
  /** Mapbox exclude points for this zone (e.g. 5 points: center + 4 cardinal). */
  points: string[];
};

/**
 * Ask Gemini which zones to avoid for the safest route from origin to destination.
 * Returns the list of zone IDs to avoid; use their zone.points to build the Mapbox exclude param.
 * Returns null if no key, API error, or empty response (caller should fall back to default exclude).
 */
export async function getGeminiSafeRouteExclude(
  origin: [number, number],
  destination: [number, number],
  zones: ExcludeZone[],
  timeOfDay: string
): Promise<number[] | null> {
  const key = getApiKey();
  if (!key?.trim() || zones.length === 0) return null;

  const zoneList = zones
    .slice(0, 30)
    .map(
      (z) =>
        `- Zone ${z.id}: ${z.type} ${z.type === "hazard" ? `severity=${z.severity ?? "low"}` : `category=${z.category ?? "other"}`} at lng=${z.lng.toFixed(5)} lat=${z.lat.toFixed(5)} radius=${z.radiusM}m`
    )
    .join("\n");

  const prompt = `You are a safety routing advisor for Kingston, Jamaica. A driver wants the SAFEST route (not necessarily fastest) from origin to destination.

Origin: lng=${origin[0].toFixed(5)} lat=${origin[1].toFixed(5)}
Destination: lng=${destination[0].toFixed(5)} lat=${destination[1].toFixed(5)}
Time of day: ${timeOfDay}

The following zones (hazards and crime areas) can be excluded from the route so the route avoids them. We can pass at most 50 exclude points to the router; each zone uses 5 points. So we can avoid at most 10 zones.

Zones:
${zoneList}

Which zone IDs should we avoid to get the safest route? Consider: high/medium hazards are critical to avoid; crime zones (especially assault, theft) matter; time of day (e.g. night) may make some areas riskier. Return the zone IDs in priority order (most important to avoid first), up to 10 zones.

Respond in JSON only (no markdown, no extra text):
{"avoidZoneIds":[0,1,2,...]}`;

  const url = `${GEMINI_BASE}/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 200,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text?.trim()) return null;

    const parsed = JSON.parse(text) as { avoidZoneIds?: number[] };
    const ids = Array.isArray(parsed.avoidZoneIds) ? parsed.avoidZoneIds : null;
    if (!ids || ids.length === 0) return null;

    const validIds = new Set(zones.map((z) => z.id));
    return ids.filter((id) => validIds.has(id)).slice(0, 10);
  } catch {
    return null;
  }
}
