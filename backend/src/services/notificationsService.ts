import { db } from "../db";
import { notifications, users } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

export class NotificationsService {
  async getNotifications(userId: string, options?: { limit?: number; unreadOnly?: boolean }) {
    const limit = options?.limit;
    const unreadOnly = options?.unreadOnly || false;

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

    return allNotifications.map(n => ({
      id: n.notification.id,
      type: n.notification.type,
      title: n.notification.title,
      message: n.notification.message,
      relatedId: n.notification.relatedId,
      read: n.notification.read || 0,
      createdAt: n.notification.createdAt,
    }));
  }

  async getUnreadCount(userId: string) {
    const unreadNotifications = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, 0)
        )
      );

    return unreadNotifications.length;
  }

  async markAsRead(notificationId: string, userId: string) {
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
      throw new Error("Notification not found");
    }

    return updated;
  }
}

export const notificationsService = new NotificationsService();

