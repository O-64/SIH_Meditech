import express from "express";

const router = express.Router();
import { signup, login, submitQuestionnaire, getMyCounsellor } from "../controller/user.js";
import protect from "../middleware.js/auth.js";

router.post("/signup", signup);
router.post("/login", login);
router.post("/questionnaire", protect, submitQuestionnaire);
router.get("/my-counsellor", protect, getMyCounsellor);

export default router;
