import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { createAuditLog } from "../audit/create";
import { createNotification } from "../notification/create";

interface ApproveExtraPointsRequest {
  id: string;
  pointsAwarded: number;
}

interface ExtraPointRequest {
  id: string;
  status: string;
  pointsAwarded: number;
}

// Approves an extra point request and updates the final score.
export const approveExtraPoints = api<ApproveExtraPointsRequest, ExtraPointRequest>(
  { auth: true, expose: true, method: "POST", path: "/grading/extra-points/:id/approve" },
  async ({ id, pointsAwarded }) => {
    const auth = getAuthData()!;
    const hod = await db.queryRow<any>`
      SELECT role FROM users WHERE id = ${auth.userID}
    `;

    if (!hod || hod.role !== 'head_of_department') {
      throw APIError.permissionDenied("only head of department can approve extra points");
    }

    const request = await db.queryRow<any>`
      SELECT * FROM extra_point_requests WHERE id = ${id}
    `;

    if (!request) {
      throw APIError.notFound("request not found");
    }

    if (request.status !== 'PENDING') {
      throw APIError.invalidArgument("only pending requests can be approved");
    }

    await db.exec`
      UPDATE extra_point_requests 
      SET status = 'APPROVED', points_awarded = ${pointsAwarded}, 
          reviewed_by = ${auth.userID}, reviewed_at = NOW()
      WHERE id = ${id}
    `;

    const finalScore = await db.queryRow<any>`
      SELECT computed_score FROM final_scores WHERE registration_id = ${request.registration_id}
    `;

    const newExtraPoints = (finalScore?.computed_score || 0) + pointsAwarded;
    const newFinalScore = (finalScore?.computed_score || 0) + newExtraPoints;

    if (finalScore) {
      await db.exec`
        UPDATE final_scores 
        SET extra_points = extra_points + ${pointsAwarded},
            final_score = computed_score + extra_points + ${pointsAwarded},
            updated_at = NOW()
        WHERE registration_id = ${request.registration_id}
      `;
    } else {
      await db.exec`
        INSERT INTO final_scores (registration_id, computed_score, extra_points, final_score)
        VALUES (${request.registration_id}, 0, ${pointsAwarded}, ${pointsAwarded})
      `;
    }

    await createNotification({
      userId: request.student_id,
      message: `Your extra point request has been approved: +${pointsAwarded} points`,
      link: `/extra-points/${id}`,
    });

    await createAuditLog({
      actorId: auth.userID,
      action: "EXTRA_POINTS_APPROVED",
      targetId: id,
      details: { registrationId: request.registration_id, pointsAwarded },
    });

    return { id, status: "APPROVED", pointsAwarded };
  }
);
