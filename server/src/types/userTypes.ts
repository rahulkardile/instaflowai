import { Document } from "mongoose";

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

export enum AuthProvider {
  GOOGLE = "google",
  META = "meta",
}

export interface IUser extends Document {
  name: string;
  email: string;
  role: UserRole;
  provider: AuthProvider;
  providerId: string;
  avatar?: string;
  isActive: boolean;
  instagramConnected: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}