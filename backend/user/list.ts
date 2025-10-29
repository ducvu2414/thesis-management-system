import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import db from "../db";

interface ListUsersParams {
  role?: Query<string>;
  active?: Query<boolean>;
  limit?: Query<number>;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  active: boolean;
  createdAt: Date;
}

interface ListUsersResponse {
  users: User[];
}

// Retrieves all users with optional filtering by role and active status.
export const list = api<ListUsersParams, ListUsersResponse>(
  { auth: true, expose: true, method: "GET", path: "/users" },
  async ({ role, active, limit = 100 }) => {
    let query = `SELECT id, email, display_name, role, active, created_at FROM users WHERE 1=1`;
    const params: any[] = [];
    let paramCount = 1;

    if (role) {
      query += ` AND role = $${paramCount++}`;
      params.push(role);
    }

    if (active !== undefined) {
      query += ` AND active = $${paramCount++}`;
      params.push(active);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const rows = await db.rawQueryAll<any>(query, ...params);
    const users = rows.map(row => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      active: row.active,
      createdAt: new Date(row.created_at),
    }));

    return { users };
  }
);
