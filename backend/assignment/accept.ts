import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { createAuditLog } from "../audit/create";
import { createNotification } from "../notification/create";

interface AcceptAssignmentRequest {
  id: string;
}

interface Assignment {
  id: string;
  status: string;
}

// Accepts a pending assignment.
export const accept = api<AcceptAssignmentRequest, Assignment>(
  { auth: true, expose: true, method: "POST", path: "/assignments/:id/accept" },
  async ({ id }) => {
    const auth = getAuthData()!;
    const assignment = await db.queryRow<any>`
      SELECT * FROM assignments WHERE id = ${id}
    `;

    if (!assignment) {
      throw APIError.notFound("assignment not found");
    }

    if (assignment.reviewer_id !== auth.userID) {
      throw APIError.permissionDenied("only the assigned reviewer can accept this");
    }

    if (assignment.status !== 'PENDING') {
      throw APIError.invalidArgument("only pending assignments can be accepted");
    }

    await db.exec`
      UPDATE assignments 
      SET status = 'ACCEPTED', responded_at = NOW()
      WHERE id = ${id}
    `;

    const hods = await db.queryAll<any>`
      SELECT id FROM users WHERE role = 'head_of_department' AND active = true
    `;

    for (const hod of hods) {
      await createNotification({
        userId: hod.id,
        message: `Assignment accepted by reviewer`,
        link: `/assignments/${id}`,
      });
    }

    await createAuditLog({
      actorId: auth.userID,
      action: "ASSIGNMENT_ACCEPTED",
      targetId: id,
      details: { registrationId: assignment.registration_id },
    });

    return { id, status: "ACCEPTED" };
  }
);
