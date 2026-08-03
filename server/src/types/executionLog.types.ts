import { EXECUTION_ACTION, EXECUTION_STATUS } from "../constants";

// ─── Derived Types from Constants ──────────────────────────────────────────
export type ExecutionAction = (typeof EXECUTION_ACTION)[keyof typeof EXECUTION_ACTION];
export type ExecutionStatus = (typeof EXECUTION_STATUS)[keyof typeof EXECUTION_STATUS];

// ─── Execution Log Document Interface ─────────────────────────────────────
export interface IExecutionLog {
  _id: string;
  automationId?: string;
  userId?: string;
  instagramAccountId?: string;
  commenterId?: string;
  commenterUsername?: string;
  commentId?: string;
  commentText?: string;
  dmSenderId?: string;
  dmText?: string;
  action: ExecutionAction;
  status: ExecutionStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── DTOs for creating log entries ────────────────────────────────────────
export interface CommentReceivedLogDto {
  userId: string;
  instagramAccountId: string;
  commenterId: string;
  commenterUsername: string;
  commentId: string;
  commentText: string;
}

export interface DmReceivedLogDto {
  userId: string;
  instagramAccountId: string;
  dmSenderId: string;
  dmText: string;
}

export interface CommentReplyLogDto {
  automationId: string;
  commenterId: string;
  commenterUsername: string;
  commentId: string;
  commentText: string;
  status: ExecutionStatus;
  errorMessage?: string;
}

export interface DmAutoReplyLogDto {
  automationId: string;
  dmSenderId: string;
  dmText: string;
  status: ExecutionStatus;
  errorMessage?: string;
}

export interface SendDmLogDto {
  automationId: string;
  commenterId: string;
  commenterUsername: string;
  commentId: string;
  commentText: string;
  status: ExecutionStatus;
  errorMessage?: string;
}
