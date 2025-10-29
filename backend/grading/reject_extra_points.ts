import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { createAuditLog } from "../audit/create";
import { createNotification } from "../notification/create";

interface RejectExtraPointsRequest {
  id: string;
}

interface ExtraPointRequest {
  id: string;
  status: string;
}

// Rejects an extra point request.
export const rejectExtraPoints = api<RejectExtraPointsRequest, ExtraPointRequest>(
  { auth: true, expose: true, method: "POST", path: "/grading/extra-points/:id/reject" },
  async ({ id }) => {
    const auth = getAuthData()!;
    const hod = await db.queryRow<any>`
      SELECT role FROM users WHERE id = ${auth.userID}
    `;

    if (!hod || hod.role !== 'head_of_department') {
      throw APIError.permissionDenied("only head of department can reject extra points");
    }

    const request = await db.queryRow<any>`
      SELECT * FROM extra_point_requests WHERE id = ${id}
    `;

    if (!request) {
      throw APIError.notFound("request not found");
    }

    if (request.status !== 'PENDING') {
      throw APIError.invalidArgument("only pending requests can be rejected");
    }

    await db.exec`
      UPDATE extra_point_requests 
      SET status = 'REJECTED', reviewed_by = ${auth.userID}, reviewed_at = NOW()
      WHERE id = ${id}
    `;

    await createNotification({
      userId: request.student_id,
      message: `Your extra point request has been rejected`,
      link: `/extra-points/${id}`,
    });

    await createAuditLog({
      actorId: auth.userID,
      action: "EXTRA_POINTS_REJECTED",
      targetId: id,
      details: { registrationId: request.registration_id },
    });

    return { id, status: "REJECTED" };
  }
);
