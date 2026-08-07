export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-[20px] border border-black/[0.06] bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)] dark:border-white/[0.06] dark:bg-[#111114]">
      <div className="h-3 w-20 rounded-full bg-[#f4f4f5] dark:bg-white/10" />
      <div className="mt-3 h-7 w-14 rounded-lg bg-[#f4f4f5] dark:bg-white/10" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 border-b border-black/[0.04] px-6 py-4 dark:border-white/[0.04]">
      <div className="h-3 w-24 rounded-full bg-[#f4f4f5] dark:bg-white/10" />
      <div className="h-3 w-32 rounded-full bg-[#f4f4f5] dark:bg-white/10" />
      <div className="h-3 w-20 rounded-full bg-[#f4f4f5] dark:bg-white/10" />
    </div>
  );
}
