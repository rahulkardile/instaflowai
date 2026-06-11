import mongoose from "mongoose";

const ReelSchema = new mongoose.Schema(
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
    caption: String,
    thumbnailUrl: String,
    permalink: String,
    commentsCount: Number,
    likesCount: Number,
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Reel", ReelSchema);
