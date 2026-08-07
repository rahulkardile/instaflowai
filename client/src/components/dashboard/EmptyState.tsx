import type { ReactNode } from "react";

export function EmptyState({ icon, title, desc, cta }: {
  icon: ReactNode;
  title: string;
  desc: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-black/[0.08] bg-white py-20 text-center dark:border-white/[0.1] dark:bg-[#111114]">
      <div className="mb-4 text-[#d4d4d8] dark:text-[#71717a]">{icon}</div>
      <p className="text-[15px] font-semibold text-[#71717a] dark:text-[#a1a1aa]">{title}</p>
      <p className="mt-2 max-w-xs text-[13px] text-[#a1a1aa] dark:text-[#71717a]">{desc}</p>
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
