import type { AuthSession } from "../types/AuthUser";

const STORAGE_KEY = "instaflow-user";

export const auth = {
  save(session: AuthSession) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  },

  get(): AuthSession | null {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },
  logout() {
    localStorage.removeItem(STORAGE_KEY);
  },
  isAuthenticated() {
    return !!this.get()?.token;
  },
};