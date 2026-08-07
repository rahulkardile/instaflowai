import { useState, useRef, useEffect, type ReactNode } from "react";
import { Unplug, Camera, ChevronRight, Sun, Moon, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { TabId } from "../../constants";
import type { AuthUser } from "../../types/AuthUser";

interface SidebarProps {
  user: AuthUser;
  igAccount?: { username?: string; instagramUserId?: string };
  activeTab: TabId;
  navItems: { id: TabId; label: string; icon: ReactNode; count?: number }[];
  onSelectTab: (tab: TabId) => void;
  onConnectIG: () => void;
  onDisconnectIG: () => void;
  isDisconnecting: boolean;
  isDark: boolean;
  toggleTheme: () => void;
  onTriggerLogoutModal: () => void;
}

export function Sidebar({
  user,
  igAccount,
  activeTab,
  navItems,
  onSelectTab,
  onConnectIG,
  onDisconnectIG,
  isDisconnecting,
  isDark,
  toggleTheme,
  onTriggerLogoutModal,
}: SidebarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-[240px] flex-col border-r border-black/[0.06] bg-white transition-colors dark:border-white/[0.06] dark:bg-[#111114]">

      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-black/[0.05] px-5 dark:border-white/[0.05]">
        <img
          src="/instaFlow-icon.png"
          alt="InstaFlow Logo"
          className="h-8 w-8 shrink-0 rounded-[10px] object-cover"
        />

        <span className="text-[14px] font-semibold tracking-tight text-[#111111] dark:text-white">InstaFlow</span>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 px-2 pt-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a1a1aa] dark:text-[#71717a]">
            Workspace
          </p>
        </div>
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`group flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-all duration-150 ${
                activeTab === item.id
                  ? "bg-violet-50 text-[#7c3aed] dark:bg-violet-950/40 dark:text-violet-300"
                  : "text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#111111] dark:text-[#a1a1aa] dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              <span className={activeTab === item.id ? "text-[#7c3aed] dark:text-violet-400" : "text-[#a1a1aa] group-hover:text-[#71717a] dark:text-[#71717a]"}>
                {item.icon}
              </span>
              <span className="flex-1 text-[13px] font-medium">{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    activeTab === item.id
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
                      : "bg-[#f4f4f5] text-[#71717a] dark:bg-white/10 dark:text-[#a1a1aa]"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Bottom Area: IG Status + Profile Menu Trigger */}
      <div className="border-t border-black/[0.05] p-3 space-y-2 dark:border-white/[0.05]">
        {/* Instagram Account Connected Status */}
        {user.instagramConnected ? (
          <div className="flex items-center justify-between rounded-[12px] bg-green-50/80 px-3 py-2 dark:bg-green-950/30">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
              <span className="text-[12px] font-medium text-green-800 dark:text-green-300">
                {igAccount ? `@${igAccount.username}` : "Connected"}
              </span>
            </div>
            <button
              onClick={onDisconnectIG}
              disabled={isDisconnecting}
              className="text-[11px] text-red-500 transition hover:text-red-700 disabled:opacity-50 dark:text-red-400"
              aria-label="Disconnect Instagram"
              title="Disconnect Account"
            >
              <Unplug size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={onConnectIG}
            className="flex w-full items-center gap-2 rounded-[12px] border border-dashed border-black/[0.12] px-3 py-2 text-[12px] font-medium text-[#71717a] transition hover:border-violet-300 hover:bg-violet-50 hover:text-[#7c3aed] dark:border-white/[0.15] dark:text-[#a1a1aa] dark:hover:bg-white/5 dark:hover:text-white"
          >
            <Camera size={14} />
            Connect Instagram
          </button>
        )}

        {/* Profile Popover Menu Trigger (NO DIRECT LOGOUT BUTTON) */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-left transition hover:bg-[#f4f4f5] dark:hover:bg-white/5"
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                {user.name?.[0]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-[#111111] dark:text-white">{user.name}</p>
              <p className="truncate text-[10px] text-[#a1a1aa]">{user.email}</p>
            </div>
            <ChevronRight size={14} className={`text-[#a1a1aa] transition-transform ${showProfileMenu ? "rotate-90" : ""}`} />
          </button>

          {/* Profile Popover Menu */}
          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute bottom-full left-0 mb-2 w-full rounded-[16px] border border-black/[0.08] bg-white p-2 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:border-white/[0.1] dark:bg-[#18181b]"
              >
                <div className="px-3 py-2 border-b border-black/[0.05] dark:border-white/[0.06]">
                  <p className="text-[12px] font-semibold text-[#111111] dark:text-white">{user.name}</p>
                  <p className="truncate text-[11px] text-[#71717a] dark:text-[#a1a1aa]">{user.email}</p>
                </div>

                <div className="py-1">
                  {/* Theme Toggle Option */}
                  <button
                    onClick={toggleTheme}
                    className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-[12px] font-medium text-[#71717a] transition hover:bg-[#fafafb] hover:text-[#111111] dark:text-[#a1a1aa] dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    <span className="flex items-center gap-2">
                      {isDark ? <Sun size={14} /> : <Moon size={14} />}
                      {isDark ? "Light theme" : "Dark theme"}
                    </span>
                    <span className="text-[10px] text-[#a1a1aa]">{isDark ? "Dark" : "Light"}</span>
                  </button>

                  {/* Sign Out Button */}
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onTriggerLogoutModal();
                    }}
                    className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[12px] font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <LogOut size={14} />
                    Sign out…
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
