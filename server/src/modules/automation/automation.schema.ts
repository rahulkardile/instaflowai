import { z } from "zod";
import { AUTOMATION_TYPE } from "../../constants";

// ─── Create Automation Schema ──────────────────────────────────────────────
export const createAutomationSchema = z
  .object({
    type: z.enum([AUTOMATION_TYPE.COMMENT, AUTOMATION_TYPE.DM]).default(AUTOMATION_TYPE.COMMENT),
    reelId: z.string().min(1, "reelId must not be empty").optional(),
    keywords: z.array(z.string()).default([]),
    commentReply: z.string().min(1).optional(),
    dmMessage: z.string().min(1).optional(),
    dmReplyMessage: z.string().min(1).optional(),
    enabled: z.boolean().default(true),
  })
  .refine(
    (data) => {
      // COMMENT automations require a reelId
      if (data.type === AUTOMATION_TYPE.COMMENT && !data.reelId) return false;
      return true;
    },
    { message: "reelId is required for COMMENT automations", path: ["reelId"] }
  );

// ─── Update Automation Schema ──────────────────────────────────────────────
export const updateAutomationSchema = z.object({
  type: z.enum([AUTOMATION_TYPE.COMMENT, AUTOMATION_TYPE.DM]).optional(),
  reelId: z.string().min(1).optional(),
  keywords: z.array(z.string()).optional(),
  commentReply: z.string().min(1).optional(),
  dmMessage: z.string().min(1).optional(),
  dmReplyMessage: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

// ─── Inferred types ────────────────────────────────────────────────────────
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;
export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>;
