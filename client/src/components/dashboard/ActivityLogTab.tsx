import { Activity, Clock, Check, AlertCircle, ChevronDown } from "lucide-react";
import type { LogEntry } from "./types";
import { SkeletonRow } from "./Skeletons";
import { EmptyState } from "./EmptyState";

interface ActivityLogTabProps {
  logs: LogEntry[];
  isLoading: boolean;
  logLimit: number;
  onLoadMore: () => void;
}

export function ActivityLogTab({ logs, isLoading, logLimit, onLoadMore }: ActivityLogTabProps) {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold tracking-[-0.015em] text-[#111111] dark:text-white">Activity Log</h2>
          <p className="mt-1 text-[13px] text-[#71717a] dark:text-[#a1a1aa]">Every automation action, in real-time.</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-[#f4f4f5] px-3 py-1.5 text-[12px] font-medium text-[#71717a] dark:bg-white/10 dark:text-[#a1a1aa]">
          <Activity size={11} />
          {logs.length} events
        </span>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)] dark:border-white/[0.06] dark:bg-[#111114]">
        {isLoading ? (
          <div>
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState icon={<Activity size={36} strokeWidth={1.5} />} title="No activity yet" desc="Automation events will appear here once triggered." />
        ) : (
          <>
            <div className="grid grid-cols-[1fr_1fr_2fr_1fr_80px] gap-4 border-b border-black/[0.05] bg-[#fafafb] px-6 py-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
              {["Time", "From", "Message", "Action", "Status"].map((h) => (
                <p key={h} className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#a1a1aa] dark:text-[#71717a]">{h}</p>
              ))}
            </div>
            {logs.slice(0, logLimit).map((log) => (
              <div
                key={log._id}
                className="grid grid-cols-[1fr_1fr_2fr_1fr_80px] gap-4 border-b border-black/[0.04] px-6 py-4 text-[13px] transition hover:bg-[#fafafb] dark:border-white/[0.04] dark:hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-1.5 text-[#a1a1aa]">
                  <Clock size={11} />
                  <span className="truncate">{new Date(log.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="truncate font-medium text-[#111111] dark:text-white">
                  {log.commenterUsername || log.dmSenderId || "—"}
                </p>
                <p className="truncate text-[#71717a] dark:text-[#a1a1aa]">
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
              <div className="border-t border-black/[0.04] py-4 text-center dark:border-white/[0.04]">
                <button
                  onClick={onLoadMore}
                  className="inline-flex items-center gap-1.5 rounded-[12px] px-5 py-2 text-[13px] font-medium text-[#7c3aed] transition hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/40"
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
  );
}

function ActionBadge({ action }: { action: LogEntry["action"] }) {
  const map: Record<string, { label: string; className: string }> = {
    COMMENT_REPLY: { label: "Reply", className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
    DM_AUTO_REPLY: { label: "DM Auto", className: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" },
    SEND_DM: { label: "Send DM", className: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300" },
    COMMENT_RECEIVED: { label: "Comment In", className: "bg-[#f4f4f5] text-[#71717a] dark:bg-white/10 dark:text-[#a1a1aa]" },
    DM_RECEIVED: { label: "DM In", className: "bg-[#f4f4f5] text-[#71717a] dark:bg-white/10 dark:text-[#a1a1aa]" },
  };
  const { label, className } = map[action] ?? { label: action, className: "bg-[#f4f4f5] text-[#71717a] dark:bg-white/10 dark:text-[#a1a1aa]" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: "SUCCESS" | "FAILED" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        status === "SUCCESS"
          ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
          : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {status === "SUCCESS" ? <Check size={10} /> : <AlertCircle size={10} />}
      {status === "SUCCESS" ? "OK" : "Fail"}
    </span>
  );
}
