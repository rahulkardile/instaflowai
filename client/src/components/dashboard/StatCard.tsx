import type { ReactNode } from "react";

const accentMap = {
  green: { icon: "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400", val: "text-green-700 dark:text-green-400" },
  violet: { icon: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400", val: "text-[#111111] dark:text-white" },
  blue: { icon: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400", val: "text-[#111111] dark:text-white" },
  zinc: { icon: "bg-[#f4f4f5] text-[#71717a] dark:bg-white/10 dark:text-[#a1a1aa]", val: "text-[#111111] dark:text-white" },
} as const;

export function StatCard({ icon, label, value, accent }: {
  icon: ReactNode;
  label: string;
  value: string;
  accent: keyof typeof accentMap;
}) {
  const a = accentMap[accent];
  return (
    <div className="group rounded-[20px] border border-black/[0.06] bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:border-white/[0.06] dark:bg-[#111114]">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-[#71717a] dark:text-[#a1a1aa]">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${a.icon}`}>
          {icon}
        </div>
      </div>
      <p className={`mt-3 text-[24px] font-black tracking-tight ${a.val}`}>{value}</p>
    </div>
  );
}
