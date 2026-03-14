/** @format */

import React, { useEffect, useRef, useState } from "react";
import {
  IncidentLocationMap,
  type IncidentLocation,
} from "../components/IncidentLocationMap";
import { generateCaseId } from "../lib/caseId";
import { supabase, STORAGE_BUCKET } from "../lib/supabase";
import { getLabelsForImage } from "../lib/vision";

const CATEGORIES = [
  { value: "", label: "Select the type of incident" },
  { value: "theft", label: "Theft / Robbery" },
  { value: "vandalism", label: "Vandalism" },
  { value: "assault", label: "Physical Assault" },
  { value: "suspicious", label: "Suspicious Activity" },
  { value: "traffic", label: "Traffic Incident" },
  { value: "other", label: "Other" },
];

const MAX_FILE_SIZE_MB = 10;
const ACCEPTED_TYPES = "image/png,image/jpeg,image/jpg,image/webp,video/mp4";

const IncidentReportPage = () => {
  const [incidentLocation, setIncidentLocation] =
    useState<IncidentLocation>(null);
  const [caseId, setCaseId] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [reportTime, setReportTime] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [submittedReport, setSubmittedReport] = useState<{
    reportId: string;
    caseId: string;
    date: string;
    time: string;
    category: string;
    description: string | null;
    address: string | null;
    imageCount: number;
  } | null>(null);
  const [imageAnalyses, setImageAnalyses] = useState<{
    url: string;
    labels: { description: string; score: number }[];
    safeSearch?: Record<string, string>;
  }[] | null>(null);
  const [visionPollDone, setVisionPollDone] = useState(false);
  const [geminiEvaluation, setGeminiEvaluation] = useState<{ summary: string; needs_review: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCaseId(generateCaseId());
    const now = new Date();
    setReportDate(now.toISOString().slice(0, 10));
    setReportTime(now.toTimeString().slice(0, 5));
  }, []);

  // Poll for Vision results and Gemini evaluation (drives Received → Reviewing → Verified)
  useEffect(() => {
    if (!supabase || !submittedReport?.reportId) return;
    setVisionPollDone(false);
    setGeminiEvaluation(null);
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 35;
    const intervalMs = 1000;

    const reportId = submittedReport.reportId;
    const poll = async () => {
      if (cancelled || attempts >= maxAttempts) return;
      const { data, error } = await supabase
        .from("incident_reports")
        .select("*")
        .eq("id", reportId)
        .maybeSingle();
      attempts += 1;
      if (cancelled) return;
      if (error) {
        setVisionPollDone(true);
        return;
      }
      const analyses = data?.image_analyses;
      if (analyses && Array.isArray(analyses) && analyses.length > 0) setImageAnalyses(analyses);
      let eval_: { summary?: string; needs_review?: boolean } | null = data?.gemini_evaluation as typeof eval_ | null;
      if (typeof eval_ === "string") {
        try {
          eval_ = JSON.parse(eval_) as { summary?: string; needs_review?: boolean };
        } catch {
          eval_ = null;
        }
      }
      if (eval_ && typeof eval_.needs_review === "boolean") setGeminiEvaluation({ summary: String(eval_.summary ?? ""), needs_review: eval_.needs_review });
      if (attempts >= maxAttempts) setVisionPollDone(true);
      if (attempts < maxAttempts) setTimeout(poll, intervalMs);
    };

    const t = setTimeout(poll, 600);
    return () => { cancelled = true; clearTimeout(t); };
  }, [submittedReport?.reportId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const valid = selected.filter((f) => {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) return false;
      const type = f.type.toLowerCase();
      return (
        type.startsWith("image/") ||
        type === "video/mp4"
      );
    });
    setFiles((prev) => [...prev, ...valid].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentLocation) {
      setSubmitStatus("error");
      setSubmitMessage("Please set the incident location on the map (search, current location, or click).");
      return;
    }
    if (!category) {
      setSubmitStatus("error");
      setSubmitMessage("Please select an incident category.");
      return;
    }
    if (!supabase) {
      setSubmitStatus("error");
      setSubmitMessage("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env");
      return;
    }

    setSubmitting(true);
    setSubmitStatus("idle");
    setSubmitMessage("");

    try {
      const imageUrls: string[] = [];
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `${caseId}/${Date.now()}-${i}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, { upsert: true });
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(path);
          imageUrls.push(urlData.publicUrl);
        }
      }

      const { data: inserted, error } = await supabase
        .from("incident_reports")
        .insert({
          case_id: caseId,
          reported_date: reportDate,
          reported_time: reportTime,
          category,
          description: description.trim() || null,
          latitude: incidentLocation.latitude,
          longitude: incidentLocation.longitude,
          address: incidentLocation.address ?? null,
          image_urls: imageUrls.length ? imageUrls : null,
        })
        .select("id")
        .single();

      if (error) throw error;

      const imageFiles = files.filter((f) => f.type.startsWith("image/"));

      setSubmitStatus("success");
      setSubmitMessage(`Report submitted. Case ID: ${caseId}`);
      setImageAnalyses(null);
      setVisionPollDone(false);
      setGeminiEvaluation(null);
      setSubmittedReport({
        reportId: inserted.id,
        caseId,
        date: reportDate,
        time: reportTime,
        category: CATEGORIES.find((c) => c.value === category)?.label ?? category,
        description: description.trim() || null,
        address: incidentLocation.address ?? null,
        imageCount: imageUrls.length,
      });

      if (imageFiles.length > 0) {
        Promise.all(imageFiles.map((file) => getLabelsForImage(file))).then((results) => {
          setImageAnalyses(
            results.map((labels, idx) => ({
              url: imageUrls[idx] ?? "",
              labels: labels ?? [],
            }))
          );
        });
      }

      setCaseId(generateCaseId());
      const now = new Date();
      setReportDate(now.toISOString().slice(0, 10));
      setReportTime(now.toTimeString().slice(0, 5));
      setCategory("");
      setDescription("");
      setFiles([]);
      setIncidentLocation(null);
    } catch (err: unknown) {
      setSubmitStatus("error");
      const message =
        err instanceof Error ? err.message : String(err);
      const isNetwork =
        typeof message === "string" &&
        (message.includes("Failed to fetch") ||
          message.includes("ERR_NAME_NOT_RESOLVED") ||
          message.includes("NetworkError") ||
          message.includes("Load failed"));
      setSubmitMessage(
        isNetwork
          ? "Cannot reach Supabase (ERR_NAME_NOT_RESOLVED). Open Supabase Dashboard → your project → Project Settings → API and copy the exact Project URL into .env as VITE_SUPABASE_URL. If the project was paused, restore it first. Then restart the dev server."
          : message
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="layout-container flex h-full grow flex-col">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-primary/20 px-6 lg:px-10 py-3 bg-background-light dark:bg-background-dark sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <div className="size-8 text-primary">
              <svg
                fill="none"
                viewBox="0 0 48 48"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z"
                  fill="currentColor"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold leading-tight tracking-tight">
              SafeCity
            </h2>
          </div>
          <div className="flex flex-1 justify-end gap-8 items-center">
            <nav className="hidden md:flex items-center gap-8">
              <a className="text-sm font-medium hover:text-primary transition-colors" href="/">Dashboard</a>
              <a className="text-sm font-medium hover:text-primary transition-colors" href="/IncidentReportPage">Report</a>
              <a className="text-sm font-medium hover:text-primary transition-colors" href="/EvaluatorPage">Evaluator</a>
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#">Alerts</a>
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#">Safety Tips</a>
            </nav>
            <div className="flex items-center gap-4">
              <button className="flex min-w-[100px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all">
                Login
              </button>
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-primary/30"
                data-alt="User profile avatar placeholder"
                style={{
                  backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuDRCNZNbPe8frD6D5SpgL-9kSPOtkRcY8DV3c9cldSwWPbRMhBHgM5CXAf0jhJYzgzy25Irfql8FInsclNLOWoQ8d4Zvp1nHmtO0z2edv3B-r7ODl_qPrskeplT-y93BEhEnNdA2cs47YEIqXhgxmbyHFoKN-VVw1-JRijSfsTdIB3OvCofi20ZUjdDqIuGjI3hvsLFnY8TSeovfltsjUZiTSFkVVXE5t5YBiVj1N1oORaw-deRaFDrCAPDUTh1PLX0ojUgILVS1xTK")`,
                }}></div>
            </div>
          </div>
        </header>
        <main className="flex-1 py-12 px-4 md:px-0">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10 text-center">
              <h1 className="text-4xl font-black tracking-tight mb-3">
                Report an Incident
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                Your safety is our priority. Submit an anonymous report to alert
                the community. No personal data is stored.
              </p>
            </div>

            {submittedReport && (
              <div className="mb-10 rounded-2xl border-2 border-green-200 dark:border-green-800 bg-green-50/80 dark:bg-green-900/20 p-6 sm:p-8 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500 text-white">
                      <span className="material-symbols-outlined text-2xl">check_circle</span>
                    </span>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Report submitted</h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Save your case ID for reference</p>
                    </div>
                  </div>
                  <p className="font-mono text-lg font-bold text-primary">{submittedReport.caseId}</p>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2 border-t border-green-200/50 dark:border-green-800/50 pt-6">
                  <div>
                    <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date & time</dt>
                    <dd className="text-slate-800 dark:text-slate-200">{submittedReport.date} at {submittedReport.time}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</dt>
                    <dd className="text-slate-800 dark:text-slate-200">{submittedReport.category}</dd>
                  </div>
                  {submittedReport.address && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Location</dt>
                      <dd className="text-slate-800 dark:text-slate-200">{submittedReport.address}</dd>
                    </div>
                  )}
                  {submittedReport.description && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</dt>
                      <dd className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{submittedReport.description}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Photos attached</dt>
                    <dd className="text-slate-800 dark:text-slate-200">{submittedReport.imageCount} file(s)</dd>
                  </div>
                </dl>

                {submittedReport.imageCount > 0 && (
                  <div className="border-t border-green-200/50 dark:border-green-800/50 pt-6 mt-6">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                      What we see in your photo(s)
                    </h3>
                    {imageAnalyses && imageAnalyses.length > 0 ? (
                      <div className="space-y-3">
                        {imageAnalyses.map((analysis, idx) => {
                          const what = analysis.labels?.length
                            ? analysis.labels.map((l) => l.description).join(", ")
                            : null;
                          return (
                            <div key={idx} className="rounded-lg bg-white/60 dark:bg-slate-800/60 p-4 border border-green-200/50 dark:border-green-800/50">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                Photo {idx + 1}: {what ?? "Nothing detected"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : visionPollDone ? (
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        Add <code className="rounded bg-black/10 dark:bg-white/10 px-1">VITE_GOOGLE_VISION_API_KEY</code> to your <code className="rounded bg-black/10 dark:bg-white/10 px-1">.env</code> (same key as before; enable Cloud Vision API in Google Cloud) and restart the dev server for instant &quot;What we see&quot; results.
                      </p>
                    ) : (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Looking at your photo(s)…
                      </p>
                    )}
                  </div>
                )}

                {/* Status: Received → Reviewing (Gemini) → Verified */}
                <div className="border-t border-green-200/50 dark:border-green-800/50 pt-6 mt-6">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Status</h3>
                  <div className="space-y-4 relative pl-2">
                    <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                    <div className="relative flex items-center gap-3">
                      <div className="z-10 size-8 rounded-full bg-primary flex items-center justify-center text-white ring-2 ring-primary/30 shrink-0">
                        <span className="material-symbols-outlined text-sm">check</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Received</p>
                        <p className="text-xs text-slate-500">On submit</p>
                      </div>
                    </div>
                    <div className="relative flex items-center gap-3">
                      <div className={`z-10 size-8 rounded-full flex items-center justify-center shrink-0 ${geminiEvaluation ? "bg-primary text-white ring-2 ring-primary/30" : "bg-slate-200 dark:bg-slate-700 text-slate-400"}`}>
                        <span className="material-symbols-outlined text-sm">visibility</span>
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${geminiEvaluation ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}`}>Reviewing</p>
                        <p className="text-xs text-slate-500">{geminiEvaluation ? "Reviewed by AI" : "Pending"}</p>
                      </div>
                    </div>
                    <div className="relative flex items-center gap-3">
                      <div className={`z-10 size-8 rounded-full flex items-center justify-center shrink-0 ${geminiEvaluation && !geminiEvaluation.needs_review ? "bg-primary text-white ring-2 ring-primary/30" : "bg-slate-200 dark:bg-slate-700 text-slate-400"}`}>
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${geminiEvaluation && !geminiEvaluation.needs_review ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}`}>Verified</p>
                        <p className="text-xs text-slate-500">
                          {geminiEvaluation ? (geminiEvaluation.needs_review ? "Flagged by AI" : "Cleared by AI") : "Pending"}
                        </p>
                      </div>
                    </div>
                  </div>
                  {geminiEvaluation?.summary && (
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 italic">&quot;{geminiEvaluation.summary}&quot;</p>
                  )}
                  {!geminiEvaluation && submittedReport?.reportId && supabase && (
                    <button
                      type="button"
                      onClick={async () => {
                        const { data } = await supabase.from("incident_reports").select("*").eq("id", submittedReport.reportId).maybeSingle();
                        if (data?.image_analyses && Array.isArray(data.image_analyses) && data.image_analyses.length > 0) setImageAnalyses(data.image_analyses);
                        let e = data?.gemini_evaluation as { summary?: string; needs_review?: boolean } | null;
                        if (typeof e === "string") { try { e = JSON.parse(e); } catch { e = null; } }
                        if (e && typeof e.needs_review === "boolean") setGeminiEvaluation({ summary: String(e.summary ?? ""), needs_review: e.needs_review });
                      }}
                      className="mt-3 text-sm text-primary font-medium hover:underline"
                    >
                      Check status again
                    </button>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => { setSubmittedReport(null); setImageAnalyses(null); setVisionPollDone(false); setGeminiEvaluation(null); }}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary text-white font-semibold px-5 py-2.5 hover:bg-primary/90 transition-colors"
                  >
                    <span className="material-symbols-outlined">add_circle</span>
                    Submit another report
                  </button>
                  <a
                    href="/EvaluatorPage"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold px-5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    View evaluator dashboard
                  </a>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 min-w-0">
                      <div className="flex flex-col gap-2 min-w-0">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Case ID</label>
                        <p className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 text-sm font-mono text-primary font-bold truncate min-w-0">
                          {caseId}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 min-w-0 overflow-hidden">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Date & Time</label>
                        <div className="flex gap-2 min-w-0">
                          <input
                            type="date"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary"
                          />
                          <input
                            type="time"
                            value={reportTime}
                            onChange={(e) => setReportTime(e.target.value)}
                            className="shrink-0 w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Incident Category
                      </label>
                      <div className="relative">
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
                        >
                          {CATEGORIES.map((opt) => (
                            <option key={opt.value || "empty"} value={opt.value} disabled={!opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          expand_more
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Detailed Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent min-h-[120px] resize-none"
                        placeholder="Provide details about what happened, time of day, and any identifying marks or vehicles..."
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Evidence / Photos
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_TYPES}
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        <span className="material-symbols-outlined text-4xl text-primary mb-2">cloud_upload</span>
                        <p className="font-medium">Click or drag to upload photos</p>
                        <p className="text-xs text-slate-500 mt-1">
                          PNG, JPG, WebP, or MP4 up to {MAX_FILE_SIZE_MB}MB (max 5 files)
                        </p>
                      </div>
                      {files.length > 0 && (
                        <ul className="space-y-1 mt-2">
                          {files.map((f, i) => (
                            <li key={i} className="flex items-center justify-between text-sm bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
                              <span className="truncate">{f.name}</span>
                              <button type="button" onClick={() => removeFile(i)} className="text-red-500 hover:text-red-700">
                                <span className="material-symbols-outlined text-lg">close</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {submitStatus === "error" && (
                      <p className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                        {submitMessage}
                      </p>
                    )}

                    <button
                      className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-lg disabled:opacity-60"
                      type="submit"
                      disabled={submitting}
                    >
                      <span className="material-symbols-outlined">
                        {submitting ? "hourglass_empty" : "security"}
                      </span>
                      {submitting ? "Submitting…" : "Submit Anonymously"}
                    </button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-3 space-y-6 min-w-0">
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm min-w-0">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">location_on</span>
                      Incident Location
                    </h3>
                    {incidentLocation ? (
                      <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Selected
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Search, tap map, or use location
                      </span>
                    )}
                  </div>
                  <div className="p-4 w-full min-w-0">
                    <IncidentLocationMap
                      value={incidentLocation}
                      onChange={setIncidentLocation}
                    />
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
                    {incidentLocation ? (
                      <>
                        <p className="text-sm font-medium">
                          {incidentLocation.address ?? "Selected spot on map"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Coordinates: {incidentLocation.latitude.toFixed(4)}° N, {incidentLocation.longitude.toFixed(4)}° W
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Use the search box, <strong>Use current location</strong>, or click on the map to set where the incident occurred.
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recent Submission</p>
                      <p className="text-lg font-bold text-primary">{submittedReport?.caseId ?? caseId}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300">receipt_long</span>
                  </div>
                  <div className="space-y-6 relative">
                    <div className="absolute left-4 top-1 bottom-1 w-0.5 bg-slate-200 dark:bg-slate-800" />
                    <div className="relative flex items-center gap-4">
                      <div className={`z-10 size-8 rounded-full flex items-center justify-center shrink-0 ${submittedReport ? "bg-primary text-white ring-4 ring-primary/20" : "bg-slate-200 dark:bg-slate-800 text-slate-400"}`}>
                        <span className="material-symbols-outlined text-sm">check</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Received</p>
                        <p className="text-xs text-slate-500">{submittedReport ? "On submit" : "Submit to start"}</p>
                      </div>
                    </div>
                    <div className="relative flex items-center gap-4">
                      <div className={`z-10 size-8 rounded-full flex items-center justify-center shrink-0 ${geminiEvaluation ? "bg-primary text-white ring-4 ring-primary/20" : "bg-slate-200 dark:bg-slate-800 text-slate-400"}`}>
                        <span className="material-symbols-outlined text-sm">visibility</span>
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${geminiEvaluation ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}`}>Reviewing</p>
                        <p className="text-xs text-slate-500">{geminiEvaluation ? "Reviewed by AI" : "Pending"}</p>
                      </div>
                    </div>
                    <div className="relative flex items-center gap-4">
                      <div className={`z-10 size-8 rounded-full flex items-center justify-center shrink-0 ${geminiEvaluation && !geminiEvaluation.needs_review ? "bg-primary text-white ring-4 ring-primary/20" : "bg-slate-200 dark:bg-slate-800 text-slate-400"}`}>
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${geminiEvaluation && !geminiEvaluation.needs_review ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}`}>Verified</p>
                        <p className="text-xs text-slate-500">
                          {geminiEvaluation ? (geminiEvaluation.needs_review ? "Flagged by AI" : "Cleared by AI") : "Pending"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <footer className="border-t border-slate-200 dark:border-slate-800 py-8 px-10 text-center">
          <p className="text-slate-500 text-sm">
            © 2024 SafeCity Community Initiative. All reports are encrypted and anonymous.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default IncidentReportPage;
