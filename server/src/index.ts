import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import { connectDB } from "./config/db";
import { authRoutes } from "./modules/auth/auth.routes";
import { instagramRoutes } from "./modules/instagram/instagram.routes";
import { automationRoutes } from "./modules/automation/automation.routes";

const app = express();
dotenv.config();
console.log(process.env.CLIENT_URL);
app.use(
  cors({
    origin: process.env.CLIENT_URL?.replace(/\/$/, "") || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(helmet());
app.use(compression());
app.use(express.json());

app.get("/health", (_, res) => {
    res.status(200).json({
        success: true,
        message: "Server is healthy"
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/instagram", instagramRoutes);
app.use("/api/automations", automationRoutes);

const PORT = Number(process.env.PORT) || 5000;

async function bootstrap() {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

bootstrap();
