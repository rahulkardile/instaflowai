import { AUTOMATION_TYPE } from "../constants";

// ─── Derived Types from Constants ──────────────────────────────────────────
export type AutomationType = (typeof AUTOMATION_TYPE)[keyof typeof AUTOMATION_TYPE];

// ─── Automation Document Interface ────────────────────────────────────────
export interface IAutomation {
  _id: string;
  userId: string;
  instagramAccountId: string;
  type: AutomationType;
  reelId?: string | null;
  keywords: string[];
  commentReply?: string;
  dmMessage?: string;
  dmReplyMessage?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── DTO: Create Automation ────────────────────────────────────────────────
export interface CreateAutomationDto {
  type: AutomationType;
  reelId?: string | null;
  keywords: string[];
  commentReply?: string;
  dmMessage?: string;
  dmReplyMessage?: string;
  enabled: boolean;
}

// ─── DTO: Update Automation ────────────────────────────────────────────────
export interface UpdateAutomationDto {
  type?: AutomationType;
  reelId?: string;
  keywords?: string[];
  commentReply?: string;
  dmMessage?: string;
  dmReplyMessage?: string;
  enabled?: boolean;
}
