import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes.js";
import projectRoutes from "./modules/projects/projects.routes.js";
import friendRoutes from "./modules/friends/friends.routes.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/friends", friendRoutes);

export default app;