import { Sun, Moon, Camera } from "lucide-react";

interface DashboardHeaderProps {
  title: string;
  isInstagramConnected: boolean;
  onConnectIG: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export function DashboardHeader({
  title,
  isInstagramConnected,
  onConnectIG,
  isDark,
  toggleTheme,
}: DashboardHeaderProps) {
  return (
    <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/[0.05] bg-white/80 px-8 backdrop-blur-xl transition-colors dark:border-white/[0.05] dark:bg-[#09090b]/80">
      <div>
        <h1 className="text-[15px] font-semibold text-[#111111] dark:text-white">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {/* Dark / Light Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-[#fafafb] text-[#71717a] transition hover:bg-[#f4f4f5] dark:border-white/[0.1] dark:bg-white/5 dark:text-[#a1a1aa] dark:hover:bg-white/10"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Connect IG button if not connected */}
        {!isInstagramConnected && (
          <button
            onClick={onConnectIG}
            className="flex items-center gap-2 rounded-[14px] px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
          >
            <Camera size={14} />
            Connect Instagram
          </button>
        )}
      </div>
    </div>
  );
}
