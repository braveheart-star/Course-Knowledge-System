import express from "express";
import { db } from "../db";
import { notifications, users } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const unreadOnly = req.query.unreadOnly === 'true';

    let query = db
      .select({
        notification: notifications,
        user: users,
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.userId, users.id));

    if (unreadOnly) {
      query = query.where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, 0)
        )
      ) as any;
    } else {
      query = query.where(eq(notifications.userId, userId)) as any;
    }

    query = query.orderBy(desc(notifications.createdAt)) as any;

    const allNotifications = limit ? await query.limit(limit) : await query;

    res.json(allNotifications.map(n => ({
      id: n.notification.id,
      type: n.notification.type,
      title: n.notification.title,
      message: n.notification.message,
      relatedId: n.notification.relatedId,
      read: n.notification.read || 0,
      createdAt: n.notification.createdAt,
    })));
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/unread-count", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const unreadNotifications = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, 0)
        )
      );

    res.json({ count: unreadNotifications.length });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:notificationId/read", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { notificationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [updated] = await db
      .update(notifications)
      .set({ read: 1 })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ message: "Notification marked as read", notification: updated });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

