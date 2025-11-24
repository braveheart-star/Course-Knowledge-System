import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { notificationsService } from "../services/notificationsService";

export class NotificationsController {
  async getNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const unreadOnly = req.query.unreadOnly === 'true';

      const notifications = await notificationsService.getNotifications(userId, { limit, unreadOnly });
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const count = await notificationsService.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { notificationId } = req.params;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const notification = await notificationsService.markAsRead(notificationId, userId);
      res.json({ message: "Notification marked as read", notification });
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      if (error.message === "Notification not found") {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export const notificationsController = new NotificationsController();

