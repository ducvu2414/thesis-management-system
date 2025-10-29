import { api, APIError } from "encore.dev/api";
import db from "../db";
import { createAuditLog } from "../audit/create";

interface UpdateUserRequest {
  id: string;
  displayName?: string;
  role?: string;
  active?: boolean;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  active: boolean;
}

// Updates user information.
export const update = api<UpdateUserRequest, User>(
  { expose: true, method: "PATCH", path: "/users/:id" },
  async ({ id, displayName, role, active }) => {
    const existing = await db.queryRow<any>`
      SELECT * FROM users WHERE id = ${id}
    `;

    if (!existing) {
      throw APIError.notFound("user not found");
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (displayName) {
      updates.push(`display_name = $${paramCount++}`);
      params.push(displayName);
    }

    if (role) {
      const validRoles = ['student', 'supervisor', 'head_of_department', 'reviewer', 'admin'];
      if (!validRoles.includes(role)) {
        throw APIError.invalidArgument("invalid role");
      }
      updates.push(`role = $${paramCount++}`);
      params.push(role);
    }

    if (active !== undefined) {
      updates.push(`active = $${paramCount++}`);
      params.push(active);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      params.push(id);
      
      await db.rawExec(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        ...params
      );

      await createAuditLog({
        actorId: id,
        action: "USER_UPDATED",
        targetId: id,
        details: { displayName, role, active },
      });
    }

    const updated = await db.queryRow<any>`
      SELECT * FROM users WHERE id = ${id}
    `;

    return {
      id: updated!.id,
      email: updated!.email,
      displayName: updated!.display_name,
      role: updated!.role,
      active: updated!.active,
    };
  }
);
