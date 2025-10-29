import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import db from "../db";

interface ListExtraPointRequestsParams {
  status?: Query<string>;
  studentId?: Query<string>;
}

interface ExtraPointRequest {
  id: string;
  studentId: string;
  studentName: string;
  registrationId: string;
  reason: string;
  proofUrl?: string;
  status: string;
  pointsAwarded?: number;
  createdAt: Date;
}

interface ListExtraPointRequestsResponse {
  requests: ExtraPointRequest[];
}

// Retrieves all extra point requests with optional filtering.
export const listExtraPointRequests = api<ListExtraPointRequestsParams, ListExtraPointRequestsResponse>(
  { expose: true, method: "GET", path: "/grading/extra-points/requests" },
  async ({ status, studentId }) => {
    let query = `
      SELECT epr.*, u.display_name as student_name
      FROM extra_point_requests epr
      JOIN users u ON epr.student_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND epr.status = $${paramCount++}`;
      params.push(status);
    }

    if (studentId) {
      query += ` AND epr.student_id = $${paramCount++}`;
      params.push(studentId);
    }

    query += ` ORDER BY epr.created_at DESC`;

    const rows = await db.rawQueryAll<any>(query, ...params);
    const requests = rows.map(row => ({
      id: row.id,
      studentId: row.student_id,
      studentName: row.student_name,
      registrationId: row.registration_id,
      reason: row.reason,
      proofUrl: row.proof_url || undefined,
      status: row.status,
      pointsAwarded: row.points_awarded || undefined,
      createdAt: new Date(row.created_at),
    }));

    return { requests };
  }
);
