import express from "express";
import cors from "cors";
import "dotenv/config";
import authRoutes from "./modules/auth/auth.routes.js";
import cookieParser from "cookie-parser";
import projectRoutes from "./modules/projects/projects.routes.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);

export default app;
