import express from "express";
import * as chatController from "../controllers/chatController";

const router = express.Router();

router.post("/ask", chatController.askQuestion);
router.get("/lesson/:lessonId", chatController.getLessonInfo);

export default router;

