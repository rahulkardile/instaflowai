import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import api from "../utils/api";
import Header from "../components/layout/Header";
import { auth } from "../utils/auth";
import { Loader2, Image as ImageIcon, Play, Eye, Heart, MessageSquare, Zap, X, Hash, MessageCircle, Send, Settings2, Check, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";

interface Reel {
  id: string;
  caption?: string;
  thumbnail_url?: string;
  media_url?: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
}

interface AutomationForm {
  keywords: string;
  commentReply: string;
  dmMessage: string;
  active: boolean;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

let toastId = 0;

export default function Reels() {
  const session = auth.get();
  const queryClient = useQueryClient();
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  if (!session) return <Navigate to="/login" replace />;

  const pushToast = (message: string, type: "success" | "error") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const { data: reels = [], isLoading } = useQuery<Reel[]>({
    queryKey: ["reels"],
    queryFn: async () => {
      const { data } = await api.get("/instagram/reels");
      return Array.isArray(data?.data) ? data.data : [];
    },
    enabled: session.user.instagramConnected,
  });

  const { data: automations = [] } = useQuery<{ _id: string; reelId: string; enabled: boolean }[]>({
    queryKey: ["automations"],
    queryFn: async () => {
      const { data } = await api.get("/automations");
      return Array.isArray(data?.data) ? data.data : [];
    },
  });

  const createAutomationMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
    onError: () => pushToast("Failed to save automation", "error"),
  });

  return (
    <>
      <Header />

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-purple-400/10 blur-[160px]" />
        <div className="absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full bg-pink-400/8 blur-[140px]" />
      </div>

      <main className="min-h-screen bg-slate-50/80 pb-20">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your Reels</h1>
              <p className="mt-1 text-sm text-slate-500">
                Click <strong>Automate</strong> to set up keyword-triggered replies & DMs.
              </p>
            </div>
            {!isLoading && (
              <div className="flex items-center gap-2 rounded-full bg-purple-100 px-4 py-1.5 text-sm font-medium text-purple-700">
                <Play size={14} />
                {reels.length} Reels
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-lg">
                  <div className="aspect-[9/16] max-h-56 w-full bg-slate-200" />
                  <div className="p-4">
                    <div className="h-3 w-3/4 rounded bg-slate-200" />
                    <div className="mt-2 h-9 w-full rounded-xl bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : reels.length === 0 ? (
            <div className="rounded-3xl border border-white/20 bg-white/70 py-24 text-center shadow-lg backdrop-blur-xl">
              <ImageIcon size={52} className="mx-auto text-slate-300" />
              <p className="mt-5 text-xl font-semibold text-slate-500">No reels found</p>
              <p className="mt-2 text-sm text-slate-400">Post some Reels on Instagram to get started.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {reels.map((reel) => {
                const thumbnail = reel.thumbnail_url || reel.media_url;
                const hasAutomation = automations.some((a) => a.reelId === reel.id);
                return (
                  <div key={reel.id} className="group overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-lg backdrop-blur-xl transition hover:shadow-xl hover:-translate-y-1">
                    <div className="relative aspect-[9/16] max-h-64 w-full overflow-hidden bg-slate-100">
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
                      {hasAutomation && (
                        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-1 text-xs font-bold text-white shadow">
                          <Zap size={10} />
                          Active
                        </div>
                      )}
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
                    <div className="p-4">
                      <p className="line-clamp-2 text-xs text-slate-600 leading-relaxed">
                        {reel.caption || "No caption"}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Heart size={12} className="text-pink-400" />
                          {reel.like_count ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={12} className="text-blue-400" />
                          {reel.comments_count ?? 0}
                        </span>
                      </div>
                      <button
                        id={`automate-reel-${reel.id}`}
                        onClick={() => setSelectedReel(reel)}
                        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-md transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] ${
                          hasAutomation
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                            : "bg-gradient-to-r from-purple-600 to-pink-500 text-white"
                        }`}
                      >
                        <Zap size={13} />
                        {hasAutomation ? "Edit Automation" : "Automate"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {selectedReel && (
        <AutomationModal
          reel={selectedReel}
          onClose={() => setSelectedReel(null)}
          onSave={(data) =>
            createAutomationMutation.mutate({
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

      {/* Toasts */}
      <div className="pointer-events-none fixed right-6 bottom-6 z-[100] flex flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl backdrop-blur-xl ${
              t.type === "success"
                ? "border border-green-200/40 bg-green-50/90 text-green-800"
                : "border border-red-200/40 bg-red-50/90 text-red-800"
            }`}
          >
            {t.type === "success" ? <Check size={16} className="text-green-600" /> : <AlertCircle size={16} className="text-red-600" />}
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}

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
    defaultValues: { keywords: "", commentReply: "", dmMessage: "", active: true },
  });

  const active = watch("active");
  const keywordsRaw = watch("keywords");
  const keywordTags = keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean);
  const removeKeyword = (idx: number) => setValue("keywords", keywordTags.filter((_, i) => i !== idx).join(", "));
  const thumbnail = reel.thumbnail_url || reel.media_url;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100">
          <X size={20} />
        </button>
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500">
              <Settings2 size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Set Up Automation</h3>
              <p className="text-xs text-slate-500">Configure auto-replies and DMs for this reel.</p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
            {thumbnail ? (
              <img src={thumbnail} alt="Reel" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-purple-100">
                <Play size={24} className="text-purple-400" />
              </div>
            )}
            <p className="line-clamp-2 text-sm text-slate-600">{reel.caption || "No caption"}</p>
          </div>
          <form onSubmit={handleSubmit(onSave)} className="mt-6 space-y-5">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Automation Active</p>
                <p className="text-xs text-slate-500">Enable or pause this automation</p>
              </div>
              <button
                type="button"
                onClick={() => setValue("active", !active)}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${active ? "bg-purple-600" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Hash size={14} className="text-purple-500" />
                Trigger Keywords <span className="font-normal text-slate-400">(comma separated)</span>
              </label>
              <input
                {...register("keywords")}
                placeholder="e.g. info, price, details"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              />
              {keywordTags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {keywordTags.map((kw, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                      {kw}
                      <button type="button" onClick={() => removeKeyword(i)}><X size={11} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <MessageCircle size={14} className="text-blue-500" /> Comment Reply
              </label>
              <textarea {...register("commentReply")} rows={3} placeholder="Write your auto-reply comment here…" className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Send size={14} className="text-violet-500" /> DM Message
              </label>
              <textarea {...register("dmMessage")} rows={3} placeholder="Write the private message to send…" className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={isSaving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {isSaving ? "Saving…" : "Save Automation"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
