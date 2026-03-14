// Supabase Edge Function: analyze report images with Google Cloud Vision API
// Run after a report is submitted. Stores labels (e.g. weapon, broken glass) for evaluators.
// Uses base64 when the image URL is not publicly reachable (e.g. private bucket).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VISION_API = "https://vision.googleapis.com/v1/images:annotate";
const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_VISION_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Returns base64 image bytes, or null if failed. Tries public fetch first, then Supabase Storage download. */
async function getImageBase64(
  url: string,
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  const res = await fetch(url, { method: "GET" });
  if (res.ok) {
    const blob = await res.blob();
    const buf = await blob.arrayBuffer();
    return arrayBufferToBase64(buf);
  }
  const match = url.match(/\/object\/public\/([^/]+)\/(.+)$/);
  if (match) {
    const [, bucket, path] = match;
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (!error && data) {
      const buf = await data.arrayBuffer();
      return arrayBufferToBase64(buf);
    }
  }
  return null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VisionLabel {
  description: string;
  score?: number;
}

interface VisionResponse {
  labelAnnotations?: VisionLabel[];
  safeSearchAnnotation?: Record<string, string>;
}

interface ImageAnalysis {
  url: string;
  labels: { description: string; score: number }[];
  safeSearch?: Record<string, string>;
}

interface GeminiEvaluation {
  summary: string;
  needs_review: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }

  const withCors = (res: Response) => {
    const h = new Headers(res.headers);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => h.set(k, v));
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  };

  if (req.method !== "POST") {
    return withCors(new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } }));
  }

  if (!GOOGLE_API_KEY) {
    return withCors(new Response(JSON.stringify({ error: "GOOGLE_VISION_API_KEY not set" }), { status: 500, headers: { "Content-Type": "application/json" } }));
  }

  let body: { report_id?: string; record?: { id?: string } };
  try {
    body = await req.json();
  } catch {
    return withCors(new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }));
  }

  const reportId = body.report_id ?? body.record?.id;
  if (!reportId) {
    return withCors(new Response(JSON.stringify({ error: "report_id or record.id required" }), { status: 400, headers: { "Content-Type": "application/json" } }));
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: report, error: fetchError } = await supabase
    .from("incident_reports")
    .select("image_urls, description, category, address")
    .eq("id", reportId)
    .single();

  if (fetchError || !report) {
    return withCors(new Response(JSON.stringify({ error: "Report not found" }), { status: 404, headers: { "Content-Type": "application/json" } }));
  }

  const urls: string[] = report.image_urls ?? [];
  const analyses: ImageAnalysis[] = [];

  for (const url of urls) {
    const isVideo = /\.(mp4|webm|mov)$/i.test(url) || url.toLowerCase().includes("video/");
    if (isVideo) {
      analyses.push({ url, labels: [], safeSearch: { note: "Video not analyzed" } });
      continue;
    }

    const base64 = await getImageBase64(url, supabase);
    if (!base64) {
      analyses.push({ url, labels: [], safeSearch: { error: "Could not fetch image" } });
      continue;
    }

    const visionBody = {
      requests: [
        {
          image: { content: base64 },
          features: [
            { type: "LABEL_DETECTION", maxResults: 20 },
            { type: "SAFE_SEARCH_DETECTION" },
          ],
        },
      ],
    };

    try {
      const res = await fetch(`${VISION_API}?key=${GOOGLE_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visionBody),
      });

      if (!res.ok) {
        const errText = await res.text();
        analyses.push({ url, labels: [], safeSearch: { error: errText.slice(0, 200) } });
        continue;
      }

      const data = await res.json();
      const resp = data.responses?.[0] as VisionResponse | undefined;
      const labels = (resp?.labelAnnotations ?? []).map((a) => ({
        description: a.description,
        score: a.score ?? 0,
      }));
      const safeSearch = resp?.safeSearchAnnotation
        ? {
            adult: resp.safeSearchAnnotation.adult,
            violence: resp.safeSearchAnnotation.violence,
            dangerous: resp.safeSearchAnnotation.dangerous,
          }
        : undefined;

      analyses.push({ url, labels, safeSearch });
    } catch (e) {
      analyses.push({ url, labels: [], safeSearch: { error: String(e).slice(0, 200) } });
    }
  }

  let geminiEvaluation: GeminiEvaluation | null = null;
  if (GEMINI_API_KEY && report) {
    const imageSummary = analyses
      .map((a, i) => `Photo ${i + 1}: ${a.labels?.length ? a.labels.map((l) => l.description).join(", ") : "no labels"}`)
      .join("\n");
    const prompt = `You are evaluating a community safety incident report before it is shown on a website. Based only on the information below, respond with exactly a single JSON object (no markdown, no extra text) with two keys: "summary" (one short sentence describing the report and whether it seems credible and appropriate for a public safety feed), and "needs_review" (true if the report is vague, offensive, or you would flag it for attention; false if it looks credible and appropriate for a public safety feed).

Report:
- Category: ${(report as { category?: string }).category ?? "unknown"}
- Description: ${(report as { description?: string }).description ?? "none"}
- Address/location: ${(report as { address?: string }).address ?? "none"}
- What was detected in the attached photo(s): ${imageSummary}

Respond with only: {"summary":"...","needs_review":true or false}`;

    try {
      const gemRes = await fetch(`${GEMINI_API}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
        }),
      });
      if (gemRes.ok) {
        const gemJson = await gemRes.json();
        const text = gemJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          const parsed = JSON.parse(text.replace(/^[^{]+|\s+$/g, (s: string) => (s.startsWith("{") ? s : "")) || text;
          if (parsed.summary != null && typeof parsed.needs_review === "boolean") {
            geminiEvaluation = { summary: String(parsed.summary), needs_review: Boolean(parsed.needs_review) };
          } else {
            geminiEvaluation = { summary: String(parsed.summary ?? text).slice(0, 500), needs_review: true };
          }
        }
      }
    } catch (_) {
      // leave geminiEvaluation null
    }
  }

  const updatePayload: { image_analyses: ImageAnalysis[]; gemini_evaluation?: GeminiEvaluation } = { image_analyses: analyses };
  if (geminiEvaluation) updatePayload.gemini_evaluation = geminiEvaluation;

  const { error: updateError } = await supabase
    .from("incident_reports")
    .update(updatePayload)
    .eq("id", reportId);

  if (updateError) {
    return withCors(new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: { "Content-Type": "application/json" } }));
  }

  return withCors(new Response(JSON.stringify({ ok: true, analyses, gemini_evaluation: geminiEvaluation }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }));
});
