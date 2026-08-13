import { NextFunction, Request, Response } from "express";

interface AppError extends Error {
  statusCode?: number;
}

/**
 * Centralised Express error handler.
 * Must be registered AFTER all routes with four parameters.
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = err.message ?? "Internal server error";

  if (process.env.NODE_ENV !== "production") {
    console.error("[ERROR]", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}
