import express from "express";
import { uploadCertificateMiddleware } from "../middleware/multer.js";
import {
  counsellorLogin,
  counsellorRegister,
  checkCounsellorStatus,
  uploadCertificate,
  getAllocatedVictims,
} from "../controller/counsellor.js";

const router = express.Router();

router.post("/login", counsellorLogin);
router.post("/register", counsellorRegister);
router.post(
  "/upload-certificate",
  uploadCertificateMiddleware.single("certificate"),
  uploadCertificate
);
router.get("/status/:email", checkCounsellorStatus);
router.get("/:counsellorId/victims", getAllocatedVictims);

export default router;
