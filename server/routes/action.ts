import { Router } from "express";
import { getAllData, handleAction } from "../controllers/action";

const router = Router();

router.get("/", getAllData);
router.post("/", handleAction);

export default router;
