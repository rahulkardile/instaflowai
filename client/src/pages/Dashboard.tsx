import { useState, useEffect, useCallback } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  Camera,
  Zap,
  MessageCircle,
  Send,
  Activity,
  X,
  Check,
  Loader2,
  Play,
  Eye,
  Heart,
  MessageSquare,
  LogOut,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  ChevronDown,
  Unplug,
} from "lucide-react";
import Header from "../components/layout/Header";
import { auth } from "../utils/auth";
import api from "../utils/api";
import type { AuthSession } from "../types/AuthUser";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Reel {
  id: string;
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
  timestamp?: string;
}

interface AutomationForm {
  keywords: string;
  commentReply: string;
  dmMessage: string;
  active: boolean;
}

interface LogEntry {
  _id: string;
  commenterUsername?: string;
  commentText?: string;
  action: "COMMENT_REPLY" | "SEND_DM";
  status: "SUCCESS" | "FAILED";
  error?: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
/* ------------------------------------------------------------------ */

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

let toastId = 0;

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed right-6 bottom-6 z-[100] flex flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-right ${
            t.type === "success"
              ? "border border-green-200/40 bg-green-50/90 text-green-800"
              : "border border-red-200/40 bg-red-50/90 text-red-800"
          }`}
        >
          {t.type === "success" ? (
            <Check size={16} className="text-green-600" />
          ) : (
            <AlertCircle size={16} className="text-red-600" />
          )}
          {t.message}
          <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton helpers                                                   */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/20 bg-white/70 p-6 shadow-lg backdrop-blur-xl">
      <div className="h-4 w-24 rounded-lg bg-slate-200" />
      <div className="mt-3 h-8 w-16 rounded-lg bg-slate-200" />
    </div>
  );
}

function SkeletonReelCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-lg backdrop-blur-xl">
      <div className="aspect-[9/16] max-h-56 w-full bg-slate-200" />
      <div className="p-5">
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
        <div className="mt-4 h-10 w-full rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const session = auth.get();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [logLimit, setLogLimit] = useState(50);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const { user } = session;

  /* ---------- Toast helpers ---------- */
  const pushToast = useCallback((message: string, type: "success" | "error") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ---------- Handle ?ig_connected=true ---------- */
  useEffect(() => {
    if (searchParams.get("ig_connected") === "true") {
      // Refresh user data from the backend
      api.get("/auth/me").then(({ data }) => {
        if (data?.data?.user) {
          const updated: AuthSession = {
            ...session,
            user: { ...session.user, ...data.data.user },
          };
          auth.save(updated);
          pushToast("Instagram connected successfully!", "success");
          // Remove the query param
          setSearchParams({}, { replace: true });
          // Refetch queries
          queryClient.invalidateQueries({ queryKey: ["reels"] });
          queryClient.invalidateQueries({ queryKey: ["automations-count"] });
        }
      }).catch(() => {
        pushToast("Failed to refresh user data", "error");
      });
    }
  }, []);

  /* ---------- Data fetching ---------- */

  const { data: automationsCount = 0, isLoading: loadingAutomations } = useQuery({
    queryKey: ["automations-count"],
    queryFn: async () => {
      const { data } = await api.get("/automations");
      return Array.isArray(data?.data) ? data.data.length : 0;
    },
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery<LogEntry[]>({
    queryKey: ["automation-logs"],
    queryFn: async () => {
      const { data } = await api.get("/automations/logs");
      return Array.isArray(data?.data) ? data.data : [];
    },
  });

  const repliesToday = logs.filter((l) => {
    const d = new Date(l.createdAt);
    const today = new Date();
    return (
      l.action === "COMMENT_REPLY" &&
      d.toDateString() === today.toDateString()
    );
  }).length;

  const dmsSent = logs.filter((l) => l.action === "SEND_DM").length;

  const { data: reels = [], isLoading: loadingReels } = useQuery<Reel[]>({
    queryKey: ["reels"],
    queryFn: async () => {
      const { data } = await api.get("/instagram/reels");
      return Array.isArray(data?.data) ? data.data : [];
    },
    enabled: user.instagramConnected,
  });

  const connectIG = async () => {
    try {
      const { data } = await api.get("/instagram/auth");
      window.location.href = data.data.url;
    } catch {
      pushToast("Failed to start Instagram auth", "error");
    }
  };

  const disconnectMutation = useMutation({
    mutationFn: () => api.delete("/instagram/disconnect"),
    onSuccess: () => {
      const updated: AuthSession = {
        ...session,
        user: { ...session.user, instagramConnected: false },
      };
      auth.save(updated);
      pushToast("Instagram disconnected", "success");
      queryClient.invalidateQueries({ queryKey: ["reels"] });
    },
    onError: () => pushToast("Failed to disconnect Instagram", "error"),
  });

  /* ---------- Create Automation ---------- */

  const automationMutation = useMutation({
    mutationFn: (payload: {
      reelId: string;
      keywords: string[];
      commentReply: string;
      dmMessage: string;
      active: boolean;
    }) => api.post("/automations", payload),
    onSuccess: () => {
      pushToast("Automation saved!", "success");
      setSelectedReel(null);
      queryClient.invalidateQueries({ queryKey: ["automations-count"] });
    },
    onError: () => pushToast("Failed to save automation", "error"),
  });

  /* ---------- Render ---------- */

  return (
    <>
      <Header />

      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-purple-400/10 blur-[160px]" />
        <div className="absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full bg-pink-400/8 blur-[140px]" />
      </div>

      <main className="min-h-screen bg-slate-50/80 pb-20">
        <div className="mx-auto max-w-7xl px-6 py-10">

          {/* ── Welcome ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                Welcome back, {user.name.split(" ")[0]}
                <span className="ml-2 inline-block origin-[70%_70%] animate-bounce">👋</span>
              </h1>
              <p className="mt-2 text-lg text-slate-500">
                Manage your Instagram automations and monitor activity.
              </p>
            </div>
            <img
              src={user.avatar}
              alt={user.name}
              className="hidden h-16 w-16 rounded-full border-2 border-white object-cover shadow-lg sm:block"
            />
          </div>

          {/* ── Stats Grid ── */}
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {loadingAutomations || loadingLogs ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <StatCard
                  icon={<Camera size={20} />}
                  label="Instagram Status"
                  value={user.instagramConnected ? "Connected" : "Not Connected"}
                  accent={user.instagramConnected ? "green" : "red"}
                />
                <StatCard
                  icon={<Zap size={20} />}
                  label="Active Automations"
                  value={String(automationsCount)}
                  accent="purple"
                />
                <StatCard
                  icon={<MessageCircle size={20} />}
                  label="Replies Today"
                  value={String(repliesToday)}
                  accent="blue"
                />
                <StatCard
                  icon={<Send size={20} />}
                  label="DMs Sent"
                  value={String(dmsSent)}
                  accent="pink"
                />
              </>
            )}
          </div>

          {/* ── Connect / Connected Section ── */}
          <section className="mt-10">
            {!user.instagramConnected ? (
              <div className="relative overflow-hidden rounded-3xl border border-purple-200/40 bg-gradient-to-br from-purple-50/80 via-white/70 to-pink-50/80 p-10 shadow-lg backdrop-blur-xl">
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-400/10 blur-[80px]" />
                <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="max-w-xl">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-1.5 text-sm font-medium text-purple-700">
                      <Camera size={14} />
                      Step 1 — Connect your account
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Connect Your Instagram Business Account
                    </h2>
                    <p className="mt-3 text-slate-600 leading-relaxed">
                      Link your Instagram Business or Creator account to unlock automated comment replies,
                      personalized DMs, and keyword-triggered engagement. Your credentials are securely managed via Meta's official API.
                    </p>
                  </div>
                  <button
                    onClick={connectIG}
                    className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 px-8 py-4 text-lg font-semibold text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl active:scale-[0.98]"
                  >
                    <Camera size={22} className="transition-transform group-hover:rotate-12" />
                    Connect Instagram
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-3xl border border-green-200/50 bg-gradient-to-r from-green-50/80 to-emerald-50/60 p-8 shadow-lg backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-600">
                    <Camera size={24} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">Instagram Connected</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                      <span className="text-sm font-medium text-green-700">Account linked & active</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Unplug size={16} />
                  )}
                  Disconnect
                </button>
              </div>
            )}
          </section>

          {/* ── Reels Grid ── */}
          {user.instagramConnected && (
            <section className="mt-12">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Your Reels</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Click "Automate" on any reel to set up keyword-triggered replies & DMs.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-purple-100 px-4 py-1.5 text-sm font-medium text-purple-700">
                  <Play size={14} />
                  {reels.length} Reels
                </div>
              </div>

              {loadingReels ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <SkeletonReelCard />
                  <SkeletonReelCard />
                  <SkeletonReelCard />
                </div>
              ) : reels.length === 0 ? (
                <div className="rounded-3xl border border-white/20 bg-white/70 py-20 text-center shadow-lg backdrop-blur-xl">
                  <ImageIcon size={48} className="mx-auto text-slate-300" />
                  <p className="mt-4 text-lg font-medium text-slate-500">No reels found</p>
                  <p className="mt-1 text-sm text-slate-400">Post some Reels on Instagram to get started.</p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {reels.map((reel) => (
                    <ReelCard
                      key={reel.id}
                      reel={reel}
                      onAutomate={() => setSelectedReel(reel)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Activity Log ── */}
          <section className="mt-12">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Activity Log</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Recent automation actions and their results.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-600">
                <Activity size={14} />
                {logs.length} Events
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/70 shadow-lg backdrop-blur-xl">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={28} className="animate-spin text-purple-500" />
                </div>
              ) : logs.length === 0 ? (
                <div className="py-20 text-center">
                  <Activity size={48} className="mx-auto text-slate-300" />
                  <p className="mt-4 text-lg font-medium text-slate-500">No activity yet</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Automation logs will appear here once triggered.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200/60 bg-slate-50/80">
                          <th className="px-6 py-4 font-semibold text-slate-600">Time</th>
                          <th className="px-6 py-4 font-semibold text-slate-600">Commenter</th>
                          <th className="px-6 py-4 font-semibold text-slate-600">Comment</th>
                          <th className="px-6 py-4 font-semibold text-slate-600">Action</th>
                          <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
                          <th className="px-6 py-4 font-semibold text-slate-600">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.slice(0, logLimit).map((log, i) => (
                          <tr
                            key={log._id}
                            className={`border-b border-slate-100 transition hover:bg-purple-50/30 ${
                              i % 2 === 0 ? "bg-white/50" : "bg-slate-50/30"
                            }`}
                          >
                            <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-slate-400" />
                                {new Date(log.createdAt).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-800">
                              {log.commenterUsername || "—"}
                            </td>
                            <td className="max-w-[200px] truncate px-6 py-4 text-slate-600">
                              {log.commentText || "—"}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                  log.action === "COMMENT_REPLY"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-violet-100 text-violet-700"
                                }`}
                              >
                                {log.action === "COMMENT_REPLY" ? (
                                  <MessageCircle size={12} />
                                ) : (
                                  <Send size={12} />
                                )}
                                {log.action === "COMMENT_REPLY" ? "Reply" : "DM"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                  log.status === "SUCCESS"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {log.status === "SUCCESS" ? (
                                  <Check size={12} />
                                ) : (
                                  <AlertCircle size={12} />
                                )}
                                {log.status}
                              </span>
                            </td>
                            <td className="max-w-[160px] truncate px-6 py-4 text-xs text-red-500">
                              {log.error || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {logs.length > logLimit && (
                    <div className="border-t border-slate-100 py-4 text-center">
                      <button
                        onClick={() => setLogLimit((p) => p + 50)}
                        className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-purple-600 transition hover:bg-purple-50"
                      >
                        <ChevronDown size={16} />
                        Load More
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* ── Logout ── */}
          <div className="mt-12 flex justify-end">
            <button
              onClick={() => {
                auth.logout();
                location.href = "/login";
              }}
              className="group flex items-center gap-2.5 rounded-2xl border border-red-200 bg-white px-6 py-3 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 hover:shadow-md"
            >
              <LogOut size={18} className="transition-transform group-hover:-translate-x-0.5" />
              Sign Out
            </button>
          </div>
        </div>
      </main>

      {/* ── Automation Modal ── */}
      {selectedReel && (
        <AutomationModal
          reel={selectedReel}
          onClose={() => setSelectedReel(null)}
          onSave={(data) =>
            automationMutation.mutate({
              reelId: selectedReel.id,
              keywords: data.keywords.split(",").map((k) => k.trim()).filter(Boolean),
              commentReply: data.commentReply,
              dmMessage: data.dmMessage,
              active: data.active,
            })
          }
          isSaving={automationMutation.isPending}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

/* ── Stat Card ── */

const accentStyles = {
  green: {
    dot: "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]",
    icon: "bg-green-100 text-green-600",
    value: "text-green-700",
  },
  red: {
    dot: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]",
    icon: "bg-red-100 text-red-600",
    value: "text-red-600",
  },
  purple: {
    dot: "bg-purple-500",
    icon: "bg-purple-100 text-purple-600",
    value: "text-slate-900",
  },
  blue: {
    dot: "bg-blue-500",
    icon: "bg-blue-100 text-blue-600",
    value: "text-slate-900",
  },
  pink: {
    dot: "bg-pink-500",
    icon: "bg-pink-100 text-pink-600",
    value: "text-slate-900",
  },
} as const;

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: keyof typeof accentStyles;
}) {
  const styles = accentStyles[accent];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/70 p-6 shadow-lg backdrop-blur-xl transition hover:shadow-xl hover:-translate-y-0.5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-purple-400/10 to-pink-400/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-0" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
            {label}
            {(accent === "green" || accent === "red") && (
              <span className={`inline-block h-2 w-2 rounded-full ${styles.dot}`} />
            )}
          </p>
          <h3 className={`mt-2 text-3xl font-bold ${styles.value}`}>{value}</h3>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${styles.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ── Reel Card ── */

function ReelCard({ reel, onAutomate }: { reel: Reel; onAutomate: () => void }) {
  const thumbnail = reel.thumbnail_url || reel.media_url;

  return (
    <div className="group overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-lg backdrop-blur-xl transition hover:shadow-xl hover:-translate-y-1">
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={reel.caption || "Reel"}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
            <Play size={40} className="text-purple-300" />
          </div>
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          {reel.permalink && (
            <a
              href={reel.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-slate-800 backdrop-blur transition hover:bg-white"
            >
              <Eye size={16} />
              View on Instagram
            </a>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-5">
        <p className="line-clamp-2 text-sm text-slate-700 leading-relaxed">
          {reel.caption || "No caption"}
        </p>

        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Heart size={13} className="text-pink-400" />
            {reel.like_count ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare size={13} className="text-blue-400" />
            {reel.comments_count ?? 0}
          </span>
        </div>

        <button
          onClick={onAutomate}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
        >
          <Zap size={15} />
          Automate
        </button>
      </div>
    </div>
  );
}

/* ── Automation Modal ── */

function AutomationModal({
  reel,
  onClose,
  onSave,
  isSaving,
}: {
  reel: Reel;
  onClose: () => void;
  onSave: (data: AutomationForm) => void;
  isSaving: boolean;
}) {
  const { register, handleSubmit, watch, setValue } = useForm<AutomationForm>({
    defaultValues: {
      keywords: "",
      commentReply: "",
      dmMessage: "",
      active: true,
    },
  });

  const active = watch("active");
  const keywordsRaw = watch("keywords");

  const keywordTags = keywordsRaw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const removeKeyword = (idx: number) => {
    const updated = keywordTags.filter((_, i) => i !== idx).join(", ");
    setValue("keywords", updated);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/20 bg-white shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          {/* Header */}
          <h3 className="text-xl font-bold text-slate-900">Set Up Automation</h3>
          <p className="mt-1 text-sm text-slate-500">
            Configure auto-replies and DMs for this reel.
          </p>

          {/* Reel preview */}
          <div className="mt-5 flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
            {reel.thumbnail_url || reel.media_url ? (
              <img
                src={reel.thumbnail_url || reel.media_url}
                alt="Reel"
                className="h-16 w-16 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-purple-100">
                <Play size={24} className="text-purple-400" />
              </div>
            )}
            <p className="line-clamp-2 text-sm text-slate-600">
              {reel.caption || "No caption"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSave)} className="mt-6 space-y-5">
            {/* Keywords */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Trigger Keywords
              </label>
              <input
                {...register("keywords")}
                placeholder="price, buy, link, dm me…"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              />
              {keywordTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {keywordTags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeKeyword(i)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-purple-200"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Comment Reply */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Comment Reply
              </label>
              <textarea
                {...register("commentReply")}
                rows={3}
                placeholder="Thanks for your interest! Check your DMs 📩"
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            {/* DM Message */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                DM Message
              </label>
              <textarea
                {...register("dmMessage")}
                rows={4}
                placeholder="Hey! Here's the link you asked for: https://…"
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">Active</span>
              <button
                type="button"
                onClick={() => setValue("active", !active)}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  active ? "bg-purple-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
                    active ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.02] hover:shadow-xl disabled:opacity-60 disabled:hover:scale-100"
              >
                {isSaving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Check size={18} />
                )}
                {isSaving ? "Saving…" : "Save Automation"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
