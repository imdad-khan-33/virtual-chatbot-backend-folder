import { Router } from "express";
import { logMood, getMoodHistory, getMoodAnalysis } from "../controllers/mood.controller.js";
import { verifyJwt } from "../middleware/auth.middlewares.js";

const router = Router();

// Secure all mood routes
router.use(verifyJwt);

router.route("/").post(logMood).get(getMoodHistory);
router.route("/analysis").get(getMoodAnalysis);

export default router;
