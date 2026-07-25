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
    type: {
      type: String,
      enum: ["COMMENT", "DM"],
      default: "COMMENT",
    },
    reelId: {
      type: String,
      default: null,
    },
    keywords: [String],
    commentReply: String,
    dmMessage: String,
    dmReplyMessage: String,
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
