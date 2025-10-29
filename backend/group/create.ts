import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { nanoid } from "nanoid";
import { createAuditLog } from "../audit/create";

interface CreateGroupRequest {
  groupName: string;
}

interface Group {
  id: string;
  groupName: string;
  ownerId: string;
  members: string[];
}

// Creates a new student group.
export const create = api<CreateGroupRequest, Group>(
  { auth: true, expose: true, method: "POST", path: "/groups" },
  async ({ groupName }) => {
    const auth = getAuthData()!;
    const id = nanoid();
    
    await db.exec`
      INSERT INTO groups (id, group_name, owner_id)
      VALUES (${id}, ${groupName}, ${auth.userID})
    `;

    await db.exec`
      INSERT INTO group_members (group_id, user_id)
      VALUES (${id}, ${auth.userID})
    `;

    await createAuditLog({
      actorId: auth.userID,
      action: "GROUP_CREATED",
      targetId: id,
      details: { groupName },
    });

    return {
      id,
      groupName,
      ownerId: auth.userID,
      members: [auth.userID],
    };
  }
);
