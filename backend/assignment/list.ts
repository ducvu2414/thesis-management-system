import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import db from "../db";

interface ListAssignmentsParams {
  registrationId?: Query<string>;
  reviewerId?: Query<string>;
  status?: Query<string>;
}

interface Assignment {
  id: string;
  registrationId: string;
  reviewerId: string;
  reviewerName: string;
  role: string;
  status: string;
  createdAt: Date;
}

interface ListAssignmentsResponse {
  assignments: Assignment[];
}

// Retrieves all assignments with optional filtering.
export const list = api<ListAssignmentsParams, ListAssignmentsResponse>(
  { expose: true, method: "GET", path: "/assignments" },
  async ({ registrationId, reviewerId, status }) => {
    let query = `
      SELECT a.*, u.display_name as reviewer_name
      FROM assignments a
      JOIN users u ON a.reviewer_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (registrationId) {
      query += ` AND a.registration_id = $${paramCount++}`;
      params.push(registrationId);
    }

    if (reviewerId) {
      query += ` AND a.reviewer_id = $${paramCount++}`;
      params.push(reviewerId);
    }

    if (status) {
      query += ` AND a.status = $${paramCount++}`;
      params.push(status);
    }

    query += ` ORDER BY a.created_at DESC`;

    const rows = await db.rawQueryAll<any>(query, ...params);
    const assignments = rows.map(row => ({
      id: row.id,
      registrationId: row.registration_id,
      reviewerId: row.reviewer_id,
      reviewerName: row.reviewer_name,
      role: row.role,
      status: row.status,
      createdAt: new Date(row.created_at),
    }));

    return { assignments };
  }
);
