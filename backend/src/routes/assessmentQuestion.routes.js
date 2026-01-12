import { Router } from "express";
import { questions, getQuestions } from "../controllers/assessmentQuestion.controller.js";
import { verifyJwt } from "../middleware/auth.middlewares.js";

const router = Router()

router.route("/question").post(verifyJwt, questions)
router.route("/question").get(verifyJwt, getQuestions)

export default router