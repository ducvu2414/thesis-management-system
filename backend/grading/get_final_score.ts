import { api, APIError } from "encore.dev/api";
import db from "../db";

interface GetFinalScoreParams {
  registrationId: string;
}

interface GradeDetail {
  criteriaName: string;
  graderName: string;
  score: number;
  weight: number;
  comments?: string;
}

interface FinalScore {
  registrationId: string;
  computedScore: number;
  extraPoints: number;
  finalScore: number;
  grades: GradeDetail[];
}

// Retrieves the final score and all grade details for a registration.
export const getFinalScore = api<GetFinalScoreParams, FinalScore>(
  { expose: true, method: "GET", path: "/grading/final-score/:registrationId" },
  async ({ registrationId }) => {
    const finalScore = await db.queryRow<any>`
      SELECT * FROM final_scores WHERE registration_id = ${registrationId}
    `;

    if (!finalScore) {
      return {
        registrationId,
        computedScore: 0,
        extraPoints: 0,
        finalScore: 0,
        grades: [],
      };
    }

    const gradeRows = await db.queryAll<any>`
      SELECT g.score, g.comments, c.name as criteria_name, c.weight, u.display_name as grader_name
      FROM grades g
      JOIN grading_criteria c ON g.criteria_id = c.id
      JOIN users u ON g.grader_id = u.id
      WHERE g.registration_id = ${registrationId}
      ORDER BY c.name, u.display_name
    `;

    const grades = gradeRows.map(row => ({
      criteriaName: row.criteria_name,
      graderName: row.grader_name,
      score: row.score,
      weight: row.weight,
      comments: row.comments || undefined,
    }));

    return {
      registrationId,
      computedScore: finalScore.computed_score,
      extraPoints: finalScore.extra_points,
      finalScore: finalScore.final_score,
      grades,
    };
  }
);
