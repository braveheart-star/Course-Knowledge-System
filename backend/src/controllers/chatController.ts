import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { chatWithAgent, ChatMessage } from "../services/chatAgent";

export const askQuestion = async (req: AuthRequest, res: Response) => {
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
};

