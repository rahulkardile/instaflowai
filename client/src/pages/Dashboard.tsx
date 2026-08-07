import { useState, useEffect, useCallback } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  Camera, Zap, MessageCircle, Send, Activity, X, Check,
  Loader2, Play, Eye, Heart, MessageSquare, LogOut, Clock,
  AlertCircle, Image as ImageIcon, ChevronDown, Unplug,
  Trash2, Film, Settings2, Plus, Hash, Mail, Inbox,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../utils/auth";
import api from "../utils/api";
import type { AuthSession } from "../types/AuthUser";

/* ──────────────────────────────────────────────────────────────────── */
/*  Types                                                               */
/* ──────────────────────────────────────────────────────────────────── */

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

interface Automation {
  _id: string;
  type: "COMMENT" | "DM";
  reelId: string;
  keywords: string[];
  commentReply?: string;
  dmMessage?: string;
  dmReplyMessage?: string;
  enabled: boolean;
  createdAt: string;
}

interface AutomationForm {
  keywords: string;
  commentReply: string;
  dmMessage: string;
  active: boolean;
}

interface DMAutomationForm {
  keywords: string;
  dmReplyMessage: string;
  active: boolean;
}

interface LogEntry {
  _id: string;
  commenterUsername?: string;
  commentText?: string;
  dmSenderId?: string;
  dmText?: string;
  action: "COMMENT_REPLY" | "SEND_DM" | "DM_AUTO_REPLY" | "COMMENT_RECEIVED" | "DM_RECEIVED";
  status: "SUCCESS" | "FAILED";
  error?: string;
  errorMessage?: string;
  createdAt: string;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

let toastId = 0;

/* ──────────────────────────────────────────────────────────────────── */
/*  Toast                                                               */
/* ──────────────────────────────────────────────────────────────────── */

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`pointer-events-auto flex items-center gap-3 rounded-[16px] border px-4 py-3 text-[13px] font-medium shadow-[0_4px_16px_rgba(0,0,0,0.10)] backdrop-blur-xl ${
              t.type === "success"
                ? "border-green-200/60 bg-white text-green-800"
                : "border-red-200/60 bg-white text-red-800"
            }`}
          >
            {t.type === "success" ? (
              <Check size={14} className="text-green-600" />
            ) : (
              <AlertCircle size={14} className="text-red-600" />
            )}
            {t.message}
            <button
              onClick={() => onDismiss(t.id)}
              className="ml-1 opacity-40 transition-opacity hover:opacity-80"
              aria-label="Dismiss"
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Skeletons                                                           */
/* ──────────────────────────────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-[20px] border border-black/[0.06] bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
      <div className="h-3 w-20 rounded-full bg-[#f4f4f5]" />
      <div className="mt-3 h-7 w-14 rounded-lg bg-[#f4f4f5]" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 px-6 py-4 border-b border-black/[0.04]">
      <div className="h-3 w-24 rounded-full bg-[#f4f4f5]" />
      <div className="h-3 w-32 rounded-full bg-[#f4f4f5]" />
      <div className="h-3 w-20 rounded-full bg-[#f4f4f5]" />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Confirm Delete Modal                                                */
/* ──────────────────────────────────────────────────────────────────── */

