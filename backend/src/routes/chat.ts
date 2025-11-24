import express from "express";
import { authenticate } from "../middleware/auth";
import { chatController } from "../controllers/chatController";

const router = express.Router();

router.post("/ask", authenticate, (req, res) => chatController.ask(req as any, res));
router.get("/lesson/:lessonId", authenticate, (req, res) => chatController.getLessonInfo(req as any, res));

export default router;

