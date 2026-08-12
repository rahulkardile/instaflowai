import { useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Activity, Zap, TrendingUp, Shield, Database,
  ChevronRight, Search, CheckCircle, XCircle, Edit3,
  Trash2, RefreshCw, X, Check, Loader2, AlertCircle,
  BarChart3, Clock, ArrowLeft, Eye, EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../utils/auth";
import api from "../utils/api";
import { QUERY_KEYS, CACHE, API, ADMIN_TABS, type AdminTabId, ROUTES } from "../constants";
import { useTheme } from "../hooks/useTheme";

/* ──────────────────────────────────────────────────────────── Types */
interface AdminStats {
  users: {
    total: number; active: number; inactive: number;
    igConnected: number; currentlyActive: number; newToday: number;
  };
  automations: { total: number; enabled: number; disabled: number };
  executions: {
    total: number; success: number; failed: number;
    successRate: string; conversations: number;
  };
  cache: { size: number; hits: number; misses: number; hitRate: string };
}

interface DauEntry { date: string; count: number }

interface AdminUser {
  _id: string; name: string; email: string; role: string;
  isActive: boolean; instagramConnected: boolean;
  createdAt: string; lastLoginAt?: string; avatar?: string;
}

interface AdminLog {
  _id: string; action: string; status: string;
  createdAt: string; errorMessage?: string;
  userId?: { name: string; email: string };
  automationId?: { type: string; keywords: string[] };
  commentText?: string; dmText?: string;
}

interface Toast { id: number; message: string; type: "success" | "error" }

let toastId = 0;

/* ─── Helpers ─────────────────────────────────────────────────────── */
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function relativeTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ─── Mini sparkline chart ────────────────────────────────────────── */
function DauChart({ data }: { data: DauEntry[] }) {
  if (!data.length) return <div className="h-32 flex items-center justify-center text-sm text-zinc-400">No data</div>;

  const max = Math.max(...data.map(d => d.count), 1);
  const W = 560; const H = 100; const PAD = 8;
  const xStep = (W - PAD * 2) / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => ({
    x: PAD + i * xStep,
    y: H - PAD - ((d.count / max) * (H - PAD * 2)),
    count: d.count,
    date: d.date,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${H} L ${points[0].x.toFixed(1)} ${H} Z`;

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28">
        <defs>
          <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#dauGrad)" />
        <path d={pathD} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#7c3aed" opacity="0.8">
            <title>{`${p.date}: ${p.count} users`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-zinc-400 mt-1 px-1">
        <span>{data[0]?.date}</span>
        <span>{data[Math.floor(data.length / 2)]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

/* ─── Stat Card ───────────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: typeof Users; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white dark:bg-zinc-900 p-5 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
          <p className="mt-1.5 text-3xl font-bold text-zinc-900 dark:text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon size={18} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Toast ───────────────────────────────────────────────────────── */
function ToastList({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-xl
              ${t.type === "success"
                ? "bg-white dark:bg-zinc-900 border-green-200/60 text-green-800 dark:text-green-300"
                : "bg-white dark:bg-zinc-900 border-red-200/60 text-red-800 dark:text-red-300"}`}
          >
            {t.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
            {t.message}
            <button onClick={() => onDismiss(t.id)} className="ml-1 opacity-40 hover:opacity-80"><X size={12} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Edit User Modal ─────────────────────────────────────────────── */
function EditUserModal({ user, onClose, onSave, isSaving }: {
  user: AdminUser; onClose: () => void;
  onSave: (data: Partial<AdminUser>) => void; isSaving: boolean;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.isActive);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 p-7 shadow-2xl border border-zinc-200/60 dark:border-zinc-700/40"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Edit User</h3>
            <p className="text-xs text-zinc-400 mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X size={16} className="text-zinc-500" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => setIsActive(a => !a)}
              className={`relative h-6 w-10 rounded-full transition-colors ${isActive ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-600"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Account Active</span>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            Cancel
          </button>
          <button onClick={() => onSave({ name, email, role: role as "user" | "admin", isActive })}
            disabled={isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Overview Tab ────────────────────────────────────────────────── */
function OverviewTab({ stats, dau, activeUsers }: {
  stats: AdminStats | undefined;
  dau: DauEntry[] | undefined;
  activeUsers: { count: number; users: AdminUser[] } | undefined;
}) {
  if (!stats) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-violet-500" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Users" value={stats.users.total}
          sub={`+${stats.users.newToday} today`}
          icon={Users} color="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400" />
        <StatCard label="Currently Active" value={stats.users.currentlyActive}
          sub="Last 15 minutes"
          icon={Activity} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" />
        <StatCard label="IG Connected" value={stats.users.igConnected}
          sub={`${((stats.users.igConnected / Math.max(stats.users.total, 1)) * 100).toFixed(0)}% of users`}
          icon={TrendingUp} color="bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-400" />
        <StatCard label="Total Automations" value={stats.automations.total}
          sub={`${stats.automations.enabled} enabled`}
          icon={Zap} color="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" />
        <StatCard label="Executions" value={stats.executions.total}
          sub={`${stats.executions.successRate} success rate`}
          icon={BarChart3} color="bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400" />
        <StatCard label="DM Threads" value={stats.executions.conversations}
          icon={TrendingUp} color="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400" />
      </div>

      {/* Success vs Fail */}
      <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Execution Status</h3>
        <div className="flex gap-4 items-center">
          <div className="flex-1 h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-violet-500 transition-all"
              style={{ width: stats.executions.total > 0 ? `${(stats.executions.success / stats.executions.total) * 100}%` : "0%" }}
            />
          </div>
          <div className="flex gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {stats.executions.success} success</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" /> {stats.executions.failed} failed</span>
          </div>
        </div>
      </div>

      {/* DAU Chart */}
      <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Daily Active Users (30 days)</h3>
        </div>
        <DauChart data={dau ?? []} />
      </div>

      {/* Currently active users */}
      <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
          Online Now — {activeUsers?.count ?? 0} users
          <span className="ml-2 text-xs font-normal text-zinc-400">(last 15 min)</span>
        </h3>
        {activeUsers?.users.length ? (
          <div className="space-y-2">
            {activeUsers.users.slice(0, 10).map(u => (
              <div key={u._id} className="flex items-center gap-3 py-1.5">
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300">
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{u.name}</p>
                  <p className="text-xs text-zinc-400">{u.lastLoginAt ? relativeTime(u.lastLoginAt) : ""}</p>
                </div>
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold ${u.role === "admin" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400 py-4 text-center">No users online in the last 15 minutes</p>
        )}
      </div>
    </div>
  );
}

/* ─── Users Tab ───────────────────────────────────────────────────── */
function UsersTab({ onPushToast }: { onPushToast: (msg: string, type: "success" | "error") => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ADMIN_USERS, page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const { data } = await api.get(`${API.ADMIN_USERS}?${params}`);
      return data?.data as { users: AdminUser[]; pagination: { total: number; pages: number } };
    },
    staleTime: CACHE.STALE_ADMIN_USERS,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: Partial<AdminUser> }) =>
      api.patch(`${API.ADMIN_USERS}/${payload.id}`, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_USERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_STATS });
      setEditUser(null);
      onPushToast("User updated", "success");
    },
    onError: () => onPushToast("Failed to update user", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`${API.ADMIN_USERS}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_USERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_STATS });
      setDeleteTarget(null);
      onPushToast("User deleted", "success");
    },
    onError: () => onPushToast("Failed to delete user", "error"),
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search users by name or email…"
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-9 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_80px_80px_80px_100px] gap-x-3 border-b border-zinc-100 dark:border-zinc-800 px-5 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          <span>Name</span><span>Email</span><span>Role</span><span>IG</span><span>Status</span><span className="text-right">Actions</span>
        </div>
        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-violet-500" /></div>
        ) : data?.users.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-400">No users found</div>
        ) : (
          data?.users.map(u => (
            <div key={u._id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_80px_80px_80px_100px] gap-x-3 items-center border-b border-zinc-50 dark:border-zinc-800/50 px-5 py-3.5 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 shrink-0 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-[11px] font-bold text-violet-700 dark:text-violet-300">
                  {u.name[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{u.name}</span>
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{u.email}</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit ${u.role === "admin" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                {u.role}
              </span>
              <span>
                {u.instagramConnected
                  ? <CheckCircle size={14} className="text-emerald-500" />
                  : <XCircle size={14} className="text-zinc-300 dark:text-zinc-600" />}
              </span>
              <span>
                {u.isActive
                  ? <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Active</span>
                  : <span className="text-[11px] font-semibold text-red-500">Inactive</span>}
              </span>
              <div className="flex items-center justify-end gap-1.5">
                <button onClick={() => setEditUser(u)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors">
                  <Edit3 size={13} />
                </button>
                <button onClick={() => setDeleteTarget(u._id)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>{data.pagination.total} total users</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition">
              Previous
            </button>
            <span className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">
              {page} / {data.pagination.pages}
            </span>
            <button onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))} disabled={page >= data.pagination.pages}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editUser && (
          <EditUserModal
            user={editUser}
            onClose={() => setEditUser(null)}
            onSave={data => updateMutation.mutate({ id: editUser._id, data })}
            isSaving={updateMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && setDeleteTarget(null)}
          >
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-7 shadow-2xl"
            >
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                <Trash2 size={18} />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Delete user?</h3>
              <p className="mt-1.5 text-sm text-zinc-400">This will permanently remove the user, their Instagram account, and all automations.</p>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">
                  Cancel
                </button>
                <button onClick={() => deleteMutation.mutate(deleteTarget!)} disabled={deleteMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition">
                  {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Logs Tab ────────────────────────────────────────────────────── */
function LogsTab() {
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ADMIN_LOGS, page, filterAction, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (filterAction) params.set("action", filterAction);
      if (filterStatus) params.set("status", filterStatus);
      const { data } = await api.get(`${API.ADMIN_LOGS}?${params}`);
      return data?.data as { logs: AdminLog[]; pagination: { total: number; pages: number } };
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const actionColor: Record<string, string> = {
    COMMENT_REPLY: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    SEND_DM: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    DM_AUTO_REPLY: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    COMMENT_RECEIVED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    DM_RECEIVED: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-700 dark:text-zinc-300 outline-none focus:border-violet-500 transition">
          <option value="">All Actions</option>
          <option value="COMMENT_REPLY">Comment Reply</option>
          <option value="SEND_DM">Send DM</option>
          <option value="DM_AUTO_REPLY">DM Auto Reply</option>
          <option value="COMMENT_RECEIVED">Comment Received</option>
          <option value="DM_RECEIVED">DM Received</option>
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-700 dark:text-zinc-300 outline-none focus:border-violet-500 transition">
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
        </select>
        {(filterAction || filterStatus) && (
          <button onClick={() => { setFilterAction(""); setFilterStatus(""); setPage(1); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-violet-500" /></div>
        ) : data?.logs.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-400">No logs found</div>
        ) : (
          data?.logs.map(log => (
            <div key={log._id} className="flex items-start gap-4 border-b border-zinc-50 dark:border-zinc-800/50 px-5 py-3.5 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                {log.status === "SUCCESS"
                  ? <CheckCircle size={14} className="text-emerald-500" />
                  : <XCircle size={14} className="text-red-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${actionColor[log.action] ?? "bg-zinc-100 text-zinc-600"}`}>
                    {log.action.replace(/_/g, " ")}
                  </span>
                  {log.userId && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {log.userId.name}
                    </span>
                  )}
                </div>
                {(log.commentText || log.dmText) && (
                  <p className="mt-1 text-xs text-zinc-400 truncate">{log.commentText ?? log.dmText}</p>
                )}
                {log.errorMessage && (
                  <p className="mt-1 text-xs text-red-500 truncate">{log.errorMessage}</p>
                )}
              </div>
              <span className="text-[11px] text-zinc-400 shrink-0">{fmtTime(log.createdAt)}</span>
            </div>
          ))
        )}
      </div>

      {data && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>{data.pagination.total} total logs</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition">
              Previous
            </button>
            <span className="px-3 py-1.5">{page} / {data.pagination.pages}</span>
            <button onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))} disabled={page >= data.pagination.pages}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Cache Tab ───────────────────────────────────────────────────── */
function CacheTab({ onPushToast }: { onPushToast: (msg: string, type: "success" | "error") => void }) {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-cache-stats"],
    queryFn: async () => {
      const { data } = await api.get(API.ADMIN_CACHE_STATS);
      return data?.data as { size: number; hits: number; misses: number; hitRate: string };
    },
    refetchInterval: 10_000,
  });

  const flushMutation = useMutation({
    mutationFn: () => api.post(API.ADMIN_CACHE_FLUSH, {}),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_STATS });
      onPushToast("Cache flushed successfully", "success");
    },
    onError: () => onPushToast("Failed to flush cache", "error"),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">In-Process Cache Statistics</h3>
          <div className="flex gap-2">
            <button onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => flushMutation.mutate()} disabled={flushMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 text-sm text-white hover:bg-red-700 disabled:opacity-60 transition">
              {flushMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Flush All
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-violet-500" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cached Keys</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{data?.size ?? 0}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Hit Rate</p>
              <p className="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">{data?.hitRate ?? "N/A"}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cache Hits</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data?.hits ?? 0}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cache Misses</p>
              <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{data?.misses ?? 0}</p>
            </div>
          </div>
        )}
        <div className="mt-4 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 p-4">
          <p className="text-xs text-violet-700 dark:text-violet-300 font-medium">
            📦 Cache stores: user sessions (60s), IG accounts (2min), automation lists (30s), admin stats (30s), DAU data (60s). Keys auto-expire — flushing clears all entries immediately.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Admin Panel ────────────────────────────────────────────── */
export default function AdminPanel() {
  const session = auth.get();
  const [activeTab, setActiveTab] = useState<AdminTabId>("overview");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { isDark, toggleTheme } = useTheme();

  const pushToast = useCallback((message: string, type: "success" | "error") => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Redirect if not admin
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_STATS,
    queryFn: async () => {
      const { data } = await api.get(API.ADMIN_STATS);
      return data?.data as AdminStats;
    },
    staleTime: CACHE.STALE_ADMIN_STATS,
    refetchInterval: 60_000,
  });

  const { data: dau } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_DAU,
    queryFn: async () => {
      const { data } = await api.get(API.ADMIN_DAU);
      return data?.data as DauEntry[];
    },
    staleTime: CACHE.STALE_ADMIN_DAU,
  });

  const { data: activeUsers } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_ACTIVE,
    queryFn: async () => {
      const { data } = await api.get(API.ADMIN_ACTIVE);
      return data?.data as { count: number; users: AdminUser[] };
    },
    staleTime: CACHE.STALE_ADMIN_ACTIVE,
    refetchInterval: 30_000,
  });

  const tabs = [
    { id: "overview" as AdminTabId, label: "Overview", icon: BarChart3 },
    { id: "users"    as AdminTabId, label: "Users",    icon: Users },
    { id: "logs"     as AdminTabId, label: "Logs",     icon: Activity },
    { id: "cache"    as AdminTabId, label: "Cache",    icon: Database },
  ];

  return (
    <div className={`min-h-screen ${isDark ? "dark" : ""}`}>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white">

        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <a href={ROUTES.DASHBOARD}
                className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition">
                <ArrowLeft size={14} /> Dashboard
              </a>
              <ChevronRight size={14} className="text-zinc-300" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                  <Shield size={14} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Admin Panel</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-zinc-400">
                {session.user.name}
                <span className="ml-2 px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 font-semibold">admin</span>
              </div>
              <button onClick={toggleTheme}
                className="h-8 w-8 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                {isDark ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">
          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Application Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Monitor users, automations, logs, and system health in real-time.
            </p>
          </div>

          {/* Live stat pills */}
          {stats && (
            <div className="mb-6 flex gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-1.5 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-zinc-500 dark:text-zinc-400">{stats.users.currentlyActive} online now</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-1.5 text-xs">
                <Clock size={10} className="text-zinc-400" />
                <span className="text-zinc-500 dark:text-zinc-400">Cache hit rate: {stats.cache.hitRate}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-1.5 text-xs">
                <Activity size={10} className="text-zinc-400" />
                <span className="text-zinc-500 dark:text-zinc-400">{stats.executions.successRate} execution success rate</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white dark:bg-zinc-900 p-1 w-fit shadow-sm">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === tab.id
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {activeTab === "overview" && <OverviewTab stats={stats} dau={dau} activeUsers={activeUsers} />}
              {activeTab === "users"    && <UsersTab onPushToast={pushToast} />}
              {activeTab === "logs"     && <LogsTab />}
              {activeTab === "cache"    && <CacheTab onPushToast={pushToast} />}
            </motion.div>
          </AnimatePresence>
        </main>

        <ToastList toasts={toasts} onDismiss={dismissToast} />
      </div>
    </div>
  );
}
