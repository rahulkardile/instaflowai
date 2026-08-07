import { Mail, Plus, Loader2, Hash, Trash2, Send } from "lucide-react";
import type { Automation } from "./types";
import { EmptyState } from "./EmptyState";

interface DMAutomationsTabProps {
  automations: Automation[];
  isLoading: boolean;
  onOpenDMModal: () => void;
  onToggleAutomation: (id: string, enabled: boolean) => void;
  onDeleteAutomation: (id: string) => void;
  isDeleting: boolean;
}

export function DMAutomationsTab({
  automations,
  isLoading,
  onOpenDMModal,
  onToggleAutomation,
  onDeleteAutomation,
  isDeleting,
}: DMAutomationsTabProps) {
  const dmAutomations = automations.filter((a) => a.type === "DM");

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold tracking-[-0.015em] text-[#111111] dark:text-white">DM Automations</h2>
          <p className="mt-1 text-[13px] text-[#71717a] dark:text-[#a1a1aa]">Auto-reply to incoming direct messages with keyword triggers.</p>
        </div>
        <button
          onClick={onOpenDMModal}
          className="flex items-center gap-2 rounded-[14px] px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
        >
          <Plus size={14} />
          New DM rule
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#a1a1aa]" />
        </div>
      ) : dmAutomations.length === 0 ? (
        <EmptyState
          icon={<Mail size={36} strokeWidth={1.5} />}
          title="No DM automations yet"
          desc="Create a rule to auto-reply when someone sends you a keyword-containing DM."
          cta={{ label: "Create DM rule", onClick: onOpenDMModal }}
        />
      ) : (
        <div className="space-y-3">
          {dmAutomations.map((automation) => (
            <DMAutomationCard
              key={automation._id}
              automation={automation}
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

function DMAutomationCard({ automation, onToggle, onDelete, isDeleting }: {
  automation: Automation;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-start gap-5 rounded-[20px] border border-black/[0.06] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] dark:border-white/[0.06] dark:bg-[#111114]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
        <Mail size={18} strokeWidth={1.75} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#111111] dark:text-white">DM Auto-Reply</p>
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
                <span className="text-[11px] text-[#a1a1aa]">Matches all DMs</span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              id={`toggle-dm-automation-${automation._id}`}
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
              id={`delete-dm-automation-${automation._id}`}
              onClick={onDelete}
              disabled={isDeleting}
              className="rounded-[8px] p-1.5 text-[#d4d4d8] transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:text-[#71717a] dark:hover:bg-red-950/40 dark:hover:text-red-400"
              aria-label="Delete DM automation"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {automation.dmReplyMessage && (
          <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-violet-50/70 px-3 py-2 dark:bg-violet-950/30">
            <Send size={11} className="mt-0.5 shrink-0 text-violet-500" />
            <p className="text-[12px] text-violet-700 dark:text-violet-300">{automation.dmReplyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
