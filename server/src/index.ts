import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import { connectDB } from "./config/db";

const app = express();
dotenv.config();

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());

app.get("/health", (_, res) => {
    res.status(200).json({
        success: true,
        message: "Server is healthy"
    });
});

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
