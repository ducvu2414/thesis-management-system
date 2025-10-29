import { api } from "encore.dev/api";
import db from "../db";

interface MarkReadRequest {
  id: string;
  userId: string;
}

// Marks a notification as read.
export const markRead = api<MarkReadRequest, void>(
  { expose: true, method: "POST", path: "/notifications/:id/read" },
  async ({ id, userId }) => {
    await db.exec`
      UPDATE notifications 
      SET is_read = true 
      WHERE id = ${id} AND user_id = ${userId}
    `;
  }
);
