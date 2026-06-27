import { Document } from "mongoose";

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

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

export interface IUser extends Document {
name: string;
  email: string;

  role: UserRole;

  provider: AuthProvider;
  providerId: string;

  // Local authentication only
  passwordHash?: string | null;

  // OAuth profile
  avatar?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  locale?: string | null;
  emailVerified: boolean;

  // Application fields
  isActive: boolean;
  instagramConnected: boolean;
  lastLoginAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}