function ConfirmDeleteModal({ onConfirm, onCancel, isPending }: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-sm rounded-[28px] bg-white p-8 shadow-[0_8px_40px_rgba(0,0,0,0.14)]"
      >
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-[14px] bg-red-50">
          <Trash2 size={18} className="text-red-600" />
        </div>
        <h3 className="mt-4 text-[17px] font-semibold text-[#111111]">Delete automation?</h3>
        <p className="mt-2 text-[13px] leading-[1.6] text-[#71717a]">
          This action cannot be undone. The automation will stop immediately.
        </p>
        <div className="mt-8 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-[14px] border border-black/[0.08] bg-white py-2.5 text-[13px] font-semibold text-[#111111] transition hover:bg-[#f4f4f5]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-red-600 py-2.5 text-[13px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Types                                                               */
/* ──────────────────────────────────────────────────────────────────── */

type Tab = "reels" | "automations" | "dm-automations" | "logs" | "inbox";

/* ──────────────────────────────────────────────────────────────────── */
/*  Dashboard                                                           */
/* ──────────────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const session = auth.get();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [showDMModal, setShowDMModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("reels");
  const [logLimit, setLogLimit] = useState(50);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  if (!session) return <Navigate to="/login" replace />;
  const { user } = session;

  /* ── Toast helpers ── */
  const pushToast = useCallback((message: string, type: "success" | "error") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ── ig_connected redirect ── */
  useEffect(() => {
    if (searchParams.get("ig_connected") === "true") {
      api.get("/auth/me").then(({ data }) => {
        if (data?.data?.user) {
          const updated: AuthSession = { ...session, user: { ...session.user, ...data.data.user } };
          auth.save(updated);
          pushToast("Instagram connected successfully!", "success");
          setSearchParams({}, { replace: true });
          queryClient.invalidateQueries({ queryKey: ["reels"] });
          queryClient.invalidateQueries({ queryKey: ["automations"] });
        }
      }).catch(() => pushToast("Failed to refresh user data", "error"));
    }
  }, []);

  /* ── Data fetching ── */
  const { data: automations = [], isLoading: loadingAutomations } = useQuery<Automation[]>({
    queryKey: ["automations"],
    queryFn: async () => {
      const { data } = await api.get("/automations");
      return Array.isArray(data?.data) ? data.data : [];
    },
  });

  const commentAutomations = automations.filter((a) => a.type === "COMMENT" || !a.type);
  const dmAutomations = automations.filter((a) => a.type === "DM");

  const { data: logs = [], isLoading: loadingLogs } = useQuery<LogEntry[]>({
    queryKey: ["automation-logs"],
    queryFn: async () => {
      const { data } = await api.get("/automations/logs");
      return Array.isArray(data?.data) ? data.data : [];
    },
  });

  const { data: reels = [], isLoading: loadingReels } = useQuery<Reel[]>({
    queryKey: ["reels"],
    queryFn: async () => {
      const { data } = await api.get("/instagram/reels");
      return Array.isArray(data?.data) ? data.data : [];
    },
    enabled: user.instagramConnected,
  });

  const { data: igAccount } = useQuery({
    queryKey: ["igAccount"],
    queryFn: async () => {
      const { data } = await api.get("/instagram/account");
      return data?.data;
    },
    enabled: user.instagramConnected,
  });

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<LogEntry[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await api.get("/instagram/conversations");
      return Array.isArray(data?.data) ? data.data : [];
    },
    enabled: user.instagramConnected,
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (payload: { recipientId: string; text: string }) =>
      api.post("/instagram/message", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMessageInput("");
    },
    onError: () => pushToast("Failed to send message", "error"),
  });

  const groupedConversations = conversations.reduce((acc, log) => {
    if (!log.dmSenderId) return acc;
    if (!acc[log.dmSenderId]) acc[log.dmSenderId] = [];
    acc[log.dmSenderId].push(log);
    return acc;
  }, {} as Record<string, LogEntry[]>);

  const conversationSenders = Object.keys(groupedConversations).sort((a, b) => {
    const lastA = groupedConversations[a][groupedConversations[a].length - 1].createdAt;
    const lastB = groupedConversations[b][groupedConversations[b].length - 1].createdAt;
    return new Date(lastB).getTime() - new Date(lastA).getTime();
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
      const updated: AuthSession = { ...session, user: { ...session.user, instagramConnected: false } };
      auth.save(updated);
      pushToast("Instagram disconnected", "success");
      queryClient.invalidateQueries({ queryKey: ["reels"] });
    },
    onError: () => pushToast("Failed to disconnect Instagram", "error"),
  });

  const createAutomationMutation = useMutation({
    mutationFn: (payload: {
      type: "COMMENT" | "DM";
      reelId?: string;
      keywords: string[];
      commentReply?: string;
      dmMessage?: string;
      dmReplyMessage?: string;
      active: boolean;
    }) => api.post("/automations", payload),
    onSuccess: () => {
      pushToast("Automation saved!", "success");
      setSelectedReel(null);
      setShowDMModal(false);
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
    onError: () => pushToast("Failed to save automation", "error"),
  });

  const toggleAutomationMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.put(`/automations/${id}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations"] }),
    onError: () => pushToast("Failed to update automation", "error"),
  });

  const deleteAutomationMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/automations/${id}`),
    onSuccess: () => {
      pushToast("Automation deleted", "success");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
    onError: () => pushToast("Failed to delete automation", "error"),
  });

  /* ── Sidebar nav items ── */
  const navItems: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "reels", label: "Reels", icon: <Film size={16} strokeWidth={1.75} />, count: reels.length },
    { id: "automations", label: "Comment Automations", icon: <MessageCircle size={16} strokeWidth={1.75} />, count: commentAutomations.length },
    { id: "dm-automations", label: "DM Automations", icon: <Mail size={16} strokeWidth={1.75} />, count: dmAutomations.length },
    { id: "inbox", label: "Inbox", icon: <Inbox size={16} strokeWidth={1.75} />, count: conversationSenders.length },
    { id: "logs", label: "Activity Log", icon: <Activity size={16} strokeWidth={1.75} />, count: logs.length },
  ];

  return (
    <div className="flex min-h-screen bg-[#fafafb]" style={{ fontFamily: "var(--font-sans)" }}>

      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 z-40 flex h-full w-[240px] flex-col border-r border-black/[0.06] bg-white">

        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-black/[0.05] px-5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[11px] font-black text-white"
            style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
          >
            IF
          </div>
          <span className="text-[14px] font-semibold tracking-tight text-[#111111]">InstaFlow</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 px-2 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a1a1aa]">
              Workspace
            </p>
          </div>
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`group flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-all duration-150 ${
                  activeTab === item.id
                    ? "bg-violet-50 text-[#7c3aed]"
                    : "text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#111111]"
                }`}
              >
                <span className={activeTab === item.id ? "text-[#7c3aed]" : "text-[#a1a1aa] group-hover:text-[#71717a]"}>
                  {item.icon}
                </span>
                <span className="flex-1 text-[13px] font-medium">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      activeTab === item.id
                        ? "bg-violet-100 text-violet-700"
                        : "bg-[#f4f4f5] text-[#71717a]"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Bottom — IG status + user */}
        <div className="border-t border-black/[0.05] p-3 space-y-2">
          {/* Instagram status */}
          {user.instagramConnected ? (
            <div className="flex items-center justify-between rounded-[12px] bg-green-50/80 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
                <span className="text-[12px] font-medium text-green-800">
                  {igAccount ? `@${igAccount.username}` : "Connected"}
                </span>
              </div>
              <button
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="text-[11px] text-red-500 transition hover:text-red-700 disabled:opacity-50"
                aria-label="Disconnect Instagram"
              >
                <Unplug size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={connectIG}
              className="flex w-full items-center gap-2 rounded-[12px] border border-dashed border-black/[0.12] px-3 py-2.5 text-[12px] font-medium text-[#71717a] transition hover:border-violet-300 hover:bg-violet-50 hover:text-[#7c3aed]"
            >
              <Camera size={14} />
              Connect Instagram
            </button>
          )}

          {/* User row */}
          <div className="flex items-center gap-3 rounded-[12px] px-3 py-2">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">
                {user.name?.[0]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-[#111111]">{user.name}</p>
              <p className="truncate text-[11px] text-[#a1a1aa]">{user.email}</p>
            </div>
            <button
              onClick={() => { auth.logout(); location.href = "/login"; }}
              className="shrink-0 rounded-[8px] p-1.5 text-[#a1a1aa] transition hover:bg-red-50 hover:text-red-600"
              aria-label="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="ml-[240px] flex min-h-screen flex-1 flex-col">

        {/* Top bar */}
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/[0.05] bg-white/90 px-8 backdrop-blur-xl">
          <div>
            <h1 className="text-[15px] font-semibold text-[#111111]">
              {navItems.find((n) => n.id === activeTab)?.label ?? "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Connect IG if not connected */}
            {!user.instagramConnected && (
              <button
                onClick={connectIG}
                className="flex items-center gap-2 rounded-[14px] px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
              >
                <Camera size={14} />
                Connect Instagram
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 px-8 py-8">

          {/* Stats grid */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loadingAutomations || loadingLogs ? (
              <><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
            ) : (
              <>
                <StatCard
                  icon={<Camera size={16} strokeWidth={1.75} />}
                  label="Instagram"
                  value={user.instagramConnected ? "Connected" : "Not connected"}
                  accent={user.instagramConnected ? "green" : "zinc"}
                />
                <StatCard
                  icon={<MessageCircle size={16} strokeWidth={1.75} />}
                  label="Comment Rules"
                  value={String(commentAutomations.filter((a) => a.enabled).length)}
                  accent="violet"
                />
                <StatCard
                  icon={<Mail size={16} strokeWidth={1.75} />}
                  label="DM Rules"
                  value={String(dmAutomations.filter((a) => a.enabled).length)}
                  accent="blue"
                />
                <StatCard
                  icon={<Send size={16} strokeWidth={1.75} />}
                  label="Total Actions"
                  value={String(logs.length)}
                  accent="zinc"
                />
              </>
            )}
          </div>

          {/* ── Tab: Reels ── */}
          {activeTab === "reels" && (
            <div>
              <SectionHeader
                title="Your Reels"
                subtitle="Click Automate on any reel to create a keyword-triggered automation."
                action={
                  <span className="flex items-center gap-1.5 rounded-full bg-[#f4f4f5] px-3 py-1.5 text-[12px] font-medium text-[#71717a]">
                    <Play size={11} />
                    {reels.length} reels
                  </span>
                }
              />
              {loadingReels ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse rounded-[20px] border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                      <div className="aspect-[9/16] max-h-56 rounded-t-[20px] bg-[#f4f4f5]" />
                      <div className="p-4 space-y-2">
                        <div className="h-2.5 w-3/4 rounded-full bg-[#f4f4f5]" />
                        <div className="h-8 w-full rounded-[12px] bg-[#f4f4f5]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : reels.length === 0 ? (
                <EmptyState icon={<ImageIcon size={36} strokeWidth={1.5} />} title="No reels found" desc="Post some Reels on Instagram then sync here." />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {reels.map((reel) => (
                    <ReelCard
                      key={reel.id}
                      reel={reel}
                      hasAutomation={commentAutomations.some((a) => a.reelId === reel.id)}
                      onAutomate={() => setSelectedReel(reel)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Comment Automations ── */}
          {activeTab === "automations" && (
            <div>
              <SectionHeader
                title="Comment Automations"
                subtitle="Keyword-triggered replies and DMs for your reels."
                action={
                  <button
                    onClick={() => setActiveTab("reels")}
                    className="flex items-center gap-2 rounded-[14px] px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
                  >
                    <Plus size={14} />
                    New automation
                  </button>
                }
              />
              {loadingAutomations ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={24} className="animate-spin text-[#a1a1aa]" />
                </div>
              ) : commentAutomations.length === 0 ? (
                <EmptyState
                  icon={<MessageCircle size={36} strokeWidth={1.5} />}
                  title="No comment automations yet"
                  desc="Go to Reels and click Automate on a reel to create one."
                  cta={{ label: "Go to Reels", onClick: () => setActiveTab("reels") }}
                />
              ) : (
                <div className="space-y-3">
                  {commentAutomations.map((automation) => (
                    <AutomationCard
                      key={automation._id}
                      automation={automation}
                      reel={reels.find((r) => r.id === automation.reelId)}
                      onToggle={(enabled) => toggleAutomationMutation.mutate({ id: automation._id, enabled })}
                      onDelete={() => setDeleteTarget(automation._id)}
                      isDeleting={deleteAutomationMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: DM Automations ── */}
          {activeTab === "dm-automations" && (
            <div>
              <SectionHeader
                title="DM Automations"
                subtitle="Auto-reply to incoming direct messages with keyword triggers."
                action={
                  <button
                    onClick={() => setShowDMModal(true)}
                    className="flex items-center gap-2 rounded-[14px] px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
                  >
                    <Plus size={14} />
                    New DM rule
                  </button>
                }
              />
              {loadingAutomations ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={24} className="animate-spin text-[#a1a1aa]" />
                </div>
              ) : dmAutomations.length === 0 ? (
                <EmptyState
                  icon={<Mail size={36} strokeWidth={1.5} />}
                  title="No DM automations yet"
                  desc="Create a rule to auto-reply when someone sends you a keyword-containing DM."
                  cta={{ label: "Create DM rule", onClick: () => setShowDMModal(true) }}
                />
              ) : (
                <div className="space-y-3">
                  {dmAutomations.map((automation) => (
                    <DMAutomationCard
                      key={automation._id}
                      automation={automation}
                      onToggle={(enabled) => toggleAutomationMutation.mutate({ id: automation._id, enabled })}
                      onDelete={() => setDeleteTarget(automation._id)}
                      isDeleting={deleteAutomationMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Activity Log ── */}
          {activeTab === "logs" && (
            <div>
              <SectionHeader
                title="Activity Log"
                subtitle="Every automation action, in real-time."
                action={
                  <span className="flex items-center gap-1.5 rounded-full bg-[#f4f4f5] px-3 py-1.5 text-[12px] font-medium text-[#71717a]">
                    <Activity size={11} />
                    {logs.length} events
                  </span>
                }
              />
              <div className="overflow-hidden rounded-[20px] border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                {loadingLogs ? (
                  <div>
                    {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
                  </div>
                ) : logs.length === 0 ? (
                  <EmptyState icon={<Activity size={36} strokeWidth={1.5} />} title="No activity yet" desc="Automation events will appear here once triggered." />
                ) : (
                  <>
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_1fr_2fr_1fr_80px] gap-4 border-b border-black/[0.05] bg-[#fafafb] px-6 py-3">
                      {["Time", "From", "Message", "Action", "Status"].map((h) => (
                        <p key={h} className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#a1a1aa]">{h}</p>
                      ))}
                    </div>
                    {logs.slice(0, logLimit).map((log) => (
                      <div
                        key={log._id}
                        className="grid grid-cols-[1fr_1fr_2fr_1fr_80px] gap-4 border-b border-black/[0.04] px-6 py-4 text-[13px] transition hover:bg-[#fafafb]"
                      >
                        <div className="flex items-center gap-1.5 text-[#a1a1aa]">
                          <Clock size={11} />
                          <span className="truncate">{new Date(log.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="truncate font-medium text-[#111111]">
                          {log.commenterUsername || log.dmSenderId || "—"}
                        </p>
                        <p className="truncate text-[#71717a]">
                          {log.commentText || log.dmText || "—"}
                        </p>
                        <div>
                          <ActionBadge action={log.action} />
                        </div>
                        <div>
                          <StatusBadge status={log.status} />
                        </div>
                      </div>
                    ))}
                    {logs.length > logLimit && (
                      <div className="border-t border-black/[0.04] py-4 text-center">
                        <button
                          onClick={() => setLogLimit((p) => p + 50)}
                          className="inline-flex items-center gap-1.5 rounded-[12px] px-5 py-2 text-[13px] font-medium text-[#7c3aed] transition hover:bg-violet-50"
                        >
                          <ChevronDown size={14} />
                          Load more
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Inbox ── */}
          {activeTab === "inbox" && (
            <div>
              <SectionHeader title="Inbox" subtitle="View and reply to direct messages." />
              <div className="flex h-[600px] overflow-hidden rounded-[20px] border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                {/* Sidebar */}
                <div className="flex w-[280px] shrink-0 flex-col border-r border-black/[0.05]">
                  <div className="border-b border-black/[0.05] px-5 py-4">
                    <p className="text-[13px] font-semibold text-[#111111]">Conversations</p>
                    <p className="mt-0.5 text-[11px] text-[#a1a1aa]">{conversationSenders.length} threads</p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {loadingConversations ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 size={20} className="animate-spin text-[#a1a1aa]" />
                      </div>
                    ) : conversationSenders.length === 0 ? (
                      <div className="p-6 text-center text-[13px] text-[#a1a1aa]">No conversations yet.</div>
                    ) : (
                      conversationSenders.map((senderId) => {
                        const lastMessage = groupedConversations[senderId][groupedConversations[senderId].length - 1];
                        const isSelected = selectedConversation === senderId;
                        return (
                          <button
                            key={senderId}
                            onClick={() => setSelectedConversation(senderId)}
                            className={`w-full border-b border-black/[0.04] px-5 py-4 text-left transition hover:bg-[#fafafb] ${isSelected ? "bg-violet-50" : ""}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] text-[11px] font-bold text-[#71717a]">
                                {senderId.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-medium text-[#111111]">{senderId}</p>
                                <p className="truncate text-[12px] text-[#a1a1aa]">{lastMessage.dmText}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Chat window */}
                <div className="flex flex-1 flex-col">
                  {selectedConversation ? (
                    <>
                      <div className="flex items-center gap-3 border-b border-black/[0.05] px-6 py-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f4f5] text-[11px] font-bold text-[#71717a]">
                          {selectedConversation.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#111111]">{selectedConversation}</p>
                          <p className="text-[11px] text-[#a1a1aa]">Instagram DM</p>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                        {groupedConversations[selectedConversation].map((log) => {
                          const isOutgoing = log.action === "SEND_DM" || log.action === "DM_AUTO_REPLY";
                          return (
                            <div key={log._id} className={`flex flex-col ${isOutgoing ? "items-end" : "items-start"}`}>
                              <div
                                className={`max-w-[70%] rounded-[16px] px-4 py-2.5 text-[13px] leading-[1.5] ${
                                  isOutgoing
                                    ? "rounded-br-sm text-white"
                                    : "rounded-bl-sm bg-[#f4f4f5] text-[#111111]"
                                }`}
                                style={isOutgoing ? { background: "linear-gradient(135deg, #7c3aed, #ec4899)" } : {}}
                              >
                                {log.dmText}
                              </div>
                              <span className="mt-1 px-1 text-[10px] text-[#a1a1aa]">
                                {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                {log.action === "DM_AUTO_REPLY" && " · Auto"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t border-black/[0.05] p-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && messageInput.trim()) {
                                sendMessageMutation.mutate({ recipientId: selectedConversation, text: messageInput });
                              }
                            }}
                            placeholder="Type a message…"
                            className="flex-1 rounded-full border border-black/[0.08] bg-[#fafafb] px-4 py-2.5 text-[13px] outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                          />
                          <button
                            onClick={() => {
                              if (messageInput.trim()) {
                                sendMessageMutation.mutate({ recipientId: selectedConversation, text: messageInput });
                              }
                            }}
                            disabled={sendMessageMutation.isPending || !messageInput.trim()}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:opacity-90 disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
                          >
                            {sendMessageMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} className="ml-0.5" />}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[#a1a1aa]">
                      <MessageSquare size={36} strokeWidth={1.5} />
                      <p className="text-[13px]">Select a conversation</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Modals ── */}
      <AnimatePresence>
        {selectedReel && (
          <AutomationModal
            reel={selectedReel}
            onClose={() => setSelectedReel(null)}
            onSave={(data) =>
              createAutomationMutation.mutate({
                type: "COMMENT",
                reelId: selectedReel.id,
                keywords: data.keywords.split(",").map((k) => k.trim()).filter(Boolean),
                commentReply: data.commentReply,
                dmMessage: data.dmMessage,
                active: data.active,
              })
            }
            isSaving={createAutomationMutation.isPending}
          />
        )}
        {showDMModal && (
          <DMAutomationModal
            onClose={() => setShowDMModal(false)}
            onSave={(data) =>
              createAutomationMutation.mutate({
                type: "DM",
                keywords: data.keywords.split(",").map((k) => k.trim()).filter(Boolean),
                dmReplyMessage: data.dmReplyMessage,
                active: data.active,
              })
            }
            isSaving={createAutomationMutation.isPending}
          />
        )}
        {deleteTarget && (
          <ConfirmDeleteModal
            onConfirm={() => deleteAutomationMutation.mutate(deleteTarget)}
            onCancel={() => setDeleteTarget(null)}
            isPending={deleteAutomationMutation.isPending}
          />
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Sub-components                                                      */
/* ════════════════════════════════════════════════════════════════════ */

/* ── Section Header ── */
function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[18px] font-bold tracking-[-0.015em] text-[#111111]">{title}</h2>
        {subtitle && <p className="mt-1 text-[13px] text-[#71717a]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Stat Card ── */
const accentMap = {
  green: { icon: "bg-green-50 text-green-600", dot: "bg-green-500", val: "text-green-700" },
  violet: { icon: "bg-violet-50 text-violet-600", dot: "bg-violet-500", val: "text-[#111111]" },
  blue: { icon: "bg-blue-50 text-blue-600", dot: "bg-blue-500", val: "text-[#111111]" },
  zinc: { icon: "bg-[#f4f4f5] text-[#71717a]", dot: "bg-[#71717a]", val: "text-[#111111]" },
} as const;

function StatCard({ icon, label, value, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: keyof typeof accentMap;
}) {
  const a = accentMap[accent];
  return (
    <div className="group rounded-[20px] border border-black/[0.06] bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-[#71717a]">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${a.icon}`}>
          {icon}
        </div>
      </div>
      <p className={`mt-3 text-[24px] font-black tracking-tight ${a.val}`}>{value}</p>
    </div>
  );
}

/* ── Empty State ── */
function EmptyState({ icon, title, desc, cta }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-black/[0.08] bg-white py-20 text-center">
      <div className="mb-4 text-[#d4d4d8]">{icon}</div>
      <p className="text-[15px] font-semibold text-[#71717a]">{title}</p>
      <p className="mt-2 max-w-xs text-[13px] text-[#a1a1aa]">{desc}</p>
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-6 flex items-center gap-2 rounded-[14px] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}

/* ── Reel Card ── */
function ReelCard({ reel, hasAutomation, onAutomate }: {
  reel: Reel;
  hasAutomation: boolean;
  onAutomate: () => void;
}) {
  const thumbnail = reel.thumbnail_url || reel.media_url;
  return (
    <div className="group overflow-hidden rounded-[20px] border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.09)]">
      <div className="relative aspect-[9/16] max-h-64 w-full overflow-hidden bg-[#f4f4f5]">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={reel.caption || "Reel"}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Play size={32} className="text-[#d4d4d8]" strokeWidth={1.5} />
          </div>
        )}
        {hasAutomation && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-green-700 shadow-sm backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Active
          </div>
        )}
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/40 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {reel.permalink && (
            <a
              href={reel.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-[10px] bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-[#111111] backdrop-blur-sm no-underline"
            >
              <Eye size={12} />
              View
            </a>
          )}
        </div>
      </div>

      <div className="p-4">
        <p className="line-clamp-2 text-[12px] leading-[1.5] text-[#71717a]">
          {reel.caption || "No caption"}
        </p>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-[#a1a1aa]">
          <span className="flex items-center gap-1">
            <Heart size={11} className="text-pink-400" />
            {reel.like_count ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare size={11} className="text-blue-400" />
            {reel.comments_count ?? 0}
          </span>
        </div>
        <button
          id={`automate-reel-${reel.id}`}
          onClick={onAutomate}
          className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-[12px] py-2.5 text-[12px] font-semibold transition-all hover:opacity-90 active:scale-[0.98] ${
            hasAutomation
              ? "border border-black/[0.08] bg-white text-[#111111]"
              : "text-white"
          }`}
          style={!hasAutomation ? { background: "linear-gradient(135deg, #7c3aed, #ec4899)" } : {}}
        >
          <Zap size={12} />
          {hasAutomation ? "Edit automation" : "Automate"}
        </button>
      </div>
    </div>
  );
}

/* ── Automation Card ── */
function AutomationCard({ automation, reel, onToggle, onDelete, isDeleting }: {
  automation: Automation;
  reel?: Reel;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const thumbnail = reel?.thumbnail_url || reel?.media_url;
  return (
    <div className="flex items-start gap-5 rounded-[20px] border border-black/[0.06] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
      {/* Reel thumbnail */}
      <div className="h-16 w-11 shrink-0 overflow-hidden rounded-[10px] bg-[#f4f4f5]">
        {thumbnail ? (
          <img src={thumbnail} alt="Reel" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Film size={16} className="text-[#d4d4d8]" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[#111111]">
              {reel?.caption
                ? reel.caption.slice(0, 80) + (reel.caption.length > 80 ? "…" : "")
                : `Reel · ${automation.reelId?.slice(0, 10)}…`}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {automation.keywords.length > 0 ? (
                automation.keywords.slice(0, 6).map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-black/[0.06] bg-[#f4f4f5] px-2 py-0.5 text-[11px] font-medium text-[#71717a]"
                  >
                    <Hash size={8} />
                    {kw}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-[#a1a1aa]">Matches all comments</span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              id={`toggle-automation-${automation._id}`}
              onClick={() => onToggle(!automation.enabled)}
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 ${
                automation.enabled ? "bg-green-500" : "bg-[#e4e4e7]"
              }`}
              aria-label={automation.enabled ? "Disable" : "Enable"}
            >
              <span
                className={`absolute top-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  automation.enabled ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
            <button
              id={`delete-automation-${automation._id}`}
              onClick={onDelete}
              disabled={isDeleting}
              className="rounded-[8px] p-1.5 text-[#d4d4d8] transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              aria-label="Delete automation"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {automation.commentReply && (
            <div className="flex items-start gap-2 rounded-[10px] bg-blue-50/70 px-3 py-2">
              <MessageCircle size={11} className="mt-0.5 shrink-0 text-blue-500" />
              <p className="truncate text-[12px] text-blue-700">{automation.commentReply}</p>
            </div>
          )}
          {automation.dmMessage && (
            <div className="flex items-start gap-2 rounded-[10px] bg-violet-50/70 px-3 py-2">
              <Send size={11} className="mt-0.5 shrink-0 text-violet-500" />
              <p className="truncate text-[12px] text-violet-700">{automation.dmMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── DM Automation Card ── */
function DMAutomationCard({ automation, onToggle, onDelete, isDeleting }: {
  automation: Automation;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-start gap-5 rounded-[20px] border border-black/[0.06] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-violet-50">
        <Mail size={18} className="text-violet-600" strokeWidth={1.75} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#111111]">DM Auto-Reply</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {automation.keywords.length > 0 ? (
                automation.keywords.slice(0, 6).map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-black/[0.06] bg-[#f4f4f5] px-2 py-0.5 text-[11px] font-medium text-[#71717a]"
                  >
                    <Hash size={8} />
                    {kw}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-[#a1a1aa]">Matches all DMs</span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              id={`toggle-dm-automation-${automation._id}`}
              onClick={() => onToggle(!automation.enabled)}
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 ${
                automation.enabled ? "bg-green-500" : "bg-[#e4e4e7]"
              }`}
              aria-label={automation.enabled ? "Disable" : "Enable"}
            >
              <span
                className={`absolute top-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  automation.enabled ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
            <button
              id={`delete-dm-automation-${automation._id}`}
              onClick={onDelete}
              disabled={isDeleting}
              className="rounded-[8px] p-1.5 text-[#d4d4d8] transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              aria-label="Delete DM automation"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {automation.dmReplyMessage && (
          <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-violet-50/70 px-3 py-2">
            <Send size={11} className="mt-0.5 shrink-0 text-violet-500" />
            <p className="text-[12px] text-violet-700">{automation.dmReplyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Action Badge ── */
function ActionBadge({ action }: { action: LogEntry["action"] }) {
  const map: Record<string, { label: string; className: string }> = {
    COMMENT_REPLY: { label: "Reply", className: "bg-blue-50 text-blue-700" },
    DM_AUTO_REPLY: { label: "DM Auto", className: "bg-violet-50 text-violet-700" },
    SEND_DM: { label: "Send DM", className: "bg-indigo-50 text-indigo-700" },
    COMMENT_RECEIVED: { label: "Comment In", className: "bg-[#f4f4f5] text-[#71717a]" },
    DM_RECEIVED: { label: "DM In", className: "bg-[#f4f4f5] text-[#71717a]" },
  };
  const { label, className } = map[action] ?? { label: action, className: "bg-[#f4f4f5] text-[#71717a]" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}>
      {label}
    </span>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status }: { status: "SUCCESS" | "FAILED" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        status === "SUCCESS" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      {status === "SUCCESS" ? <Check size={10} /> : <AlertCircle size={10} />}
      {status === "SUCCESS" ? "OK" : "Fail"}
    </span>
  );
}

/* ── Comment Automation Modal ── */
function AutomationModal({ reel, onClose, onSave, isSaving }: {
  reel: Reel;
  onClose: () => void;
  onSave: (data: AutomationForm) => void;
  isSaving: boolean;
}) {
  const { register, handleSubmit, watch, setValue } = useForm<AutomationForm>({
    defaultValues: { keywords: "", commentReply: "", dmMessage: "", active: true },
  });
  const active = watch("active");
  const keywordsRaw = watch("keywords");
  const keywordTags = keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean);

  const removeKeyword = (idx: number) => {
    setValue("keywords", keywordTags.filter((_, i) => i !== idx).join(", "));
  };

  const thumbnail = reel.thumbnail_url || reel.media_url;

  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.16)]"
      >
        <button
          id="close-automation-modal"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-[8px] p-1.5 text-[#a1a1aa] transition hover:bg-[#f4f4f5] hover:text-[#71717a]"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-[12px] text-white"
              style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
            >
              <Settings2 size={16} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#111111]">Comment Automation</h3>
              <p className="text-[12px] text-[#71717a]">Configure auto-replies for this reel</p>
            </div>
          </div>

          {/* Reel preview */}
          <div className="mt-5 flex items-center gap-3 rounded-[16px] bg-[#fafafb] p-4">
            {thumbnail ? (
              <img src={thumbnail} alt="Reel" className="h-14 w-10 rounded-[10px] object-cover" />
            ) : (
              <div className="flex h-14 w-10 items-center justify-center rounded-[10px] bg-[#f4f4f5]">
                <Play size={18} className="text-[#d4d4d8]" />
              </div>
            )}
            <p className="line-clamp-2 text-[13px] text-[#71717a]">{reel.caption || "No caption"}</p>
          </div>

          <form onSubmit={handleSubmit(onSave)} className="mt-6 space-y-5">
            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-[16px] border border-black/[0.06] bg-[#fafafb] px-4 py-3">
              <div>
                <p className="text-[13px] font-semibold text-[#111111]">Automation active</p>
                <p className="text-[11px] text-[#71717a]">Enable or pause this rule</p>
              </div>
              <button
                type="button"
                id="toggle-active"
                onClick={() => setValue("active", !active)}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 ${
                  active ? "bg-green-500" : "bg-[#e4e4e7]"
                }`}
              >
                <span
                  className={`absolute top-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    active ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Keywords */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#111111]">
                <Hash size={13} className="text-[#71717a]" />
                Trigger keywords
                <span className="font-normal text-[#a1a1aa]">— comma separated</span>
              </label>
              <input
                id="keywords-input"
                {...register("keywords")}
                placeholder="e.g. price, info, details"
                className="w-full rounded-[16px] border border-black/[0.08] bg-white px-4 py-3 text-[13px] text-[#111111] placeholder-[#a1a1aa] outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              />
              {keywordTags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {keywordTags.map((kw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-[#f4f4f5] px-3 py-1 text-[11px] font-medium text-[#71717a]"
                    >
                      {kw}
                      <button type="button" onClick={() => removeKeyword(i)} className="opacity-50 hover:opacity-100">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Comment Reply */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#111111]">
                <MessageCircle size={13} className="text-blue-500" />
                Comment reply
              </label>
              <textarea
                id="comment-reply-input"
                {...register("commentReply")}
                rows={3}
                placeholder="Write your auto-reply comment…"
                className="w-full resize-none rounded-[16px] border border-black/[0.08] bg-white px-4 py-3 text-[13px] text-[#111111] placeholder-[#a1a1aa] outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* DM Message */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#111111]">
                <Send size={13} className="text-violet-500" />
                DM message
                <span className="font-normal text-[#a1a1aa]">— private reply to commenter</span>
              </label>
              <textarea
                id="dm-message-input"
                {...register("dmMessage")}
                rows={3}
                placeholder="Write the private message to send…"
                className="w-full resize-none rounded-[16px] border border-black/[0.08] bg-white px-4 py-3 text-[13px] text-[#111111] placeholder-[#a1a1aa] outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-[14px] border border-black/[0.08] bg-white py-3 text-[13px] font-semibold text-[#111111] transition hover:bg-[#fafafb]"
              >
                Cancel
              </button>
              <button
                id="save-automation-btn"
                type="submit"
                disabled={isSaving}
                className="flex flex-1 items-center justify-center gap-2 rounded-[14px] py-3 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                {isSaving ? "Saving…" : "Save automation"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

/* ── DM Automation Modal ── */
function DMAutomationModal({ onClose, onSave, isSaving }: {
  onClose: () => void;
  onSave: (data: DMAutomationForm) => void;
  isSaving: boolean;
}) {
  const { register, handleSubmit, watch, setValue } = useForm<DMAutomationForm>({
    defaultValues: { keywords: "", dmReplyMessage: "", active: true },
  });
  const active = watch("active");
  const keywordsRaw = watch("keywords");
  const keywordTags = keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean);

  const removeKeyword = (idx: number) => {
    setValue("keywords", keywordTags.filter((_, i) => i !== idx).join(", "));
  };

  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.16)]"
      >
        <button
          id="close-dm-automation-modal"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-[8px] p-1.5 text-[#a1a1aa] transition hover:bg-[#f4f4f5] hover:text-[#71717a]"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-violet-50">
              <Mail size={16} className="text-violet-600" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#111111]">DM Automation</h3>
              <p className="text-[12px] text-[#71717a]">Auto-reply to incoming messages</p>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-[16px] border border-blue-100 bg-blue-50 p-4">
            <Inbox size={15} className="mt-0.5 shrink-0 text-blue-500" />
            <p className="text-[12px] leading-[1.6] text-blue-700">
              When someone sends a DM matching your keywords, the auto-reply fires automatically.
              Leave keywords empty to reply to all incoming DMs.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSave)} className="mt-6 space-y-5">
            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-[16px] border border-black/[0.06] bg-[#fafafb] px-4 py-3">
              <div>
                <p className="text-[13px] font-semibold text-[#111111]">Automation active</p>
                <p className="text-[11px] text-[#71717a]">Enable or pause this rule</p>
              </div>
              <button
                type="button"
                id="toggle-dm-active"
                onClick={() => setValue("active", !active)}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 ${
                  active ? "bg-green-500" : "bg-[#e4e4e7]"
                }`}
              >
                <span
                  className={`absolute top-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    active ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Keywords */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#111111]">
                <Hash size={13} className="text-[#71717a]" />
                Trigger keywords
                <span className="font-normal text-[#a1a1aa]">— comma separated</span>
              </label>
              <input
                id="dm-keywords-input"
                {...register("keywords")}
                placeholder="e.g. hello, help, price"
                className="w-full rounded-[16px] border border-black/[0.08] bg-white px-4 py-3 text-[13px] text-[#111111] placeholder-[#a1a1aa] outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              />
              {keywordTags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {keywordTags.map((kw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-[#f4f4f5] px-3 py-1 text-[11px] font-medium text-[#71717a]"
                    >
                      {kw}
                      <button type="button" onClick={() => removeKeyword(i)} className="opacity-50 hover:opacity-100">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Reply message */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#111111]">
                <Send size={13} className="text-violet-500" />
                Auto-reply message
              </label>
              <textarea
                id="dm-reply-message-input"
                {...register("dmReplyMessage", { required: true })}
                rows={4}
                placeholder="Write the automatic reply message…"
                className="w-full resize-none rounded-[16px] border border-black/[0.08] bg-white px-4 py-3 text-[13px] text-[#111111] placeholder-[#a1a1aa] outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-[14px] border border-black/[0.08] bg-white py-3 text-[13px] font-semibold text-[#111111] transition hover:bg-[#fafafb]"
              >
                Cancel
              </button>
              <button
                id="save-dm-automation-btn"
                type="submit"
                disabled={isSaving}
                className="flex flex-1 items-center justify-center gap-2 rounded-[14px] py-3 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                {isSaving ? "Saving…" : "Save DM rule"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
