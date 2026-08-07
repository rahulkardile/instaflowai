import { useEffect } from "react";
import { Trash2, LogOut, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export function ConfirmDeleteModal({ onConfirm, onCancel, isPending }: {
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
        className="w-full max-w-sm rounded-[28px] bg-white p-7 shadow-[0_8px_40px_rgba(0,0,0,0.14)] dark:bg-[#111114] dark:border dark:border-white/[0.08]"
      >
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-[14px] bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
          <Trash2 size={18} />
        </div>
        <h3 className="text-[17px] font-semibold text-[#111111] dark:text-white">Delete automation?</h3>
        <p className="mt-1.5 text-[13px] leading-[1.6] text-[#71717a] dark:text-[#a1a1aa]">
          This action cannot be undone. The automation rule will be permanently removed.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-[14px] border border-black/[0.08] bg-white py-2.5 text-[13px] font-semibold text-[#111111] transition hover:bg-[#f4f4f5] dark:border-white/[0.1] dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
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

export function ConfirmLogoutModal({ onConfirm, onCancel }: {
  onConfirm: () => void;
  onCancel: () => void;
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
        className="w-full max-w-sm rounded-[28px] bg-white p-7 shadow-[0_8px_40px_rgba(0,0,0,0.14)] dark:bg-[#111114] dark:border dark:border-white/[0.08]"
      >
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-[14px] bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
          <LogOut size={18} />
        </div>
        <h3 className="text-[17px] font-semibold text-[#111111] dark:text-white">Sign out of InstaFlow?</h3>
        <p className="mt-1.5 text-[13px] leading-[1.6] text-[#71717a] dark:text-[#a1a1aa]">
          You will need to sign in again to manage your Instagram automations.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-[14px] border border-black/[0.08] bg-white py-2.5 text-[13px] font-semibold text-[#111111] transition hover:bg-[#f4f4f5] dark:border-white/[0.1] dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#111111] py-2.5 text-[13px] font-semibold text-white transition hover:bg-black dark:bg-white dark:text-[#111111] dark:hover:bg-slate-200"
          >
            Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
}
