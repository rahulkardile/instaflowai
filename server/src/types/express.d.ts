import { UserRole } from "./userTypes";

/**
 * Augment Express's Request interface so that `req.user` is strongly typed
 * everywhere in the codebase — no more `req.user!` casting or `any`.
 */
export interface RequestUser {
  /** MongoDB ObjectId string */
  userId: string;
  /** Alias for userId — kept for backwards compatibility */
  id: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export {};
