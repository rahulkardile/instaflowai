import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { adminMiddleware } from "../../middleware/adminMiddleware";
import {
  listCollections,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  dropCollection,
  deleteUser,
  getStats,
} from "./admin.controller";

const adminRoutes = Router();

// All admin routes require authentication + admin role
adminRoutes.use(authMiddleware, adminMiddleware);

// ── Stats overview ─────────────────────────────────────────────────────────
adminRoutes.get("/stats", getStats);

// ── Collection list ────────────────────────────────────────────────────────
adminRoutes.get("/collections", listCollections);

// ── Documents in a collection ──────────────────────────────────────────────
adminRoutes.get("/collections/:name", getDocuments);

// ── Single document ────────────────────────────────────────────────────────
adminRoutes.get("/collections/:name/:id", getDocument);
adminRoutes.patch("/collections/:name/:id", updateDocument);
adminRoutes.delete("/collections/:name/:id", deleteDocument);

// ── Drop entire collection ─────────────────────────────────────────────────
adminRoutes.delete("/collections/:name", dropCollection);

// ── Cascade-delete user + all data ────────────────────────────────────────
adminRoutes.delete("/users/:id", deleteUser);

export { adminRoutes };
