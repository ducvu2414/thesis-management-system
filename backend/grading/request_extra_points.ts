import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { nanoid } from "nanoid";
import { createAuditLog } from "../audit/create";
import { createNotification } from "../notification/create";

interface RequestExtraPointsRequest {
  registrationId: string;
  reason: string;
  proofUrl?: string;
}

interface ExtraPointRequest {
  id: string;
  status: string;
}

// Creates an extra point request for a student.
export const requestExtraPoints = api<RequestExtraPointsRequest, ExtraPointRequest>(
  { auth: true, expose: true, method: "POST", path: "/grading/extra-points/request" },
  async ({ registrationId, reason, proofUrl }) => {
    const auth = getAuthData()!;
    const id = nanoid();
    
    await db.exec`
      INSERT INTO extra_point_requests (
        id, student_id, registration_id, reason, proof_url, status
      )
      VALUES (
        ${id}, ${auth.userID}, ${registrationId}, ${reason}, ${proofUrl || null}, 'PENDING'
      )
    `;

    const hods = await db.queryAll<any>`
      SELECT id FROM users WHERE role = 'head_of_department' AND active = true
    `;

    for (const hod of hods) {
      await createNotification({
        userId: hod.id,
        message: `New extra point request from student`,
        link: `/extra-points/${id}`,
      });
    }

    await createAuditLog({
      actorId: auth.userID,
      action: "EXTRA_POINTS_REQUESTED",
      targetId: id,
      details: { registrationId, reason },
    });

    return { id, status: "PENDING" };
  }
);
