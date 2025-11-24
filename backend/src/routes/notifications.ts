import express from "express";
import { authenticate } from "../middleware/auth";
import { notificationsController } from "../controllers/notificationsController";

const router = express.Router();

router.get("/", authenticate, (req, res) => notificationsController.getNotifications(req as any, res));
router.get("/unread-count", authenticate, (req, res) => notificationsController.getUnreadCount(req as any, res));
router.patch("/:notificationId/read", authenticate, (req, res) => notificationsController.markAsRead(req as any, res));

export default router;

