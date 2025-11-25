import express from "express";
import * as notificationsController from "../controllers/notificationsController";

const router = express.Router();

router.get("/", notificationsController.getNotifications);
router.get("/unread-count", notificationsController.getUnreadCount);
router.patch("/:notificationId/read", notificationsController.markAsRead);

export default router;
