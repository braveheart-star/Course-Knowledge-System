import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { chatWithAgent, getDetailedLessonInfo, ChatMessage } from "../services/chatAgent";

export class ChatController {
  async ask(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { question, conversationHistory } = req.body;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        res.status(400).json({ error: "Question is required" });
        return;
      }

      const history: ChatMessage[] = conversationHistory || [];
      
      const response = await chatWithAgent(question, userId, history);

      res.json(response);
    } catch (error: any) {
      console.error("Error in chat agent:", error);
      
      if (error.message?.includes('not enrolled')) {
        res.status(403).json({ error: error.message });
        return;
      }
      
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async getLessonInfo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { lessonId } = req.params;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!lessonId) {
        res.status(400).json({ error: "Lesson ID is required" });
        return;
      }

      const lessonInfo = await getDetailedLessonInfo(lessonId, userId);

      if (!lessonInfo) {
        res.status(404).json({ 
          error: "Lesson not found or you are not enrolled in this course" 
        });
        return;
      }

      res.json(lessonInfo);
    } catch (error: any) {
      console.error("Error fetching lesson info:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }
}

export const chatController = new ChatController();

