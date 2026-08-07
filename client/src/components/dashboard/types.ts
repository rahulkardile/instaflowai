export interface Reel {
  id: string;
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
  timestamp?: string;
}

export interface Automation {
  _id: string;
  type: "COMMENT" | "DM";
  reelId: string;
  keywords: string[];
  commentReply?: string;
  dmMessage?: string;
  dmReplyMessage?: string;
  enabled: boolean;
  createdAt: string;
}

export interface AutomationForm {
  keywords: string;
  commentReply: string;
  dmMessage: string;
  active: boolean;
}

export interface DMAutomationForm {
  keywords: string;
  dmReplyMessage: string;
  active: boolean;
}

export interface LogEntry {
  _id: string;
  commenterUsername?: string;
  commentText?: string;
  dmSenderId?: string;
  dmText?: string;
  action: "COMMENT_REPLY" | "SEND_DM" | "DM_AUTO_REPLY" | "COMMENT_RECEIVED" | "DM_RECEIVED";
  status: "SUCCESS" | "FAILED";
  error?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}
