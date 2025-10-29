import { api, APIError } from "encore.dev/api";
import db from "../db";
import { createAuditLog } from "../audit/create";
import { nanoid } from "nanoid";

interface CreateUserRequest {
  email: string;
  displayName: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  active: boolean;
}

// Creates a new user account.
export const create = api<CreateUserRequest, User>(
  { expose: true, method: "POST", path: "/users" },
  async ({ email, displayName, role }) => {
    const validRoles = ['student', 'supervisor', 'head_of_department', 'reviewer', 'admin'];
    if (!validRoles.includes(role)) {
      throw APIError.invalidArgument("invalid role");
    }

    const existing = await db.queryRow<any>`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existing) {
      throw APIError.alreadyExists("user with this email already exists");
    }

    const id = nanoid();
    await db.exec`
      INSERT INTO users (id, email, display_name, role, active)
      VALUES (${id}, ${email}, ${displayName}, ${role}, true)
    `;

    await createAuditLog({
      actorId: id,
      action: "USER_CREATED",
      targetId: id,
      details: { email, role },
    });

    return {
      id,
      email,
      displayName,
      role,
      active: true,
    };
  }
);
