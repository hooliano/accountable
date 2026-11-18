import express from "express";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./modules/auth/auth.routes.js";
import friendRoutes from "./modules/friends/friends.routes.js";

import cookieParser from "cookie-parser";

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/friends", friendRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));