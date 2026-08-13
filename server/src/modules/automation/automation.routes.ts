import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  listAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  getLogs,
} from "./automation.controller";

const automationRoutes = Router();

// All automation routes require authentication
automationRoutes.use(authMiddleware);

automationRoutes.get("/", listAutomations);
automationRoutes.post("/", createAutomation);
automationRoutes.put("/:id", updateAutomation);
automationRoutes.delete("/:id", deleteAutomation);
automationRoutes.get("/logs", getLogs);

export { automationRoutes };
