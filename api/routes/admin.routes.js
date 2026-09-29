import express from "express";
import {
  getVictims,
  getAdminStats,
  getCounsellors,
  updateCounsellorStatus,
  inviteCounsellor,
  deleteVictim,
  deleteCounsellor,
  getFreeVictims,
  approveAndAllocateCounsellor,
  getNotifications,
} from "../controller/admin.js";

const router = express.Router();

router.get("/victims", getVictims);
router.get("/victims/free", getFreeVictims);
router.delete("/victim/:id", deleteVictim);
router.get("/stats", getAdminStats);
router.get("/notifications", getNotifications);
router.get("/counsellors", getCounsellors);
router.put("/counsellor/:id/status", updateCounsellorStatus);
router.post("/counsellor/:id/approve-allocate", approveAndAllocateCounsellor);
router.delete("/counsellor/:id", deleteCounsellor);
router.post("/counsellor/invite", inviteCounsellor);

export default router;
