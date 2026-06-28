import mongoose from "mongoose";

const ExecutionLogSchema = new mongoose.Schema(
  {
    automationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Automation",
    },
    commenterId: String,
    commenterUsername: String,
    commentId: String,
    commentText: String,
    action: {
      type: String,
      enum: ["COMMENT_REPLY", "SEND_DM"],
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
