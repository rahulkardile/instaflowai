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

export default mongoose.model("ExecutionLog", ExecutionLogSchema);
