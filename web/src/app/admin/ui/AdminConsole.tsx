"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  script_type: string | null;
  hook: string;
  script: string;
  cta: string;
  visual_direction: string;
  target_url: string;
  status: string;
  created_at: string;
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

export default function AdminConsole() {
  const { token, save } = useAdminToken();
  const headers = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["x-admin-token"] = token;
    return h;
  }, [token]);

  const [job, setJob] = useState<JobRecord | null>(null);
  const [jobError, setJobError] = useState<string>("");
  const [dataError, setDataError] = useState<string>("");
  const [videoError, setVideoError] = useState<string>("");

  const [instruction, setInstruction] = useState<string>("");
  const [count, setCount] = useState<number>(3);
  const [category, setCategory] = useState<string>("");

  const [scripts, setScripts] = useState<ScriptRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [igPosts, setIgPosts] = useState<InstagramPostRow[]>([]);
  const [videoFilter, setVideoFilter] = useState<
    "all" | "video_ready" | "video_approved" | "failed" | "video_generating"
  >("video_ready");

  const [selectedScript, setSelectedScript] = useState<ScriptRow | null>(null);
  const [editHook, setEditHook] = useState<string>("");
  const [editScript, setEditScript] = useState<string>("");
  const [editCta, setEditCta] = useState<string>("");

  const [igInsights, setIgInsights] = useState<Record<string, unknown> | null>(null);
  const [psActions, setPsActions] = useState<Record<string, unknown> | null>(null);
  const [psTransactions, setPsTransactions] = useState<Record<string, unknown> | null>(null);
  const [psRewards, setPsRewards] = useState<Record<string, unknown> | null>(null);

  const start = useCallback(async (type: string, args: Record<string, unknown>) => {
    setJobError("");
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
  }, [headers]);

  const refreshJob = useCallback(async (id: string) => {
    const resp = await fetch(`/api/jobs/${id}`, { headers });
    if (!resp.ok) return;
    const json = (await resp.json()) as JobRecord;
    setJob(json);
  }, [headers]);

  const loadScripts = useCallback(async () => {
    setDataError("");
    const resp = await fetch("/api/admin/scripts?status=script_draft", { headers });
    if (!resp.ok) {
      const msg = await resp.text().catch(() => "Failed to load scripts");
      setDataError(`Scripts load failed (${resp.status}): ${msg}`);
      setScripts([]);
      return;
    }
    const json = (await resp.json().catch(() => null)) as
      | { scripts?: ScriptRow[] }
      | null;
    setScripts(json?.scripts || []);
  }, [headers]);

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

  async function setScriptStatus(id: number, status: string) {
    await fetch(`/api/admin/scripts/${id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "set_status", status, approvedBy: "web" }),
    });
    await loadScripts();
  }

  async function patchScript(id: number) {
    await fetch(`/api/admin/scripts/${id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "patch",
        patch: { hook: editHook, script: editScript, cta: editCta },
      }),
    });
    await loadScripts();
  }

  async function setVideoStatus(videoId: number, contentId: number, status: string) {
    await fetch(`/api/admin/videos/${videoId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "set_status", status, contentId }),
    });
    await loadVideos();
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

  useEffect(() => {
    void loadScripts();
    void loadVideos();
    void loadIgPosts();
  }, [loadIgPosts, loadScripts, loadVideos]);

  useEffect(() => {
    if (!job || !job.id) return;
    if (job.status === "success" || job.status === "error") return;
    const t = window.setInterval(() => void refreshJob(job.id), 2000);
    return () => window.clearInterval(t);
  }, [job, refreshJob]);

  return (
    <div className="space-y-10">
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white">Access</h2>
        <p className="text-gray-400 text-sm mt-1">
          If you set `THINKSY_ADMIN_TOKEN`, paste it here so the console can call
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

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-bold text-white">Run Stages</h2>
          <div className="flex gap-2">
            <button
              onClick={() => void loadScripts()}
              className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-2 rounded-lg text-sm"
            >
              Refresh Scripts
            </button>
            <button
              onClick={() => void loadVideos()}
              className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-2 rounded-lg text-sm"
            >
              Refresh Videos
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-white">1) Generate Scripts</h3>
            <div className="mt-3 space-y-3">
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder='Instruction (e.g. "HR software for small businesses")'
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 min-h-[72px]"
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  type="number"
                  min={1}
                  max={20}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 w-full sm:w-32"
                />
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="category (optional: hr, accounting, project_management)"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                />
              </div>
              <button
                onClick={() =>
                  void start("scripts_generate", {
                    instruction,
                    count,
                    category: category || undefined,
                  })
                }
                disabled={!instruction.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Start Script Generation
              </button>
            </div>
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-white">2) Produce Videos</h3>
            <p className="text-gray-400 text-sm mt-2">
              Produces videos for `script_approved` items and leaves them as
              `video_ready` for review.
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <button
                onClick={() => void start("videos_produce", { limit: 5 })}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Produce 5
              </button>
              <button
                onClick={() => void start("videos_produce", { limit: 20 })}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Produce 20
              </button>
              <button
                onClick={() => void start("videos_produce", {})}
                className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-4 py-2 rounded-lg text-sm"
              >
                Produce All
              </button>
            </div>
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-white">3) Post Approved Videos</h3>
            <p className="text-gray-400 text-sm mt-2">
              Posts videos in `video_approved` state to Instagram + YouTube.
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <button
                onClick={() => void start("post", { platform: "both" })}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Post Both
              </button>
              <button
                onClick={() => void start("post", { platform: "instagram" })}
                className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-4 py-2 rounded-lg text-sm"
              >
                Instagram Only
              </button>
              <button
                onClick={() => void start("post", { platform: "youtube" })}
                className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-4 py-2 rounded-lg text-sm"
              >
                YouTube Only
              </button>
            </div>
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-white">4) Frontend / SEO</h3>
            <div className="mt-3 flex gap-2 flex-wrap">
              <button
                onClick={() => void start("seo_update", {})}
                className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-4 py-2 rounded-lg text-sm"
              >
                Run `seo_update`
              </button>
              <button
                onClick={() => void start("geo", { cities: 20 })}
                className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-4 py-2 rounded-lg text-sm"
              >
                Generate Geo Pages
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold text-white">Job Output</h3>
          {jobError && (
            <pre className="mt-3 bg-red-950/40 border border-red-900 text-red-200 rounded-lg p-3 text-xs overflow-auto">
              {jobError}
            </pre>
          )}
          {job ? (
            <div className="mt-3 bg-gray-950 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-sm text-gray-300">
                  <span className="text-gray-500">Job</span> {job.id} · {job.type} ·{" "}
                  <span
                    className={
                      job.status === "success"
                        ? "text-green-400"
                        : job.status === "error"
                          ? "text-red-400"
                          : "text-yellow-400"
                    }
                  >
                    {job.status}
                  </span>
                </div>
                <button
                  onClick={() => void refreshJob(job.id)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-2 rounded-lg text-sm"
                >
                  Refresh
                </button>
              </div>
              <pre className="mt-3 bg-black/30 border border-gray-800 rounded-lg p-3 text-xs overflow-auto max-h-[240px] whitespace-pre-wrap">
                {job.logTail || "(no output yet)"}
              </pre>
            </div>
          ) : (
            <p className="text-gray-500 text-sm mt-2">No job started yet.</p>
          )}
        </div>
      </section>

      {dataError && (
        <section className="bg-red-950/30 border border-red-900 rounded-xl p-4">
          <h2 className="text-red-200 font-semibold">Data Load Error</h2>
          <p className="text-red-300 text-sm mt-2 whitespace-pre-wrap">{dataError}</p>
        </section>
      )}

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-bold text-white">Script Review</h2>
          <div className="text-sm text-gray-400">Drafts: {scripts.length}</div>
        </div>
        {scripts.length === 0 ? (
          <p className="text-gray-500 text-sm mt-4">No `script_draft` items.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="space-y-3">
              {scripts.slice(0, 25).map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedScript(s);
                    setEditHook(s.hook);
                    setEditScript(s.script);
                    setEditCta(s.cta);
                  }}
                  className={
                    "w-full text-left bg-gray-950 border rounded-xl p-4 hover:border-blue-600 transition-colors " +
                    (selectedScript?.id === s.id
                      ? "border-blue-600"
                      : "border-gray-800")
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-300 font-medium line-clamp-2">
                      #{s.id} · {s.category}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(s.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm mt-2 line-clamp-2">
                    {s.hook}
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
              {selectedScript ? (
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-white font-semibold">
                      Script #{selectedScript.id}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void setScriptStatus(selectedScript.id, "script_approved")}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => void setScriptStatus(selectedScript.id, "failed")}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <label className="block text-xs text-gray-500">Hook</label>
                    <textarea
                      value={editHook}
                      onChange={(e) => setEditHook(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 min-h-[64px]"
                    />
                    <label className="block text-xs text-gray-500">Script</label>
                    <textarea
                      value={editScript}
                      onChange={(e) => setEditScript(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 min-h-[160px]"
                    />
                    <label className="block text-xs text-gray-500">CTA</label>
                    <textarea
                      value={editCta}
                      onChange={(e) => setEditCta(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 min-h-[64px]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => void patchScript(selectedScript.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
                      >
                        Save Edits
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Select a script to review.</p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-bold text-white">Video Review</h2>
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
            <div className="text-sm text-gray-400">Count: {videos.length}</div>
          </div>
        </div>
        {videoError && (
          <p className="text-red-300 text-sm mt-3 whitespace-pre-wrap">{videoError}</p>
        )}
        {videos.length === 0 ? (
          <p className="text-gray-500 text-sm mt-4">No videos for filter `{videoFilter}`.</p>
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
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm"
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

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-bold text-white">Instagram Posts</h2>
          <div className="flex gap-2">
            <button
              onClick={() => void loadIgPosts()}
              className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-2 rounded-lg text-sm"
            >
              Refresh
            </button>
          </div>
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
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
              <h3 className="font-semibold text-white">Insights</h3>
              <p className="text-gray-400 text-sm mt-2">
                Loaded from Instagram Graph API (v21.0).
              </p>
              <pre className="mt-3 bg-black/30 border border-gray-800 rounded-lg p-3 text-xs overflow-auto max-h-[360px] whitespace-pre-wrap">
                {igInsights ? JSON.stringify(igInsights, null, 2) : "(none loaded)"}
              </pre>
            </div>
          </div>
        )}
      </section>

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
