import { Router } from "express";
import { register, login, logout, me, updateProfile } from "./auth.controller.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, updateProfile);

export default router;