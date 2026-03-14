/**
 * Client-side Google Cloud Vision API (label detection).
 * Uses VITE_GOOGLE_VISION_API_KEY from .env. Enable "Cloud Vision API" for the key in Google Cloud Console.
 */

const VISION_API = "https://vision.googleapis.com/v1/images:annotate";
const API_KEY = (import.meta.env.VITE_GOOGLE_VISION_API_KEY as string)?.trim() || "";

export type VisionLabel = { description: string; score: number };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      resolve(base64 ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Call Vision API from the browser. Returns labels for one image, or null if no key / not an image / error.
 */
export async function getLabelsForImage(file: File): Promise<VisionLabel[] | null> {
  if (!API_KEY) return null;
  if (!file.type.startsWith("image/")) return null;
  try {
    const base64 = await fileToBase64(file);
    const res = await fetch(`${VISION_API}?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: "LABEL_DETECTION", maxResults: 20 }],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      responses?: Array<{ labelAnnotations?: Array<{ description: string; score?: number }> }>;
    };
    const labels = json?.responses?.[0]?.labelAnnotations;
    if (!labels?.length) return null;
    return labels.map((l) => ({ description: l.description, score: l.score ?? 0 }));
  } catch {
    return null;
  }
}
