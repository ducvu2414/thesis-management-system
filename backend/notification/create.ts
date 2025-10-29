import db from "../db";
import { nanoid } from "nanoid";

interface CreateNotificationParams {
  userId: string;
  message: string;
  link?: string;
}

export async function createNotification({ userId, message, link }: CreateNotificationParams): Promise<void> {
  const id = nanoid();
  await db.exec`
    INSERT INTO notifications (id, user_id, message, link)
    VALUES (${id}, ${userId}, ${message}, ${link || null})
  `;
}
