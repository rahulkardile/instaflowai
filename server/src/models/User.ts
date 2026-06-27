import { Schema, model } from "mongoose";
import { IUser, UserRole, AuthProvider } from "../types/userTypes";

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },

    provider: {
      type: String,
      enum: Object.values(AuthProvider),
      required: true,
    },

    providerId: {
      type: String,
      required: true,
      index: true,
    },

    passwordHash: {
      type: String,
      select: false,
      default: null,
    },

    avatar: {
      type: String,
      default: null,
    },

    instagramConnected: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
    givenName: {
      type: String,
      default: null,
    },

    familyName: {
      type: String,
      default: null,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    locale: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ provider: 1, providerId: 1 });

export const User = model<IUser>("User", userSchema);
