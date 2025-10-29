import { api, APIError } from "encore.dev/api";
import db from "../db";

interface GetTopicParams {
  id: string;
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
  rejectionReason?: string;
}

// Retrieves a topic by ID.
export const get = api<GetTopicParams, Topic>(
  { expose: true, method: "GET", path: "/topics/:id" },
  async ({ id }) => {
    const row = await db.queryRow<any>`
      SELECT * FROM topics WHERE id = ${id}
    `;

    if (!row) {
      throw APIError.notFound("topic not found");
    }

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      goals: row.goals,
      requirements: row.requirements,
      maxStudents: row.max_students,
      currentStudents: row.current_students,
      supervisorId: row.supervisor_id,
      status: row.status,
      rejectionReason: row.rejection_reason || undefined,
    };
  }
);
