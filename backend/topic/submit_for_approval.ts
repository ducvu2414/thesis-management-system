import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { createAuditLog } from "../audit/create";
import { createNotification } from "../notification/create";

interface SubmitForApprovalRequest {
  id: string;
}

interface Topic {
  id: string;
  status: string;
}

// Submits a topic for approval by the head of department.
export const submitForApproval = api<SubmitForApprovalRequest, Topic>(
  { auth: true, expose: true, method: "POST", path: "/topics/:id/submit" },
  async ({ id }) => {
    const auth = getAuthData()!;
    const topic = await db.queryRow<any>`
      SELECT * FROM topics WHERE id = ${id}
    `;

    if (!topic) {
      throw APIError.notFound("topic not found");
    }

    if (topic.supervisor_id !== auth.userID) {
      throw APIError.permissionDenied("only the supervisor can submit this topic");
    }

    if (topic.status !== 'DRAFT') {
      throw APIError.invalidArgument("only draft topics can be submitted");
    }

    await db.exec`
      UPDATE topics SET status = 'PENDING', updated_at = NOW() WHERE id = ${id}
    `;

    const hods = await db.queryAll<any>`
      SELECT id FROM users WHERE role = 'head_of_department' AND active = true
    `;
    
    for (const hod of hods) {
      await createNotification({
        userId: hod.id,
        message: `New topic "${topic.title}" submitted for approval`,
        link: `/topics/${id}`,
      });
    }

    await createAuditLog({
      actorId: auth.userID,
      action: "TOPIC_SUBMITTED",
      targetId: id,
      details: { title: topic.title },
    });

    return { id, status: "PENDING" };
  }
);
