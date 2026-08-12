import mongoose from "mongoose";
import {
  MAX_DB_POOL_SIZE,
  DB_SERVER_SELECTION_MS,
  DB_SOCKET_TIMEOUT_MS,
} from "../constants";

export async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI!, {
    maxPoolSize:              MAX_DB_POOL_SIZE,
    serverSelectionTimeoutMS: DB_SERVER_SELECTION_MS,
    socketTimeoutMS:          DB_SOCKET_TIMEOUT_MS,
    // Auto-index creation in dev; disable in production for safety
    autoIndex: process.env.NODE_ENV !== "production",
  });
  console.log("MongoDB Connected — pool size:", MAX_DB_POOL_SIZE);
}