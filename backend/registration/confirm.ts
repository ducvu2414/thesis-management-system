import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { createAuditLog } from "../audit/create";
import { createNotification } from "../notification/create";

interface ConfirmRegistrationRequest {
  id: string;
}

interface Registration {
  id: string;
  status: string;
}

// Confirms a pending topic registration.
export const confirm = api<ConfirmRegistrationRequest, Registration>(
  { auth: true, expose: true, method: "POST", path: "/registrations/:id/confirm" },
  async ({ id }) => {
    const auth = getAuthData()!;
    const registration = await db.queryRow<any>`
      SELECT * FROM topic_registrations WHERE id = ${id}
    `;

    if (!registration) {
      throw APIError.notFound("registration not found");
    }

    if (registration.supervisor_id !== auth.userID) {
      throw APIError.permissionDenied("only the supervisor can confirm this registration");
    }

    if (registration.status !== 'PENDING') {
      throw APIError.invalidArgument("only pending registrations can be confirmed");
    }

    const topic = await db.queryRow<any>`
      SELECT title FROM topics WHERE id = ${registration.topic_id}
    `;

    const memberCount = await db.queryRow<any>`
      SELECT COUNT(*) as count FROM group_members WHERE group_id = ${registration.group_id}
    `;

    await db.exec`
      UPDATE topic_registrations 
      SET status = 'CONFIRMED', updated_at = NOW()
      WHERE id = ${id}
    `;

    await db.exec`
      UPDATE topics 
      SET current_students = current_students + ${parseInt(memberCount!.count)}
      WHERE id = ${registration.topic_id}
    `;

    const members = await db.queryAll<any>`
      SELECT user_id FROM group_members WHERE group_id = ${registration.group_id}
    `;

    for (const member of members) {
      await createNotification({
        userId: member.user_id,
        message: `Your registration for "${topic!.title}" has been confirmed`,
        link: `/registrations/${id}`,
      });
    }

    await createAuditLog({
      actorId: auth.userID,
      action: "REGISTRATION_CONFIRMED",
      targetId: id,
      details: { topicId: registration.topic_id },
    });

    return { id, status: "CONFIRMED" };
  }
);
