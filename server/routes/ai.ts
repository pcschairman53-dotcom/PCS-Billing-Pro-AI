import { Router } from "express";
import { analyzeBusinessMetrics } from "../controllers/ai";

const router = Router();

router.post("/analyze", analyzeBusinessMetrics);

export default router;
