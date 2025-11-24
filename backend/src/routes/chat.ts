import express from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { chatWithAgent, getDetailedLessonInfo, ChatMessage } from "../services/chatAgent";

const router = express.Router();

router.post("/ask", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { question, conversationHistory } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: "Question is required" });
    }

    const history: ChatMessage[] = conversationHistory || [];
    
    const response = await chatWithAgent(question, userId, history);

    res.json(response);
  } catch (error: any) {
    console.error("Error in chat agent:", error);
    
    if (error.message?.includes('not enrolled')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

router.get("/lesson/:lessonId", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { lessonId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!lessonId) {
      return res.status(400).json({ error: "Lesson ID is required" });
    }

    const lessonInfo = await getDetailedLessonInfo(lessonId, userId);

    if (!lessonInfo) {
      return res.status(404).json({ 
        error: "Lesson not found or you are not enrolled in this course" 
      });
    }

    res.json(lessonInfo);
  } catch (error: any) {
    console.error("Error fetching lesson info:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

export default router;

