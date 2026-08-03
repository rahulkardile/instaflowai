import { Document } from "mongoose";

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

/** Payload embedded inside the JWT token */
export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}

export enum AuthProvider {
  LOCAL = "local",
  GOOGLE = "google",
  META = "meta",
}

/** Full User document stored in MongoDB */
export interface IUser extends Document {
  name: string;
  email: string;
  role: UserRole;
  provider: AuthProvider;
  providerId: string;

  // Local authentication only
  passwordHash?: string | null;

  // OAuth profile fields
  avatar?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  locale?: string | null;
  emailVerified: boolean;

  // Application flags
  isActive: boolean;
  instagramConnected: boolean;
  lastLoginAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

/** Sanitised user shape returned from auth endpoints (no sensitive fields) */
export interface AuthPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
  instagramConnected: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
