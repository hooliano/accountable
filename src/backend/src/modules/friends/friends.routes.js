import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  sendRequest, listRequests, acceptRequest, deleteRequest,
} from "./friends.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/requests", listRequests);
router.post("/requests", sendRequest);
router.post("/requests/:userId/accept", acceptRequest);
router.delete("/requests/:userId", deleteRequest);

export default router;