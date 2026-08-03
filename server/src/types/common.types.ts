// ─── Standard JSON API response wrapper ───────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

// ─── Pagination ────────────────────────────────────────────────────────────
export interface PaginationQuery {
  page?: number;
  limit?: number;
}
