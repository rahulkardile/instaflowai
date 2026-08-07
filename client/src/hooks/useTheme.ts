import { useState, useEffect } from "react";
import { STORAGE } from "../constants";

export type Theme = "light" | "dark";

/**
 * Manages light / dark theme.
 * - Reads from localStorage on first mount.
 * - Falls back to the OS preference.
 * - Applies `class="dark"` to <html> for Tailwind dark: variants.
 * - Persists the choice to localStorage.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE.THEME);
      if (stored === "dark" || stored === "light") return stored;
    } catch {
      // localStorage may be unavailable in SSR / sandboxed contexts
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem(STORAGE.THEME, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const isDark = theme === "dark";

  return { theme, isDark, toggleTheme };
}
