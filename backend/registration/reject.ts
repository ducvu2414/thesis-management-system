import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { createAuditLog } from "../audit/create";
import { createNotification } from "../notification/create";

interface RejectRegistrationRequest {
  id: string;
  reason: string;
}

interface Registration {
  id: string;
  status: string;
}

// Rejects a pending topic registration.
export const reject = api<RejectRegistrationRequest, Registration>(
  { auth: true, expose: true, method: "POST", path: "/registrations/:id/reject" },
  async ({ id, reason }) => {
    const auth = getAuthData()!;
    const registration = await db.queryRow<any>`
      SELECT * FROM topic_registrations WHERE id = ${id}
    `;

    if (!registration) {
      throw APIError.notFound("registration not found");
    }

    if (registration.supervisor_id !== auth.userID) {
      throw APIError.permissionDenied("only the supervisor can reject this registration");
    }

    if (registration.status !== 'PENDING') {
      throw APIError.invalidArgument("only pending registrations can be rejected");
    }

    const topic = await db.queryRow<any>`
      SELECT title FROM topics WHERE id = ${registration.topic_id}
    `;

    await db.exec`
      UPDATE topic_registrations 
      SET status = 'REJECTED', rejection_reason = ${reason}, updated_at = NOW()
      WHERE id = ${id}
    `;

    const members = await db.queryAll<any>`
      SELECT user_id FROM group_members WHERE group_id = ${registration.group_id}
    `;

    for (const member of members) {
      await createNotification({
        userId: member.user_id,
        message: `Your registration for "${topic!.title}" has been rejected: ${reason}`,
        link: `/registrations/${id}`,
      });
    }

    await createAuditLog({
      actorId: auth.userID,
      action: "REGISTRATION_REJECTED",
      targetId: id,
      details: { topicId: registration.topic_id, reason },
    });

    return { id, status: "REJECTED" };
  }
);
