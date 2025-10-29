import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface ListNotificationsRequest {}

interface Notification {
  id: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

interface ListNotificationsResponse {
  notifications: Notification[];
}

// Retrieves all notifications for a user.
export const list = api<ListNotificationsRequest, ListNotificationsResponse>(
  { auth: true, expose: true, method: "GET", path: "/notifications" },
  async () => {
    const auth = getAuthData()!;
    const rows = await db.queryAll<any>`
      SELECT * FROM notifications 
      WHERE user_id = ${auth.userID}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const notifications = rows.map(row => ({
      id: row.id,
      message: row.message,
      link: row.link || undefined,
      isRead: row.is_read,
      createdAt: new Date(row.created_at),
    }));

    return { notifications };
  }
);
