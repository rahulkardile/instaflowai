import { Play, Eye, Heart, MessageSquare, Zap, Image as ImageIcon } from "lucide-react";
import type { Reel, Automation } from "./types";
import { EmptyState } from "./EmptyState";

interface ReelsTabProps {
  reels: Reel[];
  automations: Automation[];
  isLoading: boolean;
  onAutomateReel: (reel: Reel) => void;
}

export function ReelsTab({ reels, automations, isLoading, onAutomateReel }: ReelsTabProps) {
  const commentAutomations = automations.filter((a) => a.type === "COMMENT" || !a.type);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold tracking-[-0.015em] text-[#111111] dark:text-white">Your Reels</h2>
          <p className="mt-1 text-[13px] text-[#71717a] dark:text-[#a1a1aa]">
            Click Automate on any reel to create a keyword-triggered automation.
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-[#f4f4f5] px-3 py-1.5 text-[12px] font-medium text-[#71717a] dark:bg-white/10 dark:text-[#a1a1aa]">
          <Play size={11} />
          {reels.length} reels
        </span>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-[20px] border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)] dark:border-white/[0.06] dark:bg-[#111114]">
              <div className="aspect-[9/16] max-h-56 rounded-t-[20px] bg-[#f4f4f5] dark:bg-white/10" />
              <div className="p-4 space-y-2">
                <div className="h-2.5 w-3/4 rounded-full bg-[#f4f4f5] dark:bg-white/10" />
                <div className="h-8 w-full rounded-[12px] bg-[#f4f4f5] dark:bg-white/10" />
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
              onAutomate={() => onAutomateReel(reel)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReelCard({ reel, hasAutomation, onAutomate }: {
  reel: Reel;
  hasAutomation: boolean;
  onAutomate: () => void;
}) {
  const thumbnail = reel.thumbnail_url || reel.media_url;
  return (
    <div className="group overflow-hidden rounded-[20px] border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.09)] dark:border-white/[0.06] dark:bg-[#111114]">
      <div className="relative aspect-[9/16] max-h-64 w-full overflow-hidden bg-[#f4f4f5] dark:bg-white/5">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={reel.caption || "Reel"}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Play size={32} className="text-[#d4d4d8] dark:text-[#71717a]" strokeWidth={1.5} />
          </div>
        )}
        {hasAutomation && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-green-700 shadow-sm backdrop-blur-sm dark:bg-[#111114]/90 dark:text-green-400">
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
              className="flex items-center gap-1.5 rounded-[10px] bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-[#111111] backdrop-blur-sm no-underline dark:bg-[#18181b] dark:text-white"
            >
              <Eye size={12} />
              View
            </a>
          )}
        </div>
      </div>

      <div className="p-4">
        <p className="line-clamp-2 text-[12px] leading-[1.5] text-[#71717a] dark:text-[#a1a1aa]">
          {reel.caption || "No caption"}
        </p>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-[#a1a1aa] dark:text-[#71717a]">
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
              ? "border border-black/[0.08] bg-white text-[#111111] dark:border-white/[0.1] dark:bg-white/5 dark:text-white"
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
