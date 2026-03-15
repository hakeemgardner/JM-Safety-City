/**
 * Confidence score for incident reports — used for "Most Reliable Intelligence" leaderboard.
 * Formula: + confirmations + evidence bonus + police validation bonus − age decay
 */

export type ConfidenceInput = {
  /** Number of citizen confirmations (default 0) */
  confirmation_count?: number | null;
  /** Has photo/video evidence (from image_urls or image_analyses) */
  has_evidence?: boolean;
  /** Police validated this report (default false) */
  police_verified?: boolean | null;
  /** Report date for age decay (ISO date string or Date) */
  reported_date?: string | null;
};

const CONFIRMATION_POINTS = 1;
const EVIDENCE_POINTS = 3;
const POLICE_VERIFIED_POINTS = 5;
const AGE_DECAY_PER_WEEK = 0.5;
const MAX_AGE_DECAY = 5;

/**
 * Compute confidence score for one incident.
 * Higher = more reliable intelligence (confirmations, evidence, police validation; lower = older report).
 */
export function getConfidenceScore(input: ConfidenceInput): number {
  const confirmations = Math.max(0, Number(input.confirmation_count) || 0);
  const evidence = !!input.has_evidence;
  const police = !!input.police_verified;

  let ageDecay = 0;
  if (input.reported_date) {
    const dateStr = String(input.reported_date).trim();
    const t = dateStr.includes("T") ? new Date(dateStr).getTime() : new Date(dateStr + "T12:00:00").getTime();
    if (!Number.isNaN(t)) {
      const weeks = (Date.now() - t) / (7 * 24 * 60 * 60 * 1000);
      ageDecay = Math.min(MAX_AGE_DECAY, Math.max(0, weeks * AGE_DECAY_PER_WEEK));
    }
  }

  const score =
    confirmations * CONFIRMATION_POINTS +
    (evidence ? EVIDENCE_POINTS : 0) +
    (police ? POLICE_VERIFIED_POINTS : 0) -
    ageDecay;
  return Math.max(0, Math.round(score * 10) / 10);
}

/**
 * Whether an incident has photo/video evidence from API row (image_urls array or image_analyses).
 */
export function hasEvidenceFromRow(row: Record<string, unknown>): boolean {
  const urls = row.image_urls;
  if (Array.isArray(urls) && urls.length > 0) return true;
  const analyses = row.image_analyses;
  if (Array.isArray(analyses) && analyses.length > 0) return true;
  return false;
}
