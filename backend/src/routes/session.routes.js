import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middlewares.js";
import { markSessionComplete } from "../controllers/session.controller.js";

const router = Router();

router.use(verifyJwt);

router.post("/complete", markSessionComplete);

export default router;
