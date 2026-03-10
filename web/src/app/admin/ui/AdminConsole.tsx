"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type JobRecord = {
  id: string;
  type: string;
  args: Record<string, unknown>;
  status: "queued" | "running" | "success" | "error";
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
  logTail?: string;
};

type ScriptRow = {
  id: number;
  category: string;
  scene: string | null;
  script_type: string | null;
  hook: string;
  script: string;
  cta: string;
  visual_direction: string;
  target_url: string;
  status: string;
  created_at: string;
};

const SCENE_LABELS: Record<string, string> = {
  home_office: "Home Office",
  neighborhood_walk: "Neighborhood Walk",
  living_room: "Living Room",
  kitchen_morning: "Kitchen Morning",
  backyard_garden: "Backyard Garden",
  coffee_shop: "Coffee Shop",
};

type VideoRow = {
  id: number;
  content_id: number;
  video_path: string | null;
  thumbnail_path: string | null;
  duration_seconds: number;
  status: string;
  created_at: string;
  hook: string;
  script: string;
  cta: string;
  category: string;
};

type InstagramPostRow = {
  id: number;
  video_id: number;
  instagram_media_id: string | null;
  caption: string | null;
  hashtags: string | null;
  posted_at: string | null;
  content_id: number;
  hook: string;
  category: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: "bg-green-900/50 text-green-300 border-green-800",
    completed: "bg-green-900/50 text-green-300 border-green-800",
    script_approved: "bg-green-900/50 text-green-300 border-green-800",
    video_approved: "bg-green-900/50 text-green-300 border-green-800",
    error: "bg-red-900/50 text-red-300 border-red-800",
    failed: "bg-red-900/50 text-red-300 border-red-800",
    running: "bg-yellow-900/50 text-yellow-300 border-yellow-800",
    video_generating: "bg-yellow-900/50 text-yellow-300 border-yellow-800",
    posting: "bg-yellow-900/50 text-yellow-300 border-yellow-800",
    script_draft: "bg-blue-900/50 text-blue-300 border-blue-800",
    video_ready: "bg-blue-900/50 text-blue-300 border-blue-800",
    posted_instagram: "bg-purple-900/50 text-purple-300 border-purple-800",
    posted_youtube: "bg-purple-900/50 text-purple-300 border-purple-800",
    queued: "bg-gray-800 text-gray-300 border-gray-700",
    idea: "bg-gray-800 text-gray-300 border-gray-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${colors[status] ?? colors.queued}`}
    >
      {status === "running" && <Spinner className="h-3 w-3" />}
      {status}
    </span>
  );
}

