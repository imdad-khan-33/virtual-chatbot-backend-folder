import { Router } from "express";
import { answers, getAllUserAnswer } from "../controllers/assessmentAnswer.controller.js";
import { verifyJwt } from "../middleware/auth.middlewares.js";
const router = Router()

router.route("/answer").post(verifyJwt, answers)
router.route("/answer").get(verifyJwt, getAllUserAnswer)

export default router