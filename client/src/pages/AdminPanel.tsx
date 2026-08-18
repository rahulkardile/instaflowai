import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Database,
  Users,
  Zap,
  Activity,
  Film,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  AlertTriangle,
  X,
  Check,
  Loader2,
  BarChart3,
  ArrowLeft,
  Sun,
  Moon,
  Shield,
  UserX,
  Bomb,
  ChevronUp,
  Eye,
  TrendingUp,
  Cpu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../utils/api";
import { auth } from "../utils/auth";
import { useTheme } from "../hooks/useTheme";

interface CollectionInfo {
  name: string;
  displayName: string;
  count: number;
}

interface PagedResult {
  docs: Record<string, any>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Stats {
  revenue: {
    mrr: number;
    arr: number;
    planPriceUsd: number;
    payingUsers: number;
  };
  users: {
    total: number;
    active: number;
    withInstagram: number;
    newThisWeek: number;
    newThisMonth: number;
    growthPct: number;
  };
  automations: {
    total: number;
    enabled: number;
    comment: number;
    dm: number;
  };
  activity: {
    total: number;
    today: number;
    success: number;
    failed: number;
    successRate: number;
    dmsSent: number;
    dmsReceived: number;
    dmAutoReplies: number;
    commentReplies: number;
    commentsReceived: number;
  };
  instagramAccounts: {
    total: number;
    connected: number;
  };
  charts: {
    growthLast30Days: { date: string; users: number; actions: number }[];
    topAutomationsByExecutions: { _id: string; count: number }[];
  };
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

let toastId = 0;

// ── Instagram SVG Icon Component ─────────────────────────────────────────────
function InstagramIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

// ── Collection icon map ───────────────────────────────────────────────────────
const COLLECTION_META: Record<
  string,
  { icon: React.ReactNode; color: string; accent: string }
> = {
  users: {
    icon: <Users size={16} />,
    color: "#6366f1",
    accent: "rgba(99,102,241,0.12)",
  },
  automations: {
    icon: <Zap size={16} />,
    color: "#7c3aed",
    accent: "rgba(124,58,237,0.12)",
  },
  executionlogs: {
    icon: <Activity size={16} />,
    color: "#0ea5e9",
    accent: "rgba(14,165,233,0.12)",
  },
  instagramaccounts: {
    icon: <InstagramIcon size={16} />,
    color: "#ec4899",
    accent: "rgba(236,72,153,0.12)",
  },
  reels: {
    icon: <Film size={16} />,
    color: "#f59e0b",
    accent: "rgba(245,158,11,0.12)",
  },
};

// ── Toast Container ──────────────────────────────────────────────────────────
function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="admin-toast-container">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className={`admin-toast admin-toast--${t.type}`}
          >
            {t.type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
            <span>{t.message}</span>
            <button onClick={() => onDismiss(t.id)} className="admin-toast-close" title="Dismiss">
              <X size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({
  title,
  description,
  confirmLabel,
  danger,
  loading,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, onCancel]);

  return (
    <div className="admin-overlay" onClick={() => !loading && onCancel()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ duration: 0.18 }}
        className="admin-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-dialog-icon">
          <AlertTriangle size={22} color={danger ? "#ef4444" : "#f59e0b"} />
        </div>
        <h3 className="admin-dialog-title">{title}</h3>
        <p className="admin-dialog-desc">{description}</p>
        <div className="admin-dialog-actions">
          <button
            className="admin-btn admin-btn--ghost"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={`admin-btn ${danger ? "admin-btn--danger" : "admin-btn--primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Loader2 size={14} className="spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({
  doc,
  collectionName,
  onSave,
  onClose,
}: {
  doc: Record<string, any>;
  collectionName: string;
  onSave: (updated: Record<string, any>) => Promise<void>;
  onClose: () => void;
}) {
  const [json, setJson] = useState(() => JSON.stringify(doc, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setError(null);
    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(json);
    } catch {
      setError("Invalid JSON — fix syntax errors and try again.");
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }, [json, onSave, onClose]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saving, onClose, handleSave]);

  return (
    <div className="admin-overlay" onClick={() => !saving && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        transition={{ duration: 0.18 }}
        className="admin-edit-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-edit-modal-header">
          <div className="admin-edit-modal-title">
            <Edit3 size={16} />
            <span>Edit Document</span>
          </div>
          <div className="admin-edit-modal-collection">
            {COLLECTION_META[collectionName]?.icon}
            <span>{collectionName}</span>
          </div>
          <button className="admin-icon-btn" onClick={onClose} title="Close (Esc)">
            <X size={16} />
          </button>
        </div>

        <div className="admin-edit-modal-id">
          <span>ID:</span>
          <code>{doc._id}</code>
          <span className="admin-edit-modal-hint">(Ctrl+Enter to save)</span>
        </div>

        <textarea
          className="admin-json-editor"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          spellCheck={false}
          rows={22}
        />

        {error && (
          <div className="admin-edit-error">
            <AlertTriangle size={13} /> {error}
          </div>
        )}

        <div className="admin-edit-modal-footer">
          <button className="admin-btn admin-btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="admin-btn admin-btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
            <span>{saving ? "Saving…" : "Save Changes"}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Mini Bar Chart Component ──────────────────────────────────────────────────
function MiniBarChart({
  data,
}: {
  data: { date: string; users: number; actions: number }[];
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="admin-chart-empty">
        <BarChart3 size={24} />
        <span>No activity recorded in the last 30 days</span>
      </div>
    );
  }

  const maxAction = Math.max(...data.map((d) => d.actions), 1);
  const maxUser = Math.max(...data.map((d) => d.users), 1);
  const globalMax = Math.max(maxAction, maxUser, 5);

  const totalActions = data.reduce((sum, d) => sum + d.actions, 0);
  const totalUsers = data.reduce((sum, d) => sum + d.users, 0);

  return (
    <div className="admin-chart-wrapper">
      <div className="admin-chart-summary">
        <div className="admin-chart-sum-item">
          <span className="admin-chart-sum-val">{totalActions.toLocaleString()}</span>
          <span className="admin-chart-sum-lbl">Total actions in 30d</span>
        </div>
        <div className="admin-chart-sum-item">
          <span className="admin-chart-sum-val">{totalUsers.toLocaleString()}</span>
          <span className="admin-chart-sum-lbl">New users in 30d</span>
        </div>
      </div>

      <div className="admin-chart-bars-container">
        {data.map((item, idx) => {
          const actionPct = Math.min(100, Math.round((item.actions / globalMax) * 100));
          const userPct = Math.min(100, Math.round((item.users / globalMax) * 100));
          const dateObj = new Date(item.date);
          const dateLabel = isNaN(dateObj.getTime())
            ? item.date
            : dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const isSelected = hoveredIndex === idx;

          return (
            <div
              key={item.date || idx}
              className={`admin-chart-column ${isSelected ? "selected" : ""}`}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {isSelected && (
                <div className="admin-chart-tooltip">
                  <div className="admin-chart-tooltip-date">{dateLabel}</div>
                  <div className="admin-chart-tooltip-row">
                    <span className="admin-legend-dot admin-legend-dot--actions" />
                    <span>Actions: <strong>{item.actions}</strong></span>
                  </div>
                  <div className="admin-chart-tooltip-row">
                    <span className="admin-legend-dot admin-legend-dot--users" />
                    <span>New users: <strong>{item.users}</strong></span>
                  </div>
                </div>
              )}

              <div className="admin-chart-bars-group">
                <div
                  className="admin-chart-bar admin-chart-bar--action"
                  style={{ height: `${Math.max(actionPct, item.actions > 0 ? 8 : 2)}%` }}
                />
                <div
                  className="admin-chart-bar admin-chart-bar--user"
                  style={{ height: `${Math.max(userPct, item.users > 0 ? 8 : 2)}%` }}
                />
              </div>

              {idx % 5 === 0 || idx === data.length - 1 ? (
                <span className="admin-chart-day-label">{dateLabel}</span>
              ) : (
                <span className="admin-chart-day-tick" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Document Row ──────────────────────────────────────────────────────────────
function DocRow({
  doc,
  collectionName,
  onEdit,
  onDelete,
  onDeleteUser,
}: {
  doc: Record<string, any>;
  collectionName: string | null;
  onEdit: (doc: Record<string, any>) => void;
  onDelete: (id: string) => void;
  onDeleteUser: ((id: string, email: string) => void) | null;
}) {
  const [expanded, setExpanded] = useState(false);

  // Pick a few preview keys
  const previewKeys = Object.keys(doc).filter(
    (k) => !["_id", "__v", "passwordHash", "accessToken", "refreshToken"].includes(k)
  );
  const inlineKeys = previewKeys.slice(0, 4);

  return (
    <React.Fragment>
      <tr className="admin-table-row">
        <td className="admin-td admin-td--id">
          <code>{String(doc._id).slice(-8)}</code>
        </td>
        {inlineKeys.map((k) => (
          <td key={k} className="admin-td">
            <span className="admin-cell-value">{formatCellValue(doc[k], k)}</span>
          </td>
        ))}
        {/* Pad empty cells if fewer than 4 preview keys */}
        {Array.from({ length: Math.max(0, 4 - inlineKeys.length) }).map((_, i) => (
          <td key={`empty-${i}`} className="admin-td" />
        ))}
        <td className="admin-td admin-td--actions">
          <button
            className="admin-icon-btn admin-icon-btn--sm"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Collapse JSON" : "Expand JSON"}
          >
            {expanded ? <ChevronUp size={13} /> : <Eye size={13} />}
          </button>
          <button
            className="admin-icon-btn admin-icon-btn--sm admin-icon-btn--edit"
            onClick={() => onEdit(doc)}
            title={`Edit document in ${collectionName ?? "collection"}`}
          >
            <Edit3 size={13} />
          </button>
          {onDeleteUser && (
            <button
              className="admin-icon-btn admin-icon-btn--sm admin-icon-btn--cascade"
              onClick={() => onDeleteUser(doc._id, doc.email ?? doc.name ?? doc._id)}
              title="Cascade remove user + all data"
            >
              <UserX size={13} />
            </button>
          )}
          <button
            className="admin-icon-btn admin-icon-btn--sm admin-icon-btn--danger"
            onClick={() => onDelete(doc._id)}
            title="Delete document"
          >
            <Trash2 size={13} />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="admin-table-expanded">
          <td colSpan={6}>
            <pre className="admin-doc-preview">
              {JSON.stringify(doc, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

function formatCellValue(val: any, keyName?: string): React.ReactNode {
  if (val === null || val === undefined) return <span className="admin-cell-empty">—</span>;

  if (typeof val === "boolean") {
    return val ? (
      <span className="admin-pill admin-pill--green">✓ true</span>
    ) : (
      <span className="admin-pill admin-pill--gray">✗ false</span>
    );
  }

  if (keyName && /status/i.test(keyName) && typeof val === "string") {
    if (val === "SUCCESS" || val === "active") {
      return <span className="admin-pill admin-pill--green">{val}</span>;
    }
    if (val === "FAILED" || val === "error") {
      return <span className="admin-pill admin-pill--red">{val}</span>;
    }
    return <span className="admin-pill admin-pill--purple">{val}</span>;
  }

  if (keyName && /role/i.test(keyName) && typeof val === "string") {
    return (
      <span className={`admin-pill ${val === "admin" ? "admin-pill--purple" : "admin-pill--gray"}`}>
        {val}
      </span>
    );
  }

  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  if (Array.isArray(val)) return <span className="admin-cell-meta">[{val.length} items]</span>;

  if (typeof val === "object") {
    if (val.$date) return String(val.$date);
    if (val.$oid) return String(val.$oid).slice(-8);
    return <span className="admin-cell-meta">{"{…}"}</span>;
  }

  const str = String(val);
  return str.length > 36 ? `${str.slice(0, 34)}…` : str;
}

// ── Stats Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: number;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="admin-stat-card" style={{ "--stat-color": color } as React.CSSProperties}>
      <div className="admin-stat-icon">{icon}</div>
      <div className="admin-stat-body">
        <div className="admin-stat-value">{value.toLocaleString()}</div>
        <div className="admin-stat-label">{label}</div>
        {sub && <div className="admin-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const session = auth.get();

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [paged, setPaged] = useState<PagedResult | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [editDoc, setEditDoc] = useState<Record<string, any> | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    danger?: boolean;
    action: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const addToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load collections + stats
  const refreshCollections = useCallback(async () => {
    setLoadingCollections(true);
    try {
      const [colRes, statRes] = await Promise.all([
        api.get("/admin/collections"),
        api.get("/admin/stats"),
      ]);
      setCollections(colRes.data.data ?? []);
      setStats(statRes.data.data ?? null);
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? "Failed to load collections", "error");
    } finally {
      setLoadingCollections(false);
    }
  }, [addToast]);

  useEffect(() => {
    refreshCollections();
  }, [refreshCollections]);

  // Load documents for selected collection
  const loadDocuments = useCallback(
    async (col: string, pg: number) => {
      setLoadingDocs(true);
      try {
        const res = await api.get(`/admin/collections/${col}`, {
          params: { page: pg, limit: 20 },
        });
        setPaged(res.data.data);
      } catch (e: any) {
        addToast(e?.response?.data?.message ?? "Failed to load documents", "error");
      } finally {
        setLoadingDocs(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    if (selectedCollection) {
      setPaged(null);
      loadDocuments(selectedCollection, page);
    }
  }, [selectedCollection, page, loadDocuments]);

  function selectCollection(name: string) {
    setSelectedCollection(name);
    setPage(1);
    setSearch("");
  }

  // Filter docs locally by search string
  const filteredDocs =
    paged?.docs.filter((doc) => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return JSON.stringify(doc).toLowerCase().includes(s);
    }) ?? [];

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleSaveEdit(updated: Record<string, any>) {
    if (!selectedCollection || !editDoc) return;
    await api.patch(`/admin/collections/${selectedCollection}/${editDoc._id}`, updated);
    addToast("Document updated ✓");
    loadDocuments(selectedCollection, page);
    refreshCollections();
  }

  function promptDeleteDoc(id: string) {
    setConfirm({
      title: "Delete Document",
      description: `Permanently delete document ${id.slice(-8)}…? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
      action: async () => {
        await api.delete(`/admin/collections/${selectedCollection}/${id}`);
        addToast("Document deleted");
        loadDocuments(selectedCollection!, page);
        refreshCollections();
      },
    });
  }

