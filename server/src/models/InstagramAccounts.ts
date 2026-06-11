import mongoose from "mongoose";

const InstagramAccountSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        instagramUserId: String,
        username: String,
        pageId: String,
        accessToken: String,
        tokenExpiresAt: Date
    },
    {
        timestamps: true
    }
);

export default mongoose.model(
    "InstagramAccount",
    InstagramAccountSchema
);