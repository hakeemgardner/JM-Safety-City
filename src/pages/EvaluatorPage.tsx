/** @format */

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface ImageAnalysis {
  url: string;
  labels: { description: string; score: number }[];
  safeSearch?: Record<string, string>;
}

interface GeminiEvaluation {
  summary: string;
  needs_review: boolean;
}

interface Report {
  id: string;
  case_id: string;
  reported_date: string;
  reported_time: string;
  category: string;
  description: string | null;
  address: string | null;
  image_urls: string[] | null;
  image_analyses: ImageAnalysis[] | null;
  gemini_evaluation: GeminiEvaluation | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  theft: "Theft / Robbery",
  vandalism: "Vandalism",
  assault: "Physical Assault",
  suspicious: "Suspicious Activity",
  traffic: "Traffic Incident",
  other: "Other",
};

const EvaluatorPage = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadReports = async () => {
    if (!supabase) return;
    const { data, error: e } = await supabase
      .from("incident_reports")
      .select("id, case_id, reported_date, reported_time, category, description, address, image_urls, image_analyses, gemini_evaluation, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (e) {
      setError(e.message);
      return;
    }
    setReports((data as Report[]) ?? []);
  };

  useEffect(() => {
    if (!supabase) {
      setError("Supabase not configured.");
      setLoading(false);
      return;
    }
    loadReports().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!supabase || loading) return;
    const interval = setInterval(() => { loadReports(); }, 25000);
    return () => clearInterval(interval);
  }, [supabase, loading, refreshKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <p className="text-slate-500">Loading reports…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <header className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Evaluator – Incident Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Reports with Vision AI labels and Gemini evaluation (summary, needs review) before they go live.
          </p>
        </div>
        <nav className="flex items-center gap-4">
          <a href="/" className="text-sm font-medium hover:text-primary transition-colors">Dashboard</a>
          <a href="/IncidentReportPage" className="text-sm font-medium hover:text-primary transition-colors">Report</a>
          <button
            type="button"
            onClick={() => { setRefreshKey((k) => k + 1); setLoading(true); loadReports().finally(() => setLoading(false)); }}
            className="text-sm font-medium text-primary hover:underline"
          >
            Refresh
          </button>
        </nav>
      </header>
      <main className="p-6 max-w-4xl mx-auto space-y-6">
        {reports.length === 0 ? (
          <p className="text-slate-500">No reports yet.</p>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="font-mono font-bold text-primary">{report.case_id}</span>
                <span className="text-slate-500 text-sm">
                  {report.reported_date} {report.reported_time}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm">
                  {CATEGORY_LABELS[report.category] ?? report.category}
                </span>
                {report.gemini_evaluation?.needs_review && (
                  <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-sm font-medium">
                    Flagged by AI
                  </span>
                )}
                {report.gemini_evaluation && !report.gemini_evaluation.needs_review && (
                  <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 text-sm">
                    Cleared by AI
                  </span>
                )}
              </div>
              {report.gemini_evaluation?.summary && (
                <div className="mb-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">AI evaluation</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{report.gemini_evaluation.summary}</p>
                </div>
              )}
              {report.address && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{report.address}</p>
              )}
              {report.description && (
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">{report.description}</p>
              )}

              {report.image_urls && report.image_urls.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Photos & what the system detected
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {report.image_urls.map((url, idx) => {
                      const analysis: ImageAnalysis = report.image_analyses?.[idx] ?? { url, labels: [] };
                      return (
                        <div
                          key={url}
                          className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                        >
                          <img
                            src={url}
                            alt={`Report ${idx + 1}`}
                            className="w-full h-40 object-cover bg-slate-100"
                          />
                          <div className="p-3">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                              Detected in image
                            </p>
                            {analysis.labels && analysis.labels.length > 0 ? (
                              <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-0.5">
                                {analysis.labels.map((l, i) => (
                                  <li key={i}>
                                    <span className="font-medium">{l.description}</span>
                                    {l.score != null && (
                                      <span className="text-slate-500 ml-1">({Math.round(l.score * 100)}%)</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-slate-500">No labels yet (analysis may be pending or failed).</p>
                            )}
                            {analysis.safeSearch && Object.keys(analysis.safeSearch).length > 0 && (
                              <p className="text-xs text-slate-500 mt-2">
                                Safe search: {Object.entries(analysis.safeSearch).map(([k, v]) => `${k}: ${v}`).join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default EvaluatorPage;