function useAdminToken() {
  const [token, setToken] = useState<string>("");
  useEffect(() => {
    const saved = window.localStorage.getItem("thinksy_admin_token") || "";
    setToken(saved);
  }, []);
  const save = (t: string) => {
    setToken(t);
    window.localStorage.setItem("thinksy_admin_token", t);
  };
  return { token, save };
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function AdminConsole() {
  const { token, save } = useAdminToken();
  const headers = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["x-admin-token"] = token;
    return h;
  }, [token]);

  /* ---- job state ---- */
  const [job, setJob] = useState<JobRecord | null>(null);
  const [jobType, setJobType] = useState<string>("");
  const [jobError, setJobError] = useState<string>("");
  const prevJobStatusRef = useRef<string>("");
  const [showJobLog, setShowJobLog] = useState(false);

  /* ---- data errors ---- */
  const [dataError, setDataError] = useState<string>("");
  const [videoError, setVideoError] = useState<string>("");

  /* ---- generation form ---- */
  const [count, setCount] = useState<number>(3);
  const [category, setCategory] = useState<string>("hr");

  /* ---- data lists ---- */
  const [scripts, setScripts] = useState<ScriptRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [igPosts, setIgPosts] = useState<InstagramPostRow[]>([]);
  const [scriptFilter, setScriptFilter] = useState<
    "all" | "script_draft" | "script_approved" | "video_generating" | "video_ready" | "video_approved" | "completed" | "failed"
  >("script_draft");
  const [videoFilter, setVideoFilter] = useState<
    "all" | "video_ready" | "video_approved" | "failed" | "video_generating"
  >("video_ready");

  /* ---- script review ---- */
  const [selectedScript, setSelectedScript] = useState<ScriptRow | null>(null);
  const [editHook, setEditHook] = useState<string>("");
  const [editScript, setEditScript] = useState<string>("");
  const [editCta, setEditCta] = useState<string>("");
  const [scriptActionInFlight, setScriptActionInFlight] = useState(false);
  const [importHeygenId, setImportHeygenId] = useState<string>("");
  const [importLocalPath, setImportLocalPath] = useState<string>("");
  const [importInFlight, setImportInFlight] = useState(false);
  const [importError, setImportError] = useState<string>("");
  const [importSuccess, setImportSuccess] = useState<string>("");

  /* ---- instagram / partnerstack ---- */
  const [igInsights, setIgInsights] = useState<Record<string, unknown> | null>(null);
  const [psActions, setPsActions] = useState<Record<string, unknown> | null>(null);
  const [psTransactions, setPsTransactions] = useState<Record<string, unknown> | null>(null);
  const [psRewards, setPsRewards] = useState<Record<string, unknown> | null>(null);

  /* ---- derived ---- */
  const isGeneratingScripts = !!job && jobType === "scripts_generate" && (job.status === "running" || job.status === "queued");
  const isProducingVideos = !!job && jobType === "videos_produce" && (job.status === "running" || job.status === "queued");
  const jobIsActive = !!job && (job.status === "running" || job.status === "queued");

  /* ================================================================ */
  /*  Data loaders                                                    */
  /* ================================================================ */

  const loadScripts = useCallback(async () => {
    setDataError("");
    const q = scriptFilter === "all" ? "" : `?status=${scriptFilter}`;
    const resp = await fetch(`/api/admin/scripts${q}`, { headers });
    if (!resp.ok) {
      const msg = await resp.text().catch(() => "Failed to load scripts");
      setDataError(`Scripts load failed (${resp.status}): ${msg}`);
      setScripts([]);
      return;
    }
    const json = (await resp.json().catch(() => null)) as
      | { scripts?: ScriptRow[] }
      | null;
    const next = json?.scripts || [];
    setScripts(next);

    // If the currently selected script is no longer in the list, auto-advance
    setSelectedScript((prev) => {
      if (!prev) {
        // Auto-select first if nothing selected
        const first = next[0] ?? null;
        if (first) {
          setEditHook(first.hook);
          setEditScript(first.script);
          setEditCta(first.cta);
        }
        return first;
      }
      const stillPresent = next.find((s) => s.id === prev.id);
      if (stillPresent) return stillPresent;
      // Previous selection gone — pick the first remaining
      const first = next[0] ?? null;
      if (first) {
        setEditHook(first.hook);
        setEditScript(first.script);
        setEditCta(first.cta);
      }
      return first;
    });
  }, [headers, scriptFilter]);

  const loadVideos = useCallback(async () => {
    setVideoError("");
    const q = videoFilter === "all" ? "" : `?status=${videoFilter}`;
    const resp = await fetch(`/api/admin/videos${q}`, { headers });
    if (!resp.ok) {
      const msg = await resp.text().catch(() => "Failed to load videos");
      setVideoError(`Videos load failed (${resp.status}): ${msg}`);
      setVideos([]);
      return;
    }
    const json = (await resp.json().catch(() => null)) as
      | { videos?: VideoRow[] }
      | null;
    setVideos(json?.videos || []);
  }, [headers, videoFilter]);

  const loadIgPosts = useCallback(async () => {
    const resp = await fetch("/api/admin/instagram/posts", { headers });
    const json = (await resp.json().catch(() => null)) as
      | { posts?: InstagramPostRow[] }
      | null;
    setIgPosts(json?.posts || []);
  }, [headers]);

  /* ================================================================ */
  /*  Job management                                                  */
  /* ================================================================ */

  const start = useCallback(
    async (type: string, args: Record<string, unknown>) => {
      setJobError("");
      setJobType(type);
      setShowJobLog(true);
      const resp = await fetch("/api/jobs", {
        method: "POST",
        headers,
        body: JSON.stringify({ type, args }),
      });
      const json = (await resp.json().catch(() => null)) as unknown;
      if (!resp.ok) {
        setJobError(typeof json === "object" ? JSON.stringify(json) : "Job failed");
        return;
      }
      setJob(json as JobRecord);
    },
    [headers],
  );

  const refreshJob = useCallback(
    async (id: string) => {
      const resp = await fetch(`/api/jobs/${id}`, { headers });
      if (!resp.ok) return;
      const json = (await resp.json()) as JobRecord;
      setJob(json);
    },
    [headers],
  );

  /* ================================================================ */
  /*  Script + Video actions                                          */
  /* ================================================================ */

  function selectScript(s: ScriptRow) {
    setSelectedScript(s);
    setEditHook(s.hook);
    setEditScript(s.script);
    setEditCta(s.cta);
  }

  async function setScriptStatus(id: number, status: string) {
    setScriptActionInFlight(true);
    try {
      await fetch(`/api/admin/scripts/${id}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "set_status", status, approvedBy: "web" }),
      });

      // Optimistically remove from local list and auto-advance
      setScripts((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        const next = prev.filter((s) => s.id !== id);

        if (selectedScript?.id === id) {
          // Pick the item that was at the same position, or the one before it
          const nextIdx = Math.min(idx, next.length - 1);
          const nextScript = next[nextIdx] ?? null;
          setSelectedScript(nextScript);
          if (nextScript) {
            setEditHook(nextScript.hook);
            setEditScript(nextScript.script);
            setEditCta(nextScript.cta);
          }
        }
        return next;
      });
    } finally {
      setScriptActionInFlight(false);
    }
  }

  async function approveAllScripts() {
    setScriptActionInFlight(true);
    try {
      await Promise.all(
        scripts.map((s) =>
          fetch(`/api/admin/scripts/${s.id}`, {
            method: "POST",
            headers,
            body: JSON.stringify({ action: "set_status", status: "script_approved", approvedBy: "web" }),
          }),
        ),
      );
      setScripts([]);
      setSelectedScript(null);
    } finally {
      setScriptActionInFlight(false);
    }
  }

  async function patchScript(id: number) {
    setScriptActionInFlight(true);
    try {
      await fetch(`/api/admin/scripts/${id}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "patch",
          patch: { hook: editHook, script: editScript, cta: editCta },
        }),
      });
      // Update local state with the edited values
      setScripts((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, hook: editHook, script: editScript, cta: editCta } : s,
        ),
      );
      setSelectedScript((prev) =>
        prev && prev.id === id
          ? { ...prev, hook: editHook, script: editScript, cta: editCta }
          : prev,
      );
    } finally {
      setScriptActionInFlight(false);
    }
  }

  async function importVideo(contentId: number) {
    setImportInFlight(true);
    setImportError("");
    setImportSuccess("");
    try {
      const body: Record<string, unknown> = { contentId };
      if (importHeygenId) body.heygenVideoId = importHeygenId;
      else if (importLocalPath) body.localPath = importLocalPath;
      else {
        setImportError("Enter a HeyGen Video ID or a local file path.");
        return;
      }
      const resp = await fetch("/api/admin/videos/import", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const json = (await resp.json().catch(() => null)) as { ok?: boolean; videoId?: number; error?: string } | null;
      if (!resp.ok || !json?.ok) {
        setImportError(json?.error || `Import failed (${resp.status})`);
        return;
      }
      setImportSuccess(`Video #${json.videoId} imported — moved to video_ready`);
      setImportHeygenId("");
      setImportLocalPath("");
      void loadVideos();
      void loadScripts();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportInFlight(false);
    }
  }

  async function setVideoStatus(videoId: number, contentId: number, status: string) {
    await fetch(`/api/admin/videos/${videoId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "set_status", status, contentId }),
    });
    // Optimistically remove
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
  }

  async function fetchIgInsights(mediaId: string) {
    setIgInsights(null);
    const resp = await fetch(`/api/admin/instagram/insights/${mediaId}`, { headers });
    const json = (await resp.json().catch(() => ({ error: "Invalid JSON" }))) as Record<
      string,
      unknown
    >;
    setIgInsights(json);
  }

  async function deleteIgPost(id: number, deleteFromInstagram: boolean) {
    if (
      !confirm(
        deleteFromInstagram
          ? "Delete this post from Instagram AND the database?"
          : "Remove this post from the database? (Instagram post will remain)"
      )
    )
      return;
    const resp = await fetch("/api/admin/instagram/posts", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ id, deleteFromInstagram }),
    });
    const json = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
    if (json.deleted) {
      setIgPosts((prev) => prev.filter((p) => p.id !== id));
      if (json.instagramError) {
        alert(`Removed from DB. Instagram delete failed: ${json.instagramError}`);
      }
    } else {
      alert(`Delete failed: ${json.error || "Unknown error"}`);
    }
  }

  async function fetchPartnerStack(resource: string) {
    const resp = await fetch(`/api/partnerstack/${resource}?limit=50`, {
      cache: "no-store",
    });
    const json = (await resp.json().catch(() => ({ error: "Invalid JSON" }))) as Record<
      string,
      unknown
    >;
    if (resource === "actions") setPsActions(json);
    if (resource === "transactions") setPsTransactions(json);
    if (resource === "rewards") setPsRewards(json);
  }

  /* ================================================================ */
  /*  Effects                                                         */
  /* ================================================================ */

  // Initial data load
  useEffect(() => {
    void loadScripts();
    void loadVideos();
    void loadIgPosts();
  }, [loadIgPosts, loadScripts, loadVideos]);

  // Poll active jobs
  useEffect(() => {
    if (!job || !job.id) return;
    if (job.status === "success" || job.status === "error") return;
    const t = window.setInterval(() => void refreshJob(job.id), 2000);
    return () => window.clearInterval(t);
  }, [job, refreshJob]);

  // Auto-refresh data when a job completes
  useEffect(() => {
    if (!job) return;
    const prev = prevJobStatusRef.current;
    prevJobStatusRef.current = job.status;

    // Detect transition to terminal state
    if ((prev === "running" || prev === "queued") && job.status === "success") {
      if (jobType === "scripts_generate") void loadScripts();
      if (jobType === "videos_produce") void loadVideos();
      if (jobType === "post") {
        void loadVideos();
        void loadIgPosts();
      }
    }
  }, [job, jobType, loadScripts, loadVideos, loadIgPosts]);

  /* ================================================================ */
  /*  Render                                                          */
  /* ================================================================ */

  return (
    <div className="space-y-8">
      {/* ---------------------------------------------------------- */}
      {/*  Access token                                               */}
      {/* ---------------------------------------------------------- */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white">Access</h2>
        <p className="text-gray-400 text-sm mt-1">
          If you set <code className="text-gray-300">THINKSY_ADMIN_TOKEN</code>, paste it here so the console can call
          admin endpoints.
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            value={token}
            onChange={(e) => save(e.target.value)}
            placeholder="Admin token (optional)"
            className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
          />
          <button
            onClick={() => save("")}
            className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-4 py-2 rounded-lg text-sm"
          >
            Clear
          </button>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/*  Run Stages                                                 */}
      {/* ---------------------------------------------------------- */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white">Run Stages</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
          {/* Generate scripts */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-white">1) Generate Scripts</h3>
            <div className="mt-3 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  type="number"
                  min={1}
                  max={20}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 w-full sm:w-32"
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                >
                  <option value="hr">HR</option>
                  <option value="accounting">Accounting</option>
                  <option value="project_management">Project Management</option>
                </select>
              </div>
              <button
                disabled={isGeneratingScripts}
                onClick={() =>
                  void start("scripts_generate", {
                    instruction: `${category} software`,
                    count,
                    category,
                  })
                }
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                {isGeneratingScripts ? (
                  <>
                    <Spinner />
                    Generating {count} scripts…
                  </>
                ) : (
                  "Generate Scripts"
                )}
              </button>
            </div>
          </div>

          {/* Produce videos */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-white">2) Produce Videos</h3>
            <p className="text-gray-400 text-sm mt-2">
              Produces videos for approved scripts and leaves them as <code className="text-gray-300">video_ready</code>{" "}
              for review.
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <button
                disabled={isProducingVideos}
                onClick={() => void start("videos_produce", { limit: 1 })}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                {isProducingVideos ? <Spinner /> : null}
                Produce 1
              </button>
              <button
                disabled={isProducingVideos}
                onClick={() => void start("videos_produce", { limit: 5 })}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                {isProducingVideos ? <Spinner /> : null}
                Produce 5
              </button>
              <button
                disabled={isProducingVideos}
                onClick={() => void start("videos_produce", { limit: 20 })}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Produce 20
              </button>
              <button
                disabled={isProducingVideos}
                onClick={() => void start("videos_produce", {})}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-100 px-4 py-2 rounded-lg text-sm"
              >
                Produce All
              </button>
            </div>
          </div>

          {/* Post */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-white">3) Post Approved Videos</h3>
            <p className="text-gray-400 text-sm mt-2">
              Posts <code className="text-gray-300">video_approved</code> videos to Instagram + YouTube.
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <button
                disabled={jobIsActive}
                onClick={() => void start("post", { platform: "both" })}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Post Both
              </button>
              <button
                disabled={jobIsActive}
                onClick={() => void start("post", { platform: "instagram" })}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-100 px-4 py-2 rounded-lg text-sm"
              >
                Instagram Only
              </button>
              <button
                disabled={jobIsActive}
                onClick={() => void start("post", { platform: "youtube" })}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-100 px-4 py-2 rounded-lg text-sm"
              >
                YouTube Only
              </button>
            </div>
          </div>

          {/* SEO */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-white">4) Frontend / SEO</h3>
            <div className="mt-3 flex gap-2 flex-wrap">
              <button
                disabled={jobIsActive}
                onClick={() => void start("seo_update", {})}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-100 px-4 py-2 rounded-lg text-sm"
              >
                Run seo_update
              </button>
              <button
                disabled={jobIsActive}
                onClick={() => void start("geo", { cities: 20 })}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-100 px-4 py-2 rounded-lg text-sm"
              >
                Generate Geo Pages
              </button>
            </div>
          </div>
        </div>

        {/* Job output — collapsible */}
        <div className="mt-5">
          {jobError && (
            <pre className="mb-3 bg-red-950/40 border border-red-900 text-red-200 rounded-lg p-3 text-xs overflow-auto">
              {jobError}
            </pre>
          )}
          {job ? (
            <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowJobLog((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-900/50 transition-colors"
              >
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <StatusPill status={job.status} />
                  <span className="text-gray-500 font-mono text-xs">{job.type}</span>
                </div>
                <svg
                  className={`h-4 w-4 text-gray-500 transition-transform ${showJobLog ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showJobLog && (
                <div className="px-4 pb-4">
                  <pre className="bg-black/30 border border-gray-800 rounded-lg p-3 text-xs overflow-auto max-h-[240px] whitespace-pre-wrap">
                    {job.logTail || "(no output yet)"}
                  </pre>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/*  Data errors                                                */}
      {/* ---------------------------------------------------------- */}
      {dataError && (
        <section className="bg-red-950/30 border border-red-900 rounded-xl p-4">
          <h2 className="text-red-200 font-semibold">Data Load Error</h2>
          <p className="text-red-300 text-sm mt-2 whitespace-pre-wrap">{dataError}</p>
        </section>
      )}

      {/* ---------------------------------------------------------- */}
      {/*  Script Review                                              */}
      {/* ---------------------------------------------------------- */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Script Review</h2>
            {scripts.length > 0 && (
              <span className="bg-blue-600/20 text-blue-300 text-xs font-medium px-2.5 py-1 rounded-full border border-blue-800">
                {scripts.length} draft{scripts.length !== 1 ? "s" : ""}
              </span>
            )}
            {isGeneratingScripts && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-300 bg-yellow-900/30 border border-yellow-800 px-2.5 py-1 rounded-full">
                <Spinner className="h-3 w-3" />
                Generating…
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <select
              value={scriptFilter}
              onChange={(e) => setScriptFilter(e.target.value as typeof scriptFilter)}
              className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
            >
              <option value="all">all</option>
              <option value="script_draft">script_draft</option>
              <option value="script_approved">script_approved</option>
              <option value="video_generating">video_generating</option>
              <option value="video_ready">video_ready</option>
              <option value="video_approved">video_approved</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
            </select>
            {scripts.length > 1 && (
              <button
                disabled={scriptActionInFlight}
                onClick={() => void approveAllScripts()}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium"
              >
                Approve All ({scripts.length})
              </button>
            )}
            <button
              onClick={() => void loadScripts()}
              className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-2 rounded-lg text-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        {scripts.length === 0 && !isGeneratingScripts ? (
          <p className="text-gray-500 text-sm mt-4">{`No scripts matching "${scriptFilter}".`}</p>
        ) : scripts.length === 0 && isGeneratingScripts ? (
          <div className="mt-6 flex flex-col items-center justify-center py-12 text-center">
            <Spinner className="h-8 w-8 text-blue-400 mb-4" />
            <p className="text-gray-300 font-medium">Generating {count} scripts…</p>
            <p className="text-gray-500 text-sm mt-1">
              Scripts will appear here automatically when ready.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Script list */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {scripts.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => selectScript(s)}
                  className={
                    "w-full text-left bg-gray-950 border rounded-xl p-4 hover:border-blue-600 transition-colors " +
                    (selectedScript?.id === s.id
                      ? "border-blue-500 ring-1 ring-blue-500/30"
                      : "border-gray-800")
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs font-mono">{i + 1}.</span>
                      <span className="text-sm text-gray-300 font-medium">
                        #{s.id} · {s.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.scene ? (
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-gray-800 text-gray-300 border-gray-700">
                          {SCENE_LABELS[s.scene] ?? s.scene}
                        </span>
                      ) : null}
                      <StatusPill status={s.status} />
                      <div className="text-xs text-gray-600">
                        {new Date(s.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm mt-2 line-clamp-2">{s.hook}</div>
                </button>
              ))}
            </div>

            {/* Script detail / edit panel */}
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 lg:sticky lg:top-4 self-start">
              {selectedScript ? (
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-gray-800">
                    <div className="text-white font-semibold">
                      Script #{selectedScript.id}
                      <span className="text-gray-500 font-normal text-sm ml-2">{selectedScript.category}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={scriptActionInFlight}
                        onClick={() => void setScriptStatus(selectedScript.id, "script_approved")}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        {scriptActionInFlight ? <Spinner /> : "Approve"}
                      </button>
                      <button
                        disabled={scriptActionInFlight}
                        onClick={() => void setScriptStatus(selectedScript.id, "failed")}
                        className="bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        disabled={scriptActionInFlight || isProducingVideos}
                        onClick={() => void start("videos_produce", { contentId: selectedScript.id })}
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                      >
                        {isProducingVideos ? <Spinner /> : "Produce Video"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Scene</span>
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-gray-800 text-gray-300 border-gray-700">
                      {selectedScript.scene
                        ? (SCENE_LABELS[selectedScript.scene] ?? selectedScript.scene)
                        : "Home Office"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Hook</label>
                      <textarea
                        value={editHook}
                        onChange={(e) => setEditHook(e.target.value)}
                        rows={2}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 outline-none resize-y"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Script</label>
                      <textarea
                        value={editScript}
                        onChange={(e) => setEditScript(e.target.value)}
                        rows={7}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 outline-none resize-y"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">CTA</label>
                      <textarea
                        value={editCta}
                        onChange={(e) => setEditCta(e.target.value)}
                        rows={2}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 outline-none resize-y"
                      />
                    </div>
                    <button
                      disabled={scriptActionInFlight}
                      onClick={() => void patchScript(selectedScript.id)}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Save Edits
                    </button>

                    {/* Import Video */}
                    <div className="mt-6 pt-4 border-t border-gray-800">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">Import Video</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">HeyGen Video ID</label>
                          <input
                            value={importHeygenId}
                            onChange={(e) => setImportHeygenId(e.target.value)}
                            placeholder="e.g. abc123def456"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-gray-700" />
                          <span className="text-xs text-gray-500">or</span>
                          <div className="flex-1 h-px bg-gray-700" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">Local File Path</label>
                          <input
                            value={importLocalPath}
                            onChange={(e) => setImportLocalPath(e.target.value)}
                            placeholder="e.g. ./data/videos/my_edit.mp4"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 outline-none"
                          />
                        </div>
                        {importError && (
                          <p className="text-red-300 text-xs">{importError}</p>
                        )}
                        {importSuccess && (
                          <p className="text-green-300 text-xs">{importSuccess}</p>
                        )}
                        <button
                          disabled={importInFlight || (!importHeygenId && !importLocalPath)}
                          onClick={() => void importVideo(selectedScript.id)}
                          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                        >
                          {importInFlight ? <Spinner /> : null}
                          {importInFlight ? "Importing…" : "Import Video"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <svg className="h-10 w-10 text-gray-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="text-gray-500 text-sm">Select a script to review.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------- */}
      {/*  Video Review                                               */}
      {/* ---------------------------------------------------------- */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Video Review</h2>
            {videos.length > 0 && (
              <span className="bg-blue-600/20 text-blue-300 text-xs font-medium px-2.5 py-1 rounded-full border border-blue-800">
                {videos.length}
              </span>
            )}
            {isProducingVideos && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-300 bg-yellow-900/30 border border-yellow-800 px-2.5 py-1 rounded-full">
                <Spinner className="h-3 w-3" />
                Producing…
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <select
              value={videoFilter}
              onChange={(e) => setVideoFilter(e.target.value as typeof videoFilter)}
              className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
            >
              <option value="video_ready">video_ready</option>
              <option value="video_approved">video_approved</option>
              <option value="failed">failed</option>
              <option value="video_generating">video_generating</option>
              <option value="all">all</option>
            </select>
            <button
              onClick={() => void loadVideos()}
              className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-2 rounded-lg text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
        {videoError && (
          <p className="text-red-300 text-sm mt-3 whitespace-pre-wrap">{videoError}</p>
        )}
        {videos.length === 0 ? (
          <p className="text-gray-500 text-sm mt-4">
            {isProducingVideos
              ? "Videos will appear here once production completes."
              : `No videos matching "${videoFilter}".`}
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {videos.slice(0, 10).map((v) => (
              <div
                key={v.id}
                className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden"
              >
                <div className="p-4 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-white font-semibold">
                      Video #{v.id} · content #{v.content_id}
                    </div>
                    <div className="text-gray-400 text-sm line-clamp-1 mt-1">
                      {v.hook}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void setVideoStatus(v.id, v.content_id, "video_approved")}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => void setVideoStatus(v.id, v.content_id, "failed")}
                      className="bg-red-600/80 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm"
                    >
                      Reject
                    </button>
                  </div>
                </div>
                <div className="aspect-[9/16] bg-black">
                  <video
                    src={`/media/videos/content_${v.content_id}.mp4`}
                    controls
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------- */}
      {/*  Instagram Posts                                            */}
      {/* ---------------------------------------------------------- */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-bold text-white">Instagram Posts</h2>
          <button
            onClick={() => void loadIgPosts()}
            className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-2 rounded-lg text-sm"
          >
            Refresh
          </button>
        </div>

        {igPosts.length === 0 ? (
          <p className="text-gray-500 text-sm mt-4">No Instagram posts yet.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="space-y-3">
              {igPosts.slice(0, 25).map((p) => (
                <div
                  key={p.id}
                  className="bg-gray-950 border border-gray-800 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white font-semibold">Post #{p.id}</div>
                    <div className="text-xs text-gray-500">
                      {p.posted_at ? new Date(p.posted_at).toLocaleString() : ""}
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm mt-2 line-clamp-2">
                    {p.hook}
                  </div>
                  <div className="text-gray-500 text-xs mt-2">
                    media_id: {p.instagram_media_id || "(missing)"}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() =>
                        p.instagram_media_id
                          ? void fetchIgInsights(p.instagram_media_id)
                          : null
                      }
                      disabled={!p.instagram_media_id}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
                    >
                      Load Insights
                    </button>
                    <a
                      href={`/videos/${p.video_id}`}
                      className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-2 rounded-lg text-sm"
                    >
                      View Video Page
                    </a>
                    <button
                      onClick={() => void deleteIgPost(p.id, true)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm"
                    >
                      Delete from IG & DB
                    </button>
                    <button
                      onClick={() => void deleteIgPost(p.id, false)}
                      className="bg-red-900 hover:bg-red-800 text-red-200 px-3 py-2 rounded-lg text-sm"
                    >
                      Remove from DB
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
              <h3 className="font-semibold text-white">Insights</h3>
              {igInsights ? (
                (() => {
                  const data = Array.isArray((igInsights as Record<string, unknown>).data)
                    ? ((igInsights as Record<string, unknown>).data as Array<Record<string, unknown>>)
                    : null;
                  if (!data) {
                    return (
                      <pre className="mt-3 bg-black/30 border border-gray-800 rounded-lg p-3 text-xs overflow-auto max-h-[360px] whitespace-pre-wrap">
                        {JSON.stringify(igInsights, null, 2)}
                      </pre>
                    );
                  }
                  return (
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      {data.map((metric) => {
                        const name = String(metric.name || "");
                        const values = Array.isArray(metric.values) ? metric.values as Array<Record<string, unknown>> : [];
                        const value = values.length > 0 ? values[0].value : "—";
                        const labels: Record<string, string> = {
                          views: "Views",
                          reach: "Reach",
                          total_interactions: "Interactions",
                          likes: "Likes",
                          comments: "Comments",
                          shares: "Shares",
                          saved: "Saves",
                        };
                        return (
                          <div
                            key={name}
                            className="bg-black/30 border border-gray-800 rounded-lg p-3 text-center"
                          >
                            <div className="text-2xl font-bold text-white">{String(value)}</div>
                            <div className="text-xs text-gray-400 mt-1">{labels[name] || name}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <p className="text-gray-500 text-sm mt-3">Select a post and click Load Insights.</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------- */}
      {/*  PartnerStack                                               */}
      {/* ---------------------------------------------------------- */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-bold text-white">PartnerStack</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => void fetchPartnerStack("actions")}
              className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-2 rounded-lg text-sm"
            >
              Fetch Actions
            </button>
            <button
              onClick={() => void fetchPartnerStack("transactions")}
              className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-2 rounded-lg text-sm"
            >
              Fetch Transactions
            </button>
            <button
              onClick={() => void fetchPartnerStack("rewards")}
              className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-2 rounded-lg text-sm"
            >
              Fetch Rewards
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-white">Actions</h3>
            <pre className="mt-3 bg-black/30 border border-gray-800 rounded-lg p-3 text-xs overflow-auto max-h-[240px] whitespace-pre-wrap">
              {psActions ? JSON.stringify(psActions, null, 2) : "(not loaded)"}
            </pre>
          </div>
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-white">Transactions</h3>
            <pre className="mt-3 bg-black/30 border border-gray-800 rounded-lg p-3 text-xs overflow-auto max-h-[240px] whitespace-pre-wrap">
              {psTransactions
                ? JSON.stringify(psTransactions, null, 2)
                : "(not loaded)"}
            </pre>
          </div>
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-white">Rewards</h3>
            <pre className="mt-3 bg-black/30 border border-gray-800 rounded-lg p-3 text-xs overflow-auto max-h-[240px] whitespace-pre-wrap">
              {psRewards ? JSON.stringify(psRewards, null, 2) : "(not loaded)"}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
