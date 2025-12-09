import express from "express";
import * as chatController from "../controllers/chatController";

const router = express.Router();

router.post("/ask", chatController.askQuestion);

export default router;

