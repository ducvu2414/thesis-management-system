import db from "../db";
import { nanoid } from "nanoid";

interface CreateAuditLogParams {
  actorId: string;
  action: string;
  targetId: string;
  details?: Record<string, any>;
}

export async function createAuditLog({ actorId, action, targetId, details }: CreateAuditLogParams): Promise<void> {
  const id = nanoid();
  await db.exec`
    INSERT INTO audit_logs (id, actor_id, action, target_id, details)
    VALUES (${id}, ${actorId}, ${action}, ${targetId}, ${JSON.stringify(details || {})})
  `;
}
