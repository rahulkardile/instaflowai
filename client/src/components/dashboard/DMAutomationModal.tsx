import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { X, Mail, Inbox, Hash, Send, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { DMAutomationForm } from "./types";

export function DMAutomationModal({ onClose, onSave, isSaving }: {
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
        className="relative max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-white p-5 shadow-[0_16px_48px_rgba(0,0,0,0.16)] sm:rounded-[28px] sm:p-8 dark:bg-[#111114] dark:border dark:border-white/[0.08]"
      >
        <button
          id="close-dm-automation-modal"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-[8px] p-1.5 text-[#a1a1aa] transition hover:bg-[#f4f4f5] hover:text-[#71717a] dark:hover:bg-white/10"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
            <Mail size={16} />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-[#111111] dark:text-white">DM Automation</h3>
            <p className="text-[12px] text-[#71717a] dark:text-[#a1a1aa]">Auto-reply to incoming messages</p>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-[16px] border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
          <Inbox size={15} className="mt-0.5 shrink-0 text-blue-500" />
          <p className="text-[12px] leading-[1.6] text-blue-700 dark:text-blue-300">
            When someone sends a DM matching your keywords, the auto-reply fires automatically.
            Leave keywords empty to reply to all incoming DMs.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="mt-6 space-y-5">
          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-[16px] border border-black/[0.06] bg-[#fafafb] px-4 py-3 dark:border-white/[0.06] dark:bg-white/5">
            <div>
              <p className="text-[13px] font-semibold text-[#111111] dark:text-white">Automation active</p>
              <p className="text-[11px] text-[#71717a] dark:text-[#a1a1aa]">Enable or pause this rule</p>
            </div>
            <button
              type="button"
              id="toggle-dm-active"
              onClick={() => setValue("active", !active)}
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 ${
                active ? "bg-green-500" : "bg-[#e4e4e7] dark:bg-white/20"
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
            <label className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#111111] dark:text-white">
              <Hash size={13} className="text-[#71717a]" />
              Trigger keywords
              <span className="font-normal text-[#a1a1aa]">— comma separated</span>
            </label>
            <input
              id="dm-keywords-input"
              {...register("keywords")}
              placeholder="e.g. hello, help, price"
              className="w-full rounded-[16px] border border-black/[0.08] bg-white px-4 py-3 text-[13px] text-[#111111] placeholder-[#a1a1aa] outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 dark:border-white/[0.1] dark:bg-white/5 dark:text-white dark:focus:border-violet-500"
            />
            {keywordTags.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {keywordTags.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-[#f4f4f5] px-3 py-1 text-[11px] font-medium text-[#71717a] dark:border-white/[0.06] dark:bg-white/10 dark:text-[#a1a1aa]"
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
            <label className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#111111] dark:text-white">
              <Send size={13} className="text-violet-500" />
              Auto-reply message
            </label>
            <textarea
              id="dm-reply-message-input"
              {...register("dmReplyMessage", { required: true })}
              rows={4}
              placeholder="Write the automatic reply message…"
              className="w-full resize-none rounded-[16px] border border-black/[0.08] bg-white px-4 py-3 text-[13px] text-[#111111] placeholder-[#a1a1aa] outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 dark:border-white/[0.1] dark:bg-white/5 dark:text-white dark:focus:border-violet-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[14px] border border-black/[0.08] bg-white py-3 text-[13px] font-semibold text-[#111111] transition hover:bg-[#fafafb] dark:border-white/[0.1] dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
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
      </motion.div>
    </div>
  );
}
