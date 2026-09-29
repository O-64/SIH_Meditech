import express from "express";

import protect from "../middleware.js/auth.js";
import { getMoodHistory } from "../controller/genAi.js";
import {
  morningCheckin,
  pollMessages,
  getChatContext,
} from "../controller/genAi.js";

const router = express.Router();

router.get("/chat/poll", protect, pollMessages);
router.post("/morning-checkin", protect, morningCheckin);
router.get("/chat/context", protect, getChatContext);
router.get("/mood-history", protect, getMoodHistory);

export default router;
