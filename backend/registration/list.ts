import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import db from "../db";

interface ListRegistrationsParams {
  status?: Query<string>;
  supervisorId?: Query<string>;
  groupId?: Query<string>;
}

interface Registration {
  id: string;
  groupId: string;
  groupName: string;
  topicId: string;
  topicTitle: string;
  supervisorId: string;
  status: string;
  createdAt: Date;
}

interface ListRegistrationsResponse {
  registrations: Registration[];
}

// Retrieves all registrations with optional filtering.
export const list = api<ListRegistrationsParams, ListRegistrationsResponse>(
  { expose: true, method: "GET", path: "/registrations" },
  async ({ status, supervisorId, groupId }) => {
    let query = `
      SELECT 
        tr.id, tr.group_id, tr.topic_id, tr.supervisor_id, 
        tr.status, tr.created_at,
        g.group_name, t.title as topic_title
      FROM topic_registrations tr
      JOIN groups g ON tr.group_id = g.id
      JOIN topics t ON tr.topic_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND tr.status = $${paramCount++}`;
      params.push(status);
    }

    if (supervisorId) {
      query += ` AND tr.supervisor_id = $${paramCount++}`;
      params.push(supervisorId);
    }

    if (groupId) {
      query += ` AND tr.group_id = $${paramCount++}`;
      params.push(groupId);
    }

    query += ` ORDER BY tr.created_at DESC`;

    const rows = await db.rawQueryAll<any>(query, ...params);
    const registrations = rows.map(row => ({
      id: row.id,
      groupId: row.group_id,
      groupName: row.group_name,
      topicId: row.topic_id,
      topicTitle: row.topic_title,
      supervisorId: row.supervisor_id,
      status: row.status,
      createdAt: new Date(row.created_at),
    }));

    return { registrations };
  }
);
