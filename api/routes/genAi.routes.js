import express from "express";

import protect from "../middleware.js/auth.js";
import {
  morningCheckin,
  pollMessages,
  getChatContext,
  getMoodHistory,
  evaluateDistress,
  getDistressHistory,
} from "../controller/genAi.js";

const router = express.Router();

router.get("/chat/poll", protect, pollMessages);
router.post("/morning-checkin", protect, morningCheckin);
router.get("/chat/context", protect, getChatContext);
router.get("/mood-history", protect, getMoodHistory);
router.post("/distress/evaluate", protect, evaluateDistress);
router.get("/distress/history", protect, getDistressHistory);

export default router;
