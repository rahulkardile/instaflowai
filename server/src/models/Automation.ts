import mongoose from "mongoose";

const AutomationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    instagramAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstagramAccount",
    },
    reelId: String,
    keywords: [String],
    commentReply: String,
    dmMessage: String,
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Automation", AutomationSchema);
