import { api, APIError } from "encore.dev/api";
import db from "../db";
import { createAuditLog } from "../audit/create";
import { createNotification } from "../notification/create";

interface ComputeScoresRequest {
  registrationId: string;
  hodId: string;
}

interface FinalScore {
  registrationId: string;
  computedScore: number;
  extraPoints: number;
  finalScore: number;
}

// Computes the final score for a registration based on all submitted grades.
export const computeScores = api<ComputeScoresRequest, FinalScore>(
  { expose: true, method: "POST", path: "/grading/compute/:registrationId" },
  async ({ registrationId, hodId }) => {
    const hod = await db.queryRow<any>`
      SELECT role FROM users WHERE id = ${hodId}
    `;

    if (!hod || hod.role !== 'head_of_department') {
      throw APIError.permissionDenied("only head of department can compute scores");
    }

    const grades = await db.queryAll<any>`
      SELECT g.score, c.weight
      FROM grades g
      JOIN grading_criteria c ON g.criteria_id = c.id
      WHERE g.registration_id = ${registrationId}
    `;

    if (grades.length === 0) {
      throw APIError.invalidArgument("no grades submitted for this registration");
    }

    let totalScore = 0;
    let totalWeight = 0;

    for (const grade of grades) {
      totalScore += grade.score * grade.weight;
      totalWeight += grade.weight;
    }

    const computedScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    const existing = await db.queryRow<any>`
      SELECT extra_points FROM final_scores WHERE registration_id = ${registrationId}
    `;

    const extraPoints = existing?.extra_points || 0;
    const finalScore = computedScore + extraPoints;

    if (existing) {
      await db.exec`
        UPDATE final_scores 
        SET computed_score = ${computedScore}, 
            final_score = ${finalScore},
            computed_at = NOW(),
            updated_at = NOW()
        WHERE registration_id = ${registrationId}
      `;
    } else {
      await db.exec`
        INSERT INTO final_scores (registration_id, computed_score, extra_points, final_score, computed_at)
        VALUES (${registrationId}, ${computedScore}, ${extraPoints}, ${finalScore}, NOW())
      `;
    }

    const members = await db.queryAll<any>`
      SELECT gm.user_id
      FROM group_members gm
      JOIN topic_registrations tr ON gm.group_id = tr.group_id
      WHERE tr.id = ${registrationId}
    `;

    for (const member of members) {
      await createNotification({
        userId: member.user_id,
        message: `Your final score has been computed: ${finalScore.toFixed(2)}`,
        link: `/registrations/${registrationId}`,
      });
    }

    await createAuditLog({
      actorId: hodId,
      action: "SCORE_COMPUTED",
      targetId: registrationId,
      details: { computedScore, finalScore },
    });

    return {
      registrationId,
      computedScore,
      extraPoints,
      finalScore,
    };
  }
);
