/**
 * AI area analysis using Gemini for a user-drawn lasso on the crime map.
 * Returns police deployment suggestions and what users should know about the area.
 */

/** Ray-casting point-in-polygon (closed ring: [lng, lat][]). */
export function pointInPolygon(
  lng: number,
  lat: number,
  ring: [number, number][]
): boolean {
  const n = ring.length;
  if (n < 3) return false;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

export type AreaIncident = {
  category: string;
  description?: string;
  address?: string;
  parish?: string;
  reported_date?: string;
  reported_time?: string;
};

export type AreaAnalysisInput = {
  /** Polygon ring: [lng, lat][] (first = last for closed polygon) */
  polygon: [number, number][];
  /** Incidents (crimes) inside the drawn area */
  incidents: AreaIncident[];
  /** Optional: parish name(s) if known */
  parishNames?: string[];
};

export type AreaAnalysisResult = {
  summary: string;
  policeDeployment: string;
  whatUsersShouldKnow: string;
  riskLevel?: "low" | "moderate" | "high";
};

function getApiKey(): string | undefined {
  return (import.meta.env.VITE_GEMINI_API_KEY as string) || undefined;
}

/** Try to repair JSON truncated by Gemini (e.g. unterminated string). */
function repairTruncatedJson(text: string): string {
  let s = text.trim();
  if (s.endsWith("}")) return s;
  // Trailing comma -> remove so we can close the object
  if (s.endsWith(",")) s = s.slice(0, -1);
  // Close an open string (truncation mid-value) then close the object
  if (!s.endsWith('"')) s += '"';
  s += "}";
  return s;
}

/**
 * Call Gemini to analyze a drawn area and return deployment + user-facing advice.
 */
export async function getAreaAnalysis(
  input: AreaAnalysisInput
): Promise<AreaAnalysisResult | null> {
  const key = getApiKey();
  if (!key?.trim()) return null;

  const incidentList =
    input.incidents.length > 0
      ? input.incidents
          .slice(0, 40)
          .map(
            (i) =>
              `- ${i.category}${i.address ? ` at ${i.address}` : ""}${i.parish ? ` (${i.parish})` : ""}${i.reported_date ? ` ${i.reported_date}` : ""}${i.description ? `: ${i.description.slice(0, 80)}` : ""}`
          )
          .join("\n")
      : "No incidents reported in this area (from available data).";

  const parishNote =
    input.parishNames?.length ?? 0 > 0
      ? `Parish(es): ${input.parishNames!.join(", ")}.`
      : "";

  const prompt = `You are a safety and policing analyst for Kingston, Jamaica. A user has drawn a freeform area on a community crime map. Analyze the incidents inside that area and respond with practical, concise advice.

Drawn area: polygon with ${input.polygon.length} points (approximate boundary).
${parishNote}
Number of incidents in area: ${input.incidents.length}.

Incidents in this area (category, location, date, description):
${incidentList}

Respond with ONLY a single JSON object, no markdown or other text. Use this exact structure. Keep each string value short (1-2 sentences). Do not include newlines or unescaped quotes inside strings.
{"summary":"...","policeDeployment":"...","whatUsersShouldKnow":"...","riskLevel":"low or moderate or high"}`;

  const url = `${GEMINI_BASE}/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn("Gemini area analysis error:", res.status, err);
      return null;
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText?.trim()) return null;

    // Strip markdown code fences and trim so we get valid JSON (Gemini sometimes wraps in ```json)
    let text = rawText.trim();
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) text = jsonMatch[1].trim();
    // Remove any leading/trailing non-JSON (e.g. "Here is the analysis:" or stray backticks)
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }

    let parsed: {
      summary?: string;
      policeDeployment?: string;
      whatUsersShouldKnow?: string;
      riskLevel?: string;
    };
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      // Often Gemini truncates the response (unterminated string). Try to repair.
      const repaired = repairTruncatedJson(text);
      try {
        parsed = JSON.parse(repaired) as typeof parsed;
      } catch (parseErr) {
        console.warn("Gemini area analysis: JSON parse failed, text length:", text.length, parseErr);
        return null;
      }
    }

    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const policeDeployment = typeof parsed.policeDeployment === "string" ? parsed.policeDeployment.trim() : "";
    const whatUsersShouldKnow = typeof parsed.whatUsersShouldKnow === "string" ? parsed.whatUsersShouldKnow.trim() : "";
    if (!summary && !policeDeployment && !whatUsersShouldKnow) return null;

    const riskLevel =
      parsed.riskLevel === "low" || parsed.riskLevel === "moderate" || parsed.riskLevel === "high"
        ? parsed.riskLevel
        : undefined;

    return {
      summary: summary || "No summary.",
      policeDeployment: policeDeployment || "No specific deployment recommendation.",
      whatUsersShouldKnow: whatUsersShouldKnow || "No specific advice.",
      riskLevel,
    };
  } catch (e) {
    console.warn("Gemini area analysis request failed:", e);
    return null;
  }
}
