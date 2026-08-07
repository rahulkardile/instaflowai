import { MessageCircle, Plus, Loader2, Film, Hash, Trash2, Send } from "lucide-react";
import type { Reel, Automation } from "./types";
import { EmptyState } from "./EmptyState";

interface CommentAutomationsTabProps {
  automations: Automation[];
  reels: Reel[];
  isLoading: boolean;
  onGoToReels: () => void;
  onToggleAutomation: (id: string, enabled: boolean) => void;
  onDeleteAutomation: (id: string) => void;
  isDeleting: boolean;
}

export function CommentAutomationsTab({
  automations,
  reels,
  isLoading,
  onGoToReels,
  onToggleAutomation,
  onDeleteAutomation,
  isDeleting,
}: CommentAutomationsTabProps) {
  const commentAutomations = automations.filter((a) => a.type === "COMMENT" || !a.type);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold tracking-[-0.015em] text-[#111111] dark:text-white">Comment Automations</h2>
          <p className="mt-1 text-[13px] text-[#71717a] dark:text-[#a1a1aa]">Keyword-triggered replies and DMs for your reels.</p>
        </div>
        <button
          onClick={onGoToReels}
          className="flex items-center gap-2 rounded-[14px] px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
        >
          <Plus size={14} />
          New automation
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#a1a1aa]" />
        </div>
      ) : commentAutomations.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={36} strokeWidth={1.5} />}
          title="No comment automations yet"
          desc="Go to Reels and click Automate on a reel to create one."
          cta={{ label: "Go to Reels", onClick: onGoToReels }}
        />
      ) : (
        <div className="space-y-3">
          {commentAutomations.map((automation) => (
            <AutomationCard
              key={automation._id}
              automation={automation}
              reel={reels.find((r) => r.id === automation.reelId)}
              onToggle={(enabled) => onToggleAutomation(automation._id, enabled)}
              onDelete={() => onDeleteAutomation(automation._id)}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AutomationCard({ automation, reel, onToggle, onDelete, isDeleting }: {
  automation: Automation;
  reel?: Reel;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const thumbnail = reel?.thumbnail_url || reel?.media_url;
  return (
    <div className="flex items-start gap-5 rounded-[20px] border border-black/[0.06] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] dark:border-white/[0.06] dark:bg-[#111114]">
      {/* Reel thumbnail */}
      <div className="h-16 w-11 shrink-0 overflow-hidden rounded-[10px] bg-[#f4f4f5] dark:bg-white/10">
        {thumbnail ? (
          <img src={thumbnail} alt="Reel" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Film size={16} className="text-[#d4d4d8] dark:text-[#71717a]" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[#111111] dark:text-white">
              {reel?.caption
                ? reel.caption.slice(0, 80) + (reel.caption.length > 80 ? "…" : "")
                : `Reel · ${automation.reelId?.slice(0, 10)}…`}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {automation.keywords.length > 0 ? (
                automation.keywords.slice(0, 6).map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-black/[0.06] bg-[#f4f4f5] px-2 py-0.5 text-[11px] font-medium text-[#71717a] dark:border-white/[0.06] dark:bg-white/10 dark:text-[#a1a1aa]"
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
                automation.enabled ? "bg-green-500" : "bg-[#e4e4e7] dark:bg-white/20"
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
              className="rounded-[8px] p-1.5 text-[#d4d4d8] transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:text-[#71717a] dark:hover:bg-red-950/40 dark:hover:text-red-400"
              aria-label="Delete automation"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {automation.commentReply && (
            <div className="flex items-start gap-2 rounded-[10px] bg-blue-50/70 px-3 py-2 dark:bg-blue-950/30">
              <MessageCircle size={11} className="mt-0.5 shrink-0 text-blue-500" />
              <p className="truncate text-[12px] text-blue-700 dark:text-blue-300">{automation.commentReply}</p>
            </div>
          )}
          {automation.dmMessage && (
            <div className="flex items-start gap-2 rounded-[10px] bg-violet-50/70 px-3 py-2 dark:bg-violet-950/30">
              <Send size={11} className="mt-0.5 shrink-0 text-violet-500" />
              <p className="truncate text-[12px] text-violet-700 dark:text-violet-300">{automation.dmMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
