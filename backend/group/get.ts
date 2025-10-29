import { api, APIError } from "encore.dev/api";
import db from "../db";

interface GetGroupParams {
  id: string;
}

interface GroupMember {
  userId: string;
  displayName: string;
  email: string;
}

interface Group {
  id: string;
  groupName: string;
  ownerId: string;
  members: GroupMember[];
}

// Retrieves a group by ID with member details.
export const get = api<GetGroupParams, Group>(
  { expose: true, method: "GET", path: "/groups/:id" },
  async ({ id }) => {
    const group = await db.queryRow<any>`
      SELECT * FROM groups WHERE id = ${id}
    `;

    if (!group) {
      throw APIError.notFound("group not found");
    }

    const memberRows = await db.queryAll<any>`
      SELECT u.id as user_id, u.display_name, u.email
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ${id}
    `;

    const members = memberRows.map(row => ({
      userId: row.user_id,
      displayName: row.display_name,
      email: row.email,
    }));

    return {
      id: group.id,
      groupName: group.group_name,
      ownerId: group.owner_id,
      members,
    };
  }
);
