import mongoose from "mongoose";

const ExecutionLogSchema = new mongoose.Schema(
  {
    automationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Automation",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    instagramAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstagramAccount",
    },
    commenterId: String,
    commenterUsername: String,
    commentId: String,
    commentText: String,
    dmSenderId: String,
    dmText: String,
    action: {
      type: String,
      enum: ["COMMENT_REPLY", "SEND_DM", "DM_AUTO_REPLY", "COMMENT_RECEIVED", "DM_RECEIVED"],
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
    },
    errorMessage: String,
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ───────────────────────────────────────────────────────────────
// Most frequent query patterns in descending priority
ExecutionLogSchema.index({ userId: 1, createdAt: -1 });          // user log feed
ExecutionLogSchema.index({ automationId: 1, createdAt: -1 });    // automation drill-down
ExecutionLogSchema.index({ action: 1, createdAt: -1 });          // filter by action type
ExecutionLogSchema.index({ dmSenderId: 1, createdAt: 1 });       // conversation thread
ExecutionLogSchema.index({ userId: 1, action: 1, createdAt: -1 });// admin cross-filter

export default mongoose.model("ExecutionLog", ExecutionLogSchema);
