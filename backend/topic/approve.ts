import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { createAuditLog } from "../audit/create";
import { createNotification } from "../notification/create";

interface ApproveTopicRequest {
  id: string;
}

interface Topic {
  id: string;
  status: string;
}

// Approves a pending topic.
export const approve = api<ApproveTopicRequest, Topic>(
  { auth: true, expose: true, method: "POST", path: "/topics/:id/approve" },
  async ({ id }) => {
    const auth = getAuthData()!;
    const hod = await db.queryRow<any>`
      SELECT role FROM users WHERE id = ${auth.userID}
    `;

    if (!hod || hod.role !== 'head_of_department') {
      throw APIError.permissionDenied("only head of department can approve topics");
    }

    const topic = await db.queryRow<any>`
      SELECT * FROM topics WHERE id = ${id}
    `;

    if (!topic) {
      throw APIError.notFound("topic not found");
    }

    if (topic.status !== 'PENDING') {
      throw APIError.invalidArgument("only pending topics can be approved");
    }

    await db.exec`
      UPDATE topics SET status = 'APPROVED', updated_at = NOW() WHERE id = ${id}
    `;

    await createNotification({
      userId: topic.supervisor_id,
      message: `Your topic "${topic.title}" has been approved`,
      link: `/topics/${id}`,
    });

    await createAuditLog({
      actorId: auth.userID,
      action: "TOPIC_APPROVED",
      targetId: id,
      details: { title: topic.title, supervisorId: topic.supervisor_id },
    });

    return { id, status: "APPROVED" };
  }
);
