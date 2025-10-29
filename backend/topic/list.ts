import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import db from "../db";

interface ListTopicsParams {
  status?: Query<string>;
  supervisorId?: Query<string>;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  goals: string;
  requirements: string;
  maxStudents: number;
  currentStudents: number;
  supervisorId: string;
  status: string;
  createdAt: Date;
}

interface ListTopicsResponse {
  topics: Topic[];
}

// Retrieves all topics with optional filtering.
export const list = api<ListTopicsParams, ListTopicsResponse>(
  { auth: true, expose: true, method: "GET", path: "/topics" },
  async ({ status, supervisorId }) => {
    let query = `SELECT * FROM topics WHERE 1=1`;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount++}`;
      params.push(status);
    }

    if (supervisorId) {
      query += ` AND supervisor_id = $${paramCount++}`;
      params.push(supervisorId);
    }

    query += ` ORDER BY created_at DESC`;

    const rows = await db.rawQueryAll<any>(query, ...params);
    const topics = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      goals: row.goals,
      requirements: row.requirements,
      maxStudents: row.max_students,
      currentStudents: row.current_students,
      supervisorId: row.supervisor_id,
      status: row.status,
      createdAt: new Date(row.created_at),
    }));

    return { topics };
  }
);
