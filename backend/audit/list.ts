import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import db from "../db";

interface ListAuditLogsParams {
  action?: Query<string>;
  actorId?: Query<string>;
  limit?: Query<number>;
}

interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetId: string;
  details: Record<string, any>;
  createdAt: Date;
}

interface ListAuditLogsResponse {
  logs: AuditLog[];
}

// Retrieves audit logs with optional filtering.
export const list = api<ListAuditLogsParams, ListAuditLogsResponse>(
  { expose: true, method: "GET", path: "/audit/logs" },
  async ({ action, actorId, limit = 100 }) => {
    let query = `
      SELECT al.*, u.display_name as actor_name
      FROM audit_logs al
      JOIN users u ON al.actor_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (action) {
      query += ` AND al.action = $${paramCount++}`;
      params.push(action);
    }

    if (actorId) {
      query += ` AND al.actor_id = $${paramCount++}`;
      params.push(actorId);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const rows = await db.rawQueryAll<any>(query, ...params);
    const logs = rows.map(row => ({
      id: row.id,
      actorId: row.actor_id,
      actorName: row.actor_name,
      action: row.action,
      targetId: row.target_id,
      details: row.details || {},
      createdAt: new Date(row.created_at),
    }));

    return { logs };
  }
);
