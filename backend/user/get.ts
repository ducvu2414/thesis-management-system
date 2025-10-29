import { api, APIError } from "encore.dev/api";
import db from "../db";

interface GetUserParams {
  id: string;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  active: boolean;
  createdAt: Date;
}

// Retrieves a user by ID.
export const get = api<GetUserParams, User>(
  { expose: true, method: "GET", path: "/users/:id" },
  async ({ id }) => {
    const row = await db.queryRow<any>`
      SELECT id, email, display_name, role, active, created_at 
      FROM users 
      WHERE id = ${id}
    `;

    if (!row) {
      throw APIError.notFound("user not found");
    }

    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      active: row.active,
      createdAt: new Date(row.created_at),
    };
  }
);
