import { api } from "encore.dev/api";
import db from "../db";

interface ListMyGroupsRequest {
  userId: string;
}

interface GroupSummary {
  id: string;
  groupName: string;
  ownerId: string;
  memberCount: number;
}

interface ListMyGroupsResponse {
  groups: GroupSummary[];
}

// Retrieves all groups that a user is a member of.
export const listMyGroups = api<ListMyGroupsRequest, ListMyGroupsResponse>(
  { expose: true, method: "GET", path: "/groups/my" },
  async ({ userId }) => {
    const rows = await db.queryAll<any>`
      SELECT g.id, g.group_name, g.owner_id, COUNT(gm.user_id) as member_count
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE g.id IN (
        SELECT group_id FROM group_members WHERE user_id = ${userId}
      )
      GROUP BY g.id, g.group_name, g.owner_id
      ORDER BY g.created_at DESC
    `;

    const groups = rows.map(row => ({
      id: row.id,
      groupName: row.group_name,
      ownerId: row.owner_id,
      memberCount: parseInt(row.member_count),
    }));

    return { groups };
  }
);
