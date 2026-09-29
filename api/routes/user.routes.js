import express from "express";

const router = express.Router();
import { signup, login, submitQuestionnaire } from "../controller/user.js";
import protect from "../middleware.js/auth.js";

router.post("/signup", signup);
router.post("/login", login);
router.post("/questionnaire", protect, submitQuestionnaire);

export default router;