  function promptDropCollection(name: string) {
    setConfirm({
      title: "Drop All Documents",
      description: `This will permanently delete ALL documents in the "${name}" collection. This action is irreversible.`,
      confirmLabel: "Drop All",
      danger: true,
      action: async () => {
        const res = await api.delete(`/admin/collections/${name}`);
        addToast(res.data.message ?? "Collection dropped");
        loadDocuments(name, 1);
        setPage(1);
        refreshCollections();
      },
    });
  }

  function promptDeleteUser(id: string, email: string) {
    setConfirm({
      title: "Remove User + All Data",
      description: `Remove "${email}" and cascade-delete all their Automations, ExecutionLogs, and Instagram Accounts?`,
      confirmLabel: "Remove User",
      danger: true,
      action: async () => {
        const res = await api.delete(`/admin/users/${id}`);
        addToast(res.data.message ?? "User removed");
        loadDocuments("users", 1);
        setPage(1);
        refreshCollections();
      },
    });
  }

  async function runConfirmAction() {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      await confirm.action();
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? "Action failed", "error");
    } finally {
      setConfirmLoading(false);
      setConfirm(null);
    }
  }

  // ── Table headers ─────────────────────────────────────────────────────────
  const tableHeaders = (() => {
    if (!paged?.docs.length) return [];
    const keys = Object.keys(paged.docs[0]).filter(
      (k) => !["_id", "__v", "passwordHash", "accessToken", "refreshToken"].includes(k)
    );
    return keys.slice(0, 4);
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <React.Fragment>
      <style>{ADMIN_STYLES}</style>

      <div className="admin-root">
        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <div className="admin-logo">
              <Shield size={18} />
              <span>Admin Panel</span>
            </div>
            <div className="admin-sidebar-actions">
              <button
                className="admin-icon-btn"
                onClick={toggleTheme}
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <button
                className="admin-icon-btn"
                onClick={() => navigate("/dashboard")}
                title="Back to Dashboard"
              >
                <ArrowLeft size={15} />
              </button>
            </div>
          </div>

          <div className="admin-sidebar-user">
            <div className="admin-user-avatar">
              {session?.user?.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="admin-user-info">
              <div className="admin-user-name">{session?.user?.name ?? "Admin"}</div>
              <div className="admin-user-role">Administrator</div>
            </div>
          </div>

          <div className="admin-sidebar-section">
            <div className="admin-sidebar-label">Overview</div>
            <button
              className={`admin-nav-item ${!selectedCollection ? "active" : ""}`}
              onClick={() => setSelectedCollection(null)}
            >
              <BarChart3 size={15} />
              <span>Dashboard Stats</span>
            </button>
          </div>

          <div className="admin-sidebar-section">
            <div className="admin-sidebar-label">Collections</div>
            {loadingCollections ? (
              <div className="admin-sidebar-loading">
                <Loader2 size={14} className="spin" />
                <span>Loading…</span>
              </div>
            ) : (
              collections.map((col) => {
                const meta = COLLECTION_META[col.name] ?? {
                  icon: <Database size={15} />,
                  color: "#a1a1aa",
                  accent: "rgba(161,161,170,0.12)",
                };
                return (
                  <button
                    key={col.name}
                    className={`admin-nav-item ${selectedCollection === col.name ? "active" : ""}`}
                    onClick={() => selectCollection(col.name)}
                  >
                    <span style={{ color: meta.color }}>{meta.icon}</span>
                    <span className="admin-nav-label">{col.displayName}</span>
                    <span className="admin-nav-badge">{col.count.toLocaleString()}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="admin-sidebar-footer">
            <button
              className="admin-btn admin-btn--ghost admin-btn--sm admin-refresh-btn"
              onClick={refreshCollections}
              disabled={loadingCollections}
            >
              <RefreshCw size={13} className={loadingCollections ? "spin" : ""} />
              <span>Refresh Data</span>
            </button>
          </div>
        </aside>

        {/* ── Main Content ──────────────────────────────────────────────── */}
        <main className="admin-main">
          <AnimatePresence mode="wait">
            {!selectedCollection ? (
              /* ── Stats Overview ───────────────────────────────────── */
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="admin-content"
              >
                <div className="admin-page-header">
                  <div>
                    <h1 className="admin-page-title">Business Overview</h1>
                    <p className="admin-page-subtitle">
                      Real-time metrics, revenue, and platform health
                    </p>
                  </div>
                  <button
                    className="admin-btn admin-btn--ghost admin-btn--sm"
                    onClick={refreshCollections}
                    disabled={loadingCollections}
                  >
                    <RefreshCw size={13} className={loadingCollections ? "spin" : ""} />
                    <span>Refresh</span>
                  </button>
                </div>

                {stats ? (
                  <React.Fragment>
                    {/* ── Revenue Row ───────────────────────────────── */}
                    <div className="admin-section-label-row">
                      <span className="admin-section-chip admin-section-chip--revenue">
                        <TrendingUp size={13} />
                        <span>Revenue & Monetization</span>
                      </span>
                    </div>
                    <div className="admin-stats-grid admin-stats-grid--revenue">
                      <div className="admin-revenue-card admin-revenue-card--mrr">
                        <div className="admin-revenue-icon">📈</div>
                        <div className="admin-revenue-content">
                          <div className="admin-revenue-label">MRR</div>
                          <div className="admin-revenue-value">
                            ${stats.revenue.mrr.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </div>
                          <div className="admin-revenue-sub">
                            {stats.revenue.payingUsers} connected × ${stats.revenue.planPriceUsd}/mo
                          </div>
                        </div>
                      </div>
                      <div className="admin-revenue-card admin-revenue-card--arr">
                        <div className="admin-revenue-icon">🚀</div>
                        <div className="admin-revenue-content">
                          <div className="admin-revenue-label">ARR</div>
                          <div className="admin-revenue-value">
                            ${stats.revenue.arr.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </div>
                          <div className="admin-revenue-sub">Annualized run rate</div>
                        </div>
                      </div>
                      <div className="admin-revenue-card admin-revenue-card--paying">
                        <div className="admin-revenue-icon">💳</div>
                        <div className="admin-revenue-content">
                          <div className="admin-revenue-label">Paying Users</div>
                          <div className="admin-revenue-value">{stats.revenue.payingUsers}</div>
                          <div className="admin-revenue-sub">
                            {stats.users.total > 0
                              ? Math.round((stats.revenue.payingUsers / stats.users.total) * 100)
                              : 0}% conversion rate
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Users Row ─────────────────────────────────── */}
                    <div className="admin-section-label-row">
                      <span className="admin-section-chip admin-section-chip--users">
                        <Users size={13} />
                        <span>Users & Engagement</span>
                      </span>
                    </div>
                    <div className="admin-stats-grid">
                      <StatCard
                        label="Total Users"
                        value={stats.users.total}
                        sub={`${stats.users.active} active`}
                        color="#6366f1"
                        icon={<Users size={20} />}
                      />
                      <StatCard
                        label="New This Month"
                        value={stats.users.newThisMonth}
                        sub={`${stats.users.growthPct >= 0 ? "+" : ""}${stats.users.growthPct}% vs last month`}
                        color={stats.users.growthPct >= 0 ? "#10b981" : "#ef4444"}
                        icon={<span style={{ fontSize: 18 }}>{stats.users.growthPct >= 0 ? "📈" : "📉"}</span>}
                      />
                      <StatCard
                        label="New This Week"
                        value={stats.users.newThisWeek}
                        sub="Last 7 days"
                        color="#8b5cf6"
                        icon={<span style={{ fontSize: 18 }}>🗓️</span>}
                      />
                      <StatCard
                        label="Connected Accounts"
                        value={stats.users.withInstagram}
                        sub="Instagram linked"
                        color="#ec4899"
                        icon={<InstagramIcon size={20} />}
                      />
                    </div>

                    {/* ── DMs & Actions Row ─────────────────────────── */}
                    <div className="admin-section-label-row">
                      <span className="admin-section-chip admin-section-chip--activity">
                        <Activity size={13} />
                        <span>Message & Comment Activity</span>
                      </span>
                    </div>
                    <div className="admin-stats-grid">
                      <StatCard
                        label="DMs Sent"
                        value={stats.activity.dmsSent}
                        sub="Outbound DMs"
                        color="#0ea5e9"
                        icon={<span style={{ fontSize: 18 }}>📤</span>}
                      />
                      <StatCard
                        label="DMs Received"
                        value={stats.activity.dmsReceived}
                        sub="Inbound DMs"
                        color="#06b6d4"
                        icon={<span style={{ fontSize: 18 }}>📥</span>}
                      />
                      <StatCard
                        label="DM Auto-Replies"
                        value={stats.activity.dmAutoReplies}
                        sub="Automated responses"
                        color="#7c3aed"
                        icon={<span style={{ fontSize: 18 }}>🤖</span>}
                      />
                      <StatCard
                        label="Comments Replied"
                        value={stats.activity.commentReplies}
                        sub="Comment automations"
                        color="#f59e0b"
                        icon={<span style={{ fontSize: 18 }}>💬</span>}
                      />
                    </div>

                    {/* ── Automations + Health Row ──────────────────── */}
                    <div className="admin-section-label-row">
                      <span className="admin-section-chip admin-section-chip--health">
                        <Cpu size={13} />
                        <span>Automations & Engine Health</span>
                      </span>
                    </div>
                    <div className="admin-stats-grid admin-stats-grid--health">
                      <StatCard
                        label="Total Automations"
                        value={stats.automations.total}
                        sub={`${stats.automations.enabled} enabled`}
                        color="#7c3aed"
                        icon={<Zap size={20} />}
                      />
                      <StatCard
                        label="Comment Rules"
                        value={stats.automations.comment}
                        sub="COMMENT triggers"
                        color="#f59e0b"
                        icon={<span style={{ fontSize: 18 }}>💬</span>}
                      />
                      <StatCard
                        label="DM Rules"
                        value={stats.automations.dm}
                        sub="DM triggers"
                        color="#0ea5e9"
                        icon={<span style={{ fontSize: 18 }}>✉️</span>}
                      />
                      <div
                        className="admin-stat-card admin-stat-card--health"
                        style={{ "--stat-color": "#10b981" } as React.CSSProperties}
                      >
                        <div className="admin-stat-icon">
                          <Activity size={20} />
                        </div>
                        <div className="admin-stat-body">
                          <div className="admin-stat-value">{stats.activity.successRate}%</div>
                          <div className="admin-stat-label">Execution Success Rate</div>
                          <div className="admin-health-bar-wrap">
                            <div
                              className="admin-health-bar"
                              style={{ width: `${Math.min(100, Math.max(0, stats.activity.successRate))}%` }}
                            />
                          </div>
                          <div className="admin-stat-sub">
                            {stats.activity.success.toLocaleString()} ok · {stats.activity.failed.toLocaleString()} failed
                          </div>
                        </div>
                      </div>
                      <StatCard
                        label="Actions Today"
                        value={stats.activity.today}
                        sub="Since midnight"
                        color="#f43f5e"
                        icon={<span style={{ fontSize: 18 }}>🔥</span>}
                      />
                      <StatCard
                        label="Total Actions"
                        value={stats.activity.total}
                        sub="All-time executions"
                        color="#a855f7"
                        icon={<BarChart3 size={20} />}
                      />
                    </div>

                    {/* ── 30-Day Growth & Top Automations ───────────── */}
                    <div className="admin-section-label-row">
                      <span className="admin-section-chip admin-section-chip--chart">
                        <BarChart3 size={13} />
                        <span>30-Day Activity & Growth</span>
                      </span>
                    </div>

                    <div className="admin-charts-layout">
                      <div className="admin-chart-card">
                        <div className="admin-chart-card-header">
                          <div>
                            <h3 className="admin-card-subtitle">Daily Automation Actions vs. Signups</h3>
                            <p className="admin-card-desc">Hover over any bar to inspect daily metrics</p>
                          </div>
                          <div className="admin-chart-legend">
                            <span className="admin-legend-item">
                              <span className="admin-legend-dot admin-legend-dot--actions" />
                              <span>Actions</span>
                            </span>
                            <span className="admin-legend-item">
                              <span className="admin-legend-dot admin-legend-dot--users" />
                              <span>Signups</span>
                            </span>
                          </div>
                        </div>
                        <MiniBarChart data={stats.charts.growthLast30Days} />
                      </div>

                      {stats.charts.topAutomationsByExecutions?.length > 0 && (
                        <div className="admin-top-card">
                          <h3 className="admin-card-subtitle">Top Executing Automations</h3>
                          <p className="admin-card-desc">Highest volume automation IDs</p>
                          <div className="admin-top-list">
                            {stats.charts.topAutomationsByExecutions.map((item, i) => (
                              <div key={item._id} className="admin-top-item">
                                <span className="admin-top-rank">#{i + 1}</span>
                                <span className="admin-top-id" title={item._id}>
                                  {item._id.slice(-8)}
                                </span>
                                <span className="admin-top-count">
                                  {item.count.toLocaleString()} runs
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                ) : (
                  <div className="admin-loading-center">
                    <Loader2 size={28} className="spin" />
                  </div>
                )}

                <div className="admin-collection-cards">
                  <h2 className="admin-section-title">Explore Database Collections</h2>
                  <div className="admin-col-card-grid">
                    {collections.map((col) => {
                      const meta = COLLECTION_META[col.name] ?? {
                        icon: <Database size={20} />,
                        color: "#a1a1aa",
                        accent: "rgba(161,161,170,0.08)",
                      };
                      return (
                        <button
                          key={col.name}
                          className="admin-col-card"
                          style={
                            {
                              "--col-color": meta.color,
                              "--col-accent": meta.accent,
                            } as React.CSSProperties
                          }
                          onClick={() => selectCollection(col.name)}
                        >
                          <div className="admin-col-card-icon">{meta.icon}</div>
                          <div className="admin-col-card-name">{col.displayName}</div>
                          <div className="admin-col-card-count">
                            {col.count.toLocaleString()} documents
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* ── Collection Browser ───────────────────────────────── */
              <motion.div
                key={selectedCollection}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="admin-content"
              >
                <div className="admin-page-header">
                  <div>
                    <div className="admin-breadcrumb">
                      <button
                        className="admin-breadcrumb-back"
                        onClick={() => setSelectedCollection(null)}
                      >
                        <ChevronLeft size={13} /> Back to Overview
                      </button>
                    </div>
                    <h1 className="admin-page-title">
                      {COLLECTION_META[selectedCollection]?.icon && (
                        <span
                          style={{
                            color: COLLECTION_META[selectedCollection]?.color,
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                        >
                          {COLLECTION_META[selectedCollection].icon}
                        </span>
                      )}
                      <span>
                        {paged
                          ? collections.find((c) => c.name === selectedCollection)
                            ?.displayName ?? selectedCollection
                          : selectedCollection}
                      </span>
                    </h1>
                    <p className="admin-page-subtitle">
                      {paged?.total.toLocaleString() ?? "…"} documents in collection
                    </p>
                  </div>
                  <div className="admin-page-actions">
                    <button
                      className="admin-btn admin-btn--ghost admin-btn--sm"
                      onClick={() => loadDocuments(selectedCollection, page)}
                      disabled={loadingDocs}
                    >
                      <RefreshCw size={13} className={loadingDocs ? "spin" : ""} />
                      <span>Refresh</span>
                    </button>
                    <button
                      className="admin-btn admin-btn--danger admin-btn--sm"
                      onClick={() => promptDropCollection(selectedCollection)}
                    >
                      <Bomb size={13} />
                      <span>Drop All</span>
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="admin-search-bar">
                  <Search size={14} className="admin-search-icon" />
                  <input
                    type="text"
                    placeholder="Search documents on this page…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="admin-search-input"
                  />
                  {search && (
                    <button
                      className="admin-icon-btn admin-icon-btn--xs"
                      onClick={() => setSearch("")}
                      title="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Table */}
                <div className="admin-table-wrapper">
                  {loadingDocs ? (
                    <div className="admin-loading-center">
                      <Loader2 size={24} className="spin" />
                    </div>
                  ) : filteredDocs.length === 0 ? (
                    <div className="admin-empty">
                      <Database size={32} />
                      <p>No documents found</p>
                    </div>
                  ) : (
                    <div className="admin-table-scroll">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th className="admin-th admin-th--id">ID (last 8)</th>
                            {tableHeaders.map((h) => (
                              <th key={h} className="admin-th">
                                {h}
                              </th>
                            ))}
                            {Array.from({
                              length: Math.max(0, 4 - tableHeaders.length),
                            }).map((_, i) => (
                              <th key={`empty-h-${i}`} className="admin-th" />
                            ))}
                            <th className="admin-th admin-th--actions">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <AnimatePresence>
                            {filteredDocs.map((doc) => (
                              <DocRow
                                key={doc._id}
                                doc={doc}
                                collectionName={selectedCollection}
                                onEdit={setEditDoc}
                                onDelete={promptDeleteDoc}
                                onDeleteUser={
                                  selectedCollection === "users" ? promptDeleteUser : null
                                }
                              />
                            ))}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {paged && paged.totalPages > 1 && (
                  <div className="admin-pagination">
                    <button
                      className="admin-btn admin-btn--ghost admin-btn--sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <span className="admin-pagination-info">
                      Page {paged.page} of {paged.totalPages}
                    </span>
                    <button
                      className="admin-btn admin-btn--ghost admin-btn--sm"
                      onClick={() => setPage((p) => Math.min(paged.totalPages, p + 1))}
                      disabled={page >= paged.totalPages}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* ── Edit Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editDoc && (
          <EditModal
            doc={editDoc}
            collectionName={selectedCollection ?? ""}
            onSave={handleSaveEdit}
            onClose={() => setEditDoc(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Confirm Dialog ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {confirm && (
          <ConfirmDialog
            title={confirm.title}
            description={confirm.description}
            confirmLabel={confirm.confirmLabel}
            danger={confirm.danger}
            loading={confirmLoading}
            onConfirm={runConfirmAction}
            onCancel={() => !confirmLoading && setConfirm(null)}
          />
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </React.Fragment>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ADMIN_STYLES = `
  /* ── Layout ─────────────────────────────────────────────────────────── */
  .admin-root {
    display: flex;
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-sans);
  }

  /* ── Sidebar ─────────────────────────────────────────────────────────── */
  .admin-sidebar {
    width: 260px;
    flex-shrink: 0;
    background: var(--bg-card);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .admin-sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 16px 14px;
    border-bottom: 1px solid var(--border);
  }

  .admin-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 15px;
    background: linear-gradient(135deg, #7c3aed, #ec4899);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .admin-sidebar-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .admin-sidebar-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
  }

  .admin-user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #7c3aed, #ec4899);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    flex-shrink: 0;
  }

  .admin-user-info {
    overflow: hidden;
  }

  .admin-user-name {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .admin-user-role {
    font-size: 11px;
    color: #7c3aed;
    font-weight: 500;
  }

  .admin-sidebar-section {
    padding: 12px 10px 4px;
  }

  .admin-sidebar-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
    padding: 0 8px 6px;
  }

  .admin-nav-item {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 8px 10px;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: var(--text-2);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, color 0.15s;
    margin-bottom: 2px;
  }

  .admin-nav-item:hover {
    background: var(--bg-subtle);
    color: var(--text);
  }

  .admin-nav-item.active {
    background: rgba(124, 58, 237, 0.10);
    color: #7c3aed;
    font-weight: 600;
  }

  .admin-nav-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .admin-nav-badge {
    font-size: 11px;
    font-weight: 600;
    background: var(--bg-subtle);
    color: var(--text-3);
    padding: 1px 7px;
    border-radius: 20px;
    min-width: 28px;
    text-align: center;
  }

  .admin-nav-item.active .admin-nav-badge {
    background: rgba(124, 58, 237, 0.14);
    color: #7c3aed;
  }

  .admin-sidebar-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px;
    color: var(--text-3);
    font-size: 13px;
  }

  .admin-sidebar-footer {
    margin-top: auto;
    padding: 12px 10px;
    border-top: 1px solid var(--border);
  }

  .admin-refresh-btn {
    width: 100%;
    justify-content: center;
  }

  /* ── Main ────────────────────────────────────────────────────────────── */
  .admin-main {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .admin-content {
    flex: 1;
    padding: 28px 32px;
    overflow-y: auto;
    max-height: 100vh;
  }

  /* ── Page Header ─────────────────────────────────────────────────────── */
  .admin-page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 24px;
    gap: 16px;
  }

  .admin-page-title {
    font-size: 22px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 4px;
    color: var(--text);
  }

  .admin-page-subtitle {
    font-size: 13px;
    color: var(--text-2);
    margin: 0;
  }

  .admin-page-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-top: 4px;
  }

  .admin-breadcrumb {
    margin-bottom: 4px;
  }

  .admin-breadcrumb-back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--text-3);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: color 0.15s;
  }

  .admin-breadcrumb-back:hover {
    color: #7c3aed;
  }

  /* ── Section Chips ───────────────────────────────────────────────────── */
  .admin-section-label-row {
    margin: 24px 0 12px;
    display: flex;
    align-items: center;
  }

  .admin-section-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .admin-section-chip--revenue {
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.20);
  }

  .admin-section-chip--users {
    background: rgba(99, 102, 241, 0.12);
    color: #6366f1;
    border: 1px solid rgba(99, 102, 241, 0.20);
  }

  .admin-section-chip--activity {
    background: rgba(14, 165, 233, 0.12);
    color: #0ea5e9;
    border: 1px solid rgba(14, 165, 233, 0.20);
  }

  .admin-section-chip--health {
    background: rgba(124, 58, 237, 0.12);
    color: #7c3aed;
    border: 1px solid rgba(124, 58, 237, 0.20);
  }

  .admin-section-chip--chart {
    background: rgba(236, 72, 153, 0.12);
    color: #ec4899;
    border: 1px solid rgba(236, 72, 153, 0.20);
  }

  /* ── Revenue Grid & Cards ────────────────────────────────────────────── */
  .admin-stats-grid--revenue {
    grid-template-columns: repeat(3, 1fr);
    margin-bottom: 24px;
  }

  .admin-revenue-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    align-items: flex-start;
    gap: 16px;
    box-shadow: var(--shadow-sm);
    transition: transform 0.2s, box-shadow 0.2s;
    position: relative;
    overflow: hidden;
  }

  .admin-revenue-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow);
  }

  .admin-revenue-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
  }

  .admin-revenue-card--mrr::before {
    background: linear-gradient(90deg, #10b981, #06b6d4);
  }

  .admin-revenue-card--arr::before {
    background: linear-gradient(90deg, #8b5cf6, #ec4899);
  }

  .admin-revenue-card--paying::before {
    background: linear-gradient(90deg, #f59e0b, #ef4444);
  }

  .admin-revenue-icon {
    font-size: 28px;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--bg-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .admin-revenue-content {
    flex: 1;
  }

  .admin-revenue-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-3);
  }

  .admin-revenue-value {
    font-size: 26px;
    font-weight: 800;
    color: var(--text);
    line-height: 1.2;
    margin: 2px 0 4px;
  }

  .admin-revenue-sub {
    font-size: 11px;
    color: var(--text-2);
  }

  /* ── General Stats Grid & Cards ──────────────────────────────────────── */
  .admin-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 14px;
    margin-bottom: 24px;
  }

  .admin-stats-grid--health {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }

  .admin-stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 18px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    box-shadow: var(--shadow-sm);
    transition: box-shadow 0.2s, transform 0.2s;
  }

  .admin-stat-card:hover {
    box-shadow: var(--shadow);
    transform: translateY(-1px);
  }

  .admin-stat-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--stat-color, #7c3aed) 14%, transparent);
    color: var(--stat-color, #7c3aed);
    flex-shrink: 0;
  }

  .admin-stat-body {
    flex: 1;
    min-width: 0;
  }

  .admin-stat-value {
    font-size: 24px;
    font-weight: 800;
    line-height: 1.1;
    color: var(--text);
  }

  .admin-stat-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-2);
    margin-top: 3px;
  }

  .admin-stat-sub {
    font-size: 11px;
    color: var(--text-3);
    margin-top: 3px;
  }

  /* ── Health Progress Bar ─────────────────────────────────────────────── */
  .admin-health-bar-wrap {
    width: 100%;
    height: 6px;
    background: var(--bg-subtle);
    border-radius: 4px;
    margin: 8px 0 4px;
    overflow: hidden;
  }

  .admin-health-bar {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #06b6d4);
    border-radius: 4px;
    transition: width 0.4s ease;
  }

  /* ── Charts Layout ───────────────────────────────────────────────────── */
  .admin-charts-layout {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 16px;
    margin-bottom: 32px;
  }

  @media (max-width: 1024px) {
    .admin-charts-layout {
      grid-template-columns: 1fr;
    }
  }

  .admin-chart-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px 24px;
    box-shadow: var(--shadow-sm);
  }

  .admin-chart-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }

  .admin-card-subtitle {
    font-size: 14px;
    font-weight: 700;
    margin: 0 0 2px;
    color: var(--text);
  }

  .admin-card-desc {
    font-size: 12px;
    color: var(--text-3);
    margin: 0;
  }

  .admin-chart-legend {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 12px;
    color: var(--text-2);
  }

  .admin-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .admin-legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .admin-legend-dot--actions {
    background: #7c3aed;
  }

  .admin-legend-dot--users {
    background: #ec4899;
  }

  .admin-chart-wrapper {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .admin-chart-summary {
    display: flex;
    gap: 24px;
  }

  .admin-chart-sum-item {
    display: flex;
    flex-direction: column;
  }

  .admin-chart-sum-val {
    font-size: 18px;
    font-weight: 800;
    color: var(--text);
  }

  .admin-chart-sum-lbl {
    font-size: 11px;
    color: var(--text-3);
  }

  .admin-chart-bars-container {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 160px;
    padding-top: 24px;
    border-bottom: 1px solid var(--border);
    position: relative;
  }

  .admin-chart-column {
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    position: relative;
    cursor: pointer;
  }

  .admin-chart-bars-group {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 2px;
  }

  .admin-chart-bar {
    width: 45%;
    border-radius: 3px 3px 0 0;
    transition: height 0.3s ease, filter 0.15s;
    min-height: 2px;
  }

  .admin-chart-bar--action {
    background: linear-gradient(180deg, #8b5cf6, #7c3aed);
  }

  .admin-chart-bar--user {
    background: linear-gradient(180deg, #f472b6, #ec4899);
  }

  .admin-chart-column:hover .admin-chart-bar {
    filter: brightness(1.25);
  }

  .admin-chart-day-label {
    font-size: 10px;
    color: var(--text-3);
    position: absolute;
    bottom: -22px;
    white-space: nowrap;
  }

  .admin-chart-day-tick {
    width: 1px;
    height: 4px;
    background: var(--border-strong);
    position: absolute;
    bottom: -5px;
  }

  .admin-chart-tooltip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 11px;
    box-shadow: var(--shadow-lg);
    z-index: 100;
    white-space: nowrap;
    pointer-events: none;
  }

  .admin-chart-tooltip-date {
    font-weight: 700;
    margin-bottom: 4px;
    color: var(--text);
  }

  .admin-chart-tooltip-row {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-2);
  }

  .admin-chart-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px 20px;
    color: var(--text-3);
    font-size: 13px;
  }

  /* ── Top Automations Card ────────────────────────────────────────────── */
  .admin-top-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px 22px;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
  }

  .admin-top-list {
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .admin-top-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    background: var(--bg-subtle);
    font-size: 12px;
  }

  .admin-top-rank {
    font-weight: 700;
    color: #7c3aed;
    width: 20px;
  }

  .admin-top-id {
    font-family: monospace;
    color: var(--text);
    font-weight: 600;
    flex: 1;
  }

  .admin-top-count {
    color: var(--text-2);
    font-weight: 500;
  }

  /* ── Collection Cards ────────────────────────────────────────────────── */
  .admin-section-title {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 14px;
    color: var(--text);
  }

  .admin-col-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 12px;
  }

  .admin-col-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 18px 16px;
    cursor: pointer;
    text-align: left;
    transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .admin-col-card:hover {
    border-color: var(--col-color, #7c3aed);
    box-shadow: 0 4px 20px var(--col-accent, rgba(124,58,237,0.12));
    transform: translateY(-2px);
  }

  .admin-col-card-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: var(--col-accent, rgba(124,58,237,0.12));
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--col-color, #7c3aed);
    margin-bottom: 4px;
  }

  .admin-col-card-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .admin-col-card-count {
    font-size: 12px;
    color: var(--text-3);
  }

  /* ── Search Bar ──────────────────────────────────────────────────────── */
  .admin-search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 0 12px;
    margin-bottom: 16px;
    height: 42px;
    box-shadow: var(--shadow-xs);
  }

  .admin-search-icon {
    color: var(--text-3);
    flex-shrink: 0;
  }

  .admin-search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-size: 13px;
    color: var(--text);
  }

  .admin-search-input::placeholder {
    color: var(--text-3);
  }

  /* ── Table ───────────────────────────────────────────────────────────── */
  .admin-table-wrapper {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }

  .admin-table-scroll {
    overflow-x: auto;
  }

  .admin-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    text-align: left;
  }

  .admin-th {
    padding: 12px 16px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text-3);
    background: var(--bg-subtle);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  .admin-th--id {
    width: 100px;
  }

  .admin-th--actions {
    width: 140px;
    text-align: right;
  }

  .admin-table-row {
    border-bottom: 1px solid var(--border);
    transition: background 0.12s;
  }

  .admin-table-row:last-child {
    border-bottom: none;
  }

  .admin-table-row:hover {
    background: var(--bg-subtle);
  }

  .admin-td {
    padding: 11px 16px;
    vertical-align: middle;
    max-width: 220px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .admin-td--id {
    color: var(--text-3);
    font-size: 12px;
  }

  .admin-td--id code {
    font-family: monospace;
    background: var(--bg-subtle);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .admin-td--actions {
    text-align: right;
    white-space: nowrap;
  }

  .admin-cell-value {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-2);
  }

  .admin-cell-empty {
    color: var(--text-3);
    font-style: italic;
  }

  .admin-cell-meta {
    font-family: monospace;
    font-size: 11px;
    color: var(--text-3);
  }

  /* ── Badges / Pills ──────────────────────────────────────────────────── */
  .admin-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
  }

  .admin-pill--green {
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
  }

  .admin-pill--red {
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
  }

  .admin-pill--purple {
    background: rgba(124, 58, 237, 0.12);
    color: #7c3aed;
  }

  .admin-pill--gray {
    background: var(--bg-subtle);
    color: var(--text-3);
  }

  .admin-table-expanded {
    background: var(--bg-subtle);
  }

  .admin-doc-preview {
    margin: 0;
    padding: 14px 18px;
    font-size: 12px;
    font-family: 'Fira Code', 'Cascadia Code', monospace;
    white-space: pre-wrap;
    word-break: break-all;
    color: var(--text-2);
    max-height: 340px;
    overflow-y: auto;
  }

  /* ── Pagination ──────────────────────────────────────────────────────── */
  .admin-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin-top: 20px;
  }

  .admin-pagination-info {
    font-size: 13px;
    color: var(--text-2);
    font-weight: 500;
  }

  /* ── Empty / Loading ─────────────────────────────────────────────────── */
  .admin-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 60px 20px;
    color: var(--text-3);
    font-size: 14px;
  }

  .admin-loading-center {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: #7c3aed;
  }

  /* ── Buttons ─────────────────────────────────────────────────────────── */
  .admin-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0 16px;
    height: 36px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s, transform 0.12s;
    white-space: nowrap;
  }

  .admin-btn:active {
    transform: scale(0.97);
  }

  .admin-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .admin-btn--sm {
    height: 32px;
    padding: 0 12px;
    font-size: 12px;
    border-radius: 8px;
  }

  .admin-btn--primary {
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    color: #fff;
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.30);
  }

  .admin-btn--primary:hover {
    background: linear-gradient(135deg, #6d28d9, #5b21b6);
  }

  .admin-btn--ghost {
    background: var(--bg-subtle);
    color: var(--text-2);
    border: 1px solid var(--border);
  }

  .admin-btn--ghost:hover {
    background: var(--border);
    color: var(--text);
  }

  .admin-btn--danger {
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.20);
  }

  .admin-btn--danger:hover {
    background: rgba(239, 68, 68, 0.20);
  }

  /* ── Icon Buttons ────────────────────────────────────────────────────── */
  .admin-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--text-2);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .admin-icon-btn:hover {
    background: var(--bg-subtle);
    color: var(--text);
  }

  .admin-icon-btn--sm {
    width: 28px;
    height: 28px;
    border-radius: 6px;
  }

  .admin-icon-btn--xs {
    width: 22px;
    height: 22px;
    border-radius: 5px;
  }

  .admin-icon-btn--edit:hover {
    background: rgba(99, 102, 241, 0.12);
    color: #6366f1;
  }

  .admin-icon-btn--cascade:hover {
    background: rgba(245, 158, 11, 0.12);
    color: #f59e0b;
  }

  .admin-icon-btn--danger:hover {
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
  }

  /* ── Overlay ─────────────────────────────────────────────────────────── */
  .admin-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.60);
    backdrop-filter: blur(4px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  /* ── Confirm Dialog ──────────────────────────────────────────────────── */
  .admin-dialog {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-modal);
    padding: 28px;
    max-width: 420px;
    width: 100%;
    box-shadow: var(--shadow-lg);
    text-align: center;
  }

  .admin-dialog-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 14px;
  }

  .admin-dialog-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 8px;
    color: var(--text);
  }

  .admin-dialog-desc {
    font-size: 13px;
    color: var(--text-2);
    line-height: 1.6;
    margin: 0 0 24px;
  }

  .admin-dialog-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  /* ── Edit Modal ──────────────────────────────────────────────────────── */
  .admin-edit-modal {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-modal);
    padding: 0;
    width: 100%;
    max-width: 680px;
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    overflow: hidden;
  }

  .admin-edit-modal-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 20px;
    border-bottom: 1px solid var(--border);
  }

  .admin-edit-modal-title {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 15px;
    font-weight: 700;
    flex: 1;
    color: var(--text);
  }

  .admin-edit-modal-collection {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--text-3);
    background: var(--bg-subtle);
    padding: 3px 10px;
    border-radius: 20px;
  }

  .admin-edit-modal-id {
    padding: 10px 20px;
    font-size: 12px;
    color: var(--text-3);
    display: flex;
    gap: 8px;
    align-items: center;
    border-bottom: 1px solid var(--border);
  }

  .admin-edit-modal-id code {
    font-family: monospace;
    color: var(--text-2);
  }

  .admin-edit-modal-hint {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-3);
  }

  .admin-json-editor {
    flex: 1;
    padding: 16px 20px;
    background: var(--bg-subtle);
    border: none;
    outline: none;
    font-family: 'Fira Code', 'Cascadia Code', 'Courier New', monospace;
    font-size: 13px;
    color: var(--text);
    resize: none;
    overflow-y: auto;
    line-height: 1.6;
    min-height: 320px;
  }

  .admin-edit-error {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    background: rgba(239, 68, 68, 0.08);
    color: #ef4444;
    font-size: 12px;
    border-top: 1px solid rgba(239, 68, 68, 0.15);
  }

  .admin-edit-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 20px;
    border-top: 1px solid var(--border);
  }

  /* ── Toasts ──────────────────────────────────────────────────────────── */
  .admin-toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 300;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  }

  .admin-toast {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 500;
    pointer-events: all;
    max-width: 360px;
    box-shadow: var(--shadow);
  }

  .admin-toast--success {
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.25);
    color: #10b981;
    backdrop-filter: blur(8px);
  }

  .admin-toast--error {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.25);
    color: #ef4444;
    backdrop-filter: blur(8px);
  }

  .admin-toast span {
    flex: 1;
  }

  .admin-toast-close {
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    opacity: 0.6;
    display: flex;
    align-items: center;
    padding: 0;
  }

  .admin-toast-close:hover {
    opacity: 1;
  }

  /* ── Utility ─────────────────────────────────────────────────────────── */
  .spin {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ── Responsive ──────────────────────────────────────────────────────── */
  @media (max-width: 860px) {
    .admin-sidebar { width: 220px; }
    .admin-content { padding: 18px 20px; }
    .admin-stats-grid--revenue { grid-template-columns: 1fr; }
    .admin-stats-grid { grid-template-columns: 1fr 1fr; }
  }

  @media (max-width: 640px) {
    .admin-root { flex-direction: column; }
    .admin-sidebar { width: 100%; height: auto; position: static; }
    .admin-stats-grid { grid-template-columns: 1fr; }
  }
`;
