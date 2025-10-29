import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { createAuditLog } from "../audit/create";
import { createNotification } from "../notification/create";

interface RejectTopicRequest {
  id: string;
  reason: string;
}

interface Topic {
  id: string;
  status: string;
}

// Rejects a pending topic with a reason.
export const reject = api<RejectTopicRequest, Topic>(
  { auth: true, expose: true, method: "POST", path: "/topics/:id/reject" },
  async ({ id, reason }) => {
    const auth = getAuthData()!;
    const hod = await db.queryRow<any>`
      SELECT role FROM users WHERE id = ${auth.userID}
    `;

    if (!hod || hod.role !== 'head_of_department') {
      throw APIError.permissionDenied("only head of department can reject topics");
    }

    const topic = await db.queryRow<any>`
      SELECT * FROM topics WHERE id = ${id}
    `;

    if (!topic) {
      throw APIError.notFound("topic not found");
    }

    if (topic.status !== 'PENDING') {
      throw APIError.invalidArgument("only pending topics can be rejected");
    }

    await db.exec`
      UPDATE topics 
      SET status = 'REJECTED', rejection_reason = ${reason}, updated_at = NOW() 
      WHERE id = ${id}
    `;

    await createNotification({
      userId: topic.supervisor_id,
      message: `Your topic "${topic.title}" has been rejected: ${reason}`,
      link: `/topics/${id}`,
    });

    await createAuditLog({
      actorId: auth.userID,
      action: "TOPIC_REJECTED",
      targetId: id,
      details: { title: topic.title, reason, supervisorId: topic.supervisor_id },
    });

    return { id, status: "REJECTED" };
  }
);
