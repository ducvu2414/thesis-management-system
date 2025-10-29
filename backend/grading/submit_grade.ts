import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { nanoid } from "nanoid";
import { createAuditLog } from "../audit/create";

interface SubmitGradeRequest {
  registrationId: string;
  criteriaId: string;
  score: number;
  comments?: string;
}

interface Grade {
  id: string;
  registrationId: string;
  graderId: string;
  criteriaId: string;
  score: number;
  comments?: string;
}

// Submits a grade for a specific criteria.
export const submitGrade = api<SubmitGradeRequest, Grade>(
  { auth: true, expose: true, method: "POST", path: "/grading/grades" },
  async ({ registrationId, criteriaId, score, comments }) => {
    const auth = getAuthData()!;
    const graderId = auth.userID;
    const registration = await db.queryRow<any>`
      SELECT status FROM topic_registrations WHERE id = ${registrationId}
    `;

    if (!registration) {
      throw APIError.notFound("registration not found");
    }

    if (registration.status !== 'CONFIRMED') {
      throw APIError.invalidArgument("can only grade confirmed registrations");
    }

    const criteria = await db.queryRow<any>`
      SELECT * FROM grading_criteria WHERE id = ${criteriaId}
    `;

    if (!criteria) {
      throw APIError.notFound("criteria not found");
    }

    const grader = await db.queryRow<any>`
      SELECT role FROM users WHERE id = ${graderId}
    `;

    if (!grader || !criteria.applicable_to.includes(grader.role)) {
      throw APIError.permissionDenied("this criteria is not applicable to your role");
    }

    if (score < 0 || score > 10) {
      throw APIError.invalidArgument("score must be between 0 and 10");
    }

    const existing = await db.queryRow<any>`
      SELECT id FROM grades 
      WHERE registration_id = ${registrationId} 
        AND grader_id = ${graderId} 
        AND criteria_id = ${criteriaId}
    `;

    if (existing) {
      await db.exec`
        UPDATE grades 
        SET score = ${score}, comments = ${comments || null}, updated_at = NOW()
        WHERE id = ${existing.id}
      `;

      await createAuditLog({
        actorId: graderId,
        action: "GRADE_UPDATED",
        targetId: existing.id,
        details: { registrationId, criteriaId, score },
      });

      return {
        id: existing.id,
        registrationId,
        graderId: auth.userID,
        criteriaId,
        score,
        comments,
      };
    }

    const id = nanoid();
    await db.exec`
      INSERT INTO grades (id, registration_id, grader_id, criteria_id, score, comments)
      VALUES (${id}, ${registrationId}, ${graderId}, ${criteriaId}, ${score}, ${comments || null})
    `;

    await createAuditLog({
      actorId: graderId,
      action: "GRADE_SUBMITTED",
      targetId: id,
      details: { registrationId, criteriaId, score },
    });

    return {
      id,
      registrationId,
      graderId: auth.userID,
      criteriaId,
      score,
      comments,
    };
  }
);
