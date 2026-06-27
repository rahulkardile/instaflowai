import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    className = "",
    children,
    ...props
  },
  ref,
) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 active:scale-[0.98] select-none disabled:opacity-40 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-apple-blue text-white hover:bg-apple-blue-hover rounded-apple-xs",
    secondary:
      "bg-apple-gray text-apple-dark hover:bg-apple-gray-2 rounded-apple-xs",
    outline:
      "border border-apple-gray-3 text-apple-dark hover:bg-apple-gray rounded-apple-xs",
    ghost: "text-apple-blue hover:bg-apple-blue/8 rounded-apple-xs",
    danger: "bg-red-500 text-white hover:bg-red-600 rounded-apple-xs",
  };
  const sizes = {
    sm: "px-3.5 py-2 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-[15px]",
    xl: "px-8 py-4 text-base",
  };
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
});

/* ─── Input ──────────────────────────────────────────────── */
export const Input = forwardRef(function Input(
  { label, error, hint, className = "", ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-apple-gray-5 tracking-wide uppercase">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`input-apple ${error ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-apple-gray-4">{hint}</p>}
    </div>
  );
});

/* ─── Badge ──────────────────────────────────────────────── */
export function Badge({ variant = "default", children, className = "" }) {
  const variants = {
    default: "bg-apple-gray text-apple-gray-4",
    blue: "bg-apple-blue/10 text-apple-blue",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-500",
  };
  return (
    <span className={`badge ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

/* ─── Spinner ────────────────────────────────────────────── */
export function Spinner({ size = 20, className = "" }) {
  return (
    <Loader2
      size={size}
      className={`animate-spin text-apple-blue ${className}`}
    />
  );
}

/* ─── Avatar ─────────────────────────────────────────────── */
export function Avatar({ name, src, size = "md", className = "" }) {
  const sizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  };
  const initials =
    name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  if (src)
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover ${className}`}
      />
    );
  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-apple-blue to-purple-500 flex items-center justify-center text-white font-semibold ${className}`}
    >
      {initials}
    </div>
  );
}

/* ─── Card ───────────────────────────────────────────────── */
export function Card({ children, className = "", glass = false }) {
  return (
    <div
      className={glass ? `glass-card ${className}` : `stat-card ${className}`}
    >
      {children}
    </div>
  );
}

/* ─── Divider ────────────────────────────────────────────── */
export function Divider({ label, className = "" }) {
  if (!label) return <div className={`divider ${className}`} />;
  return (
    <div className={`flex items-center gap-4 my-6 ${className}`}>
      <div className="flex-1 border-t border-apple-gray-2" />
      <span className="text-xs text-apple-gray-4 font-medium">{label}</span>
      <div className="flex-1 border-t border-apple-gray-2" />
    </div>
  );
}

/* ─── Toggle ─────────────────────────────────────────────── */
export function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? "bg-apple-blue" : "bg-apple-gray-3"
      } disabled:opacity-40`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
        style={{ width: 18, height: 18 }}
      />
    </button>
  );
}

/* ─── StatCard ───────────────────────────────────────────── */
export function StatCard({
  icon: Icon,
  label,
  value,
  change,
  changeType = "positive",
  color = "blue",
}) {
  const colors = {
    blue: { bg: "bg-apple-blue/10", icon: "text-apple-blue" },
    purple: { bg: "bg-purple-100", icon: "text-purple-500" },
    green: { bg: "bg-green-100", icon: "text-green-500" },
    pink: { bg: "bg-pink-100", icon: "text-pink-500" },
  };
  const c = colors[color];
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-apple-xs flex items-center justify-center ${c.bg}`}
        >
          {Icon && <Icon size={18} className={c.icon} />}
        </div>
        {change && (
          <Badge variant={changeType === "positive" ? "green" : "red"}>
            {changeType === "positive" ? "↑" : "↓"} {change}
          </Badge>
        )}
      </div>
      <p className="text-2xl font-semibold text-apple-dark tracking-tight">
        {value}
      </p>
      <p className="text-sm text-apple-gray-4 mt-1">{label}</p>
    </div>
  );
}
