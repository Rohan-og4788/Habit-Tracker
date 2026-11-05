import { Notification } from "@/models/Notification";
import dbConnect from "@/lib/database";

export interface ListNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
}

/**
 * Recent in-app notifications for one user, plus the unread count.
 * Always scoped to the caller's userId.
 */
export async function listNotifications(userId: string, options: ListNotificationsOptions = {}) {
  await dbConnect();
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const query: any = { userId };
  if (options.unreadOnly) query.readAt = null;

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1, _id: -1 }).limit(limit).lean(),
    Notification.countDocuments({ userId, readAt: null }),
  ]);

  return { notifications, unreadCount };
}

/** Mark a single notification read/unread. Throws when it is not the caller's. */
export async function markNotificationRead(notificationId: string, userId: string, read: boolean) {
  await dbConnect();
  const updated = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { readAt: read ? new Date() : null } },
    { new: true }
  ).lean();
  if (!updated) throw new Error("Notification not found");
  return updated;
}

/** Mark every unread notification for one user as read. */
export async function markAllNotificationsRead(userId: string) {
  await dbConnect();
  const result = await Notification.updateMany(
    { userId, readAt: null },
    { $set: { readAt: new Date() } }
  );
  return { modified: result.modifiedCount };
}
