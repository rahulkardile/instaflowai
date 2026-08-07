import { Check, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Toast } from "./types";

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
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
            className={`pointer-events-auto flex items-center gap-3 rounded-[16px] border px-4 py-3 text-[13px] font-medium shadow-[0_4px_16px_rgba(0,0,0,0.10)] backdrop-blur-xl dark:bg-[#111114] dark:border-white/[0.1] ${
              t.type === "success"
                ? "border-green-200/60 bg-white text-green-800 dark:text-green-300"
                : "border-red-200/60 bg-white text-red-800 dark:text-red-300"
            }`}
          >
            {t.type === "success" ? (
              <Check size={14} className="text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle size={14} className="text-red-600 dark:text-red-400" />
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
