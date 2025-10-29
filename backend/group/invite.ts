import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { nanoid } from "nanoid";
import { createNotification } from "../notification/create";
import { createAuditLog } from "../audit/create";

interface InviteToGroupRequest {
  groupId: string;
  inviteeEmail: string;
}

interface Invitation {
  id: string;
  status: string;
}

// Invites a user to join a group.
export const invite = api<InviteToGroupRequest, Invitation>(
  { auth: true, expose: true, method: "POST", path: "/groups/:groupId/invite" },
  async ({ groupId, inviteeEmail }) => {
    const auth = getAuthData()!;
    const group = await db.queryRow<any>`
      SELECT owner_id FROM groups WHERE id = ${groupId}
    `;

    if (!group) {
      throw APIError.notFound("group not found");
    }

    if (group.owner_id !== auth.userID) {
      throw APIError.permissionDenied("only group owner can invite members");
    }

    const invitee = await db.queryRow<any>`
      SELECT id, role FROM users WHERE email = ${inviteeEmail}
    `;

    if (!invitee) {
      throw APIError.notFound("user not found");
    }

    if (invitee.role !== 'student') {
      throw APIError.invalidArgument("only students can be invited to groups");
    }

    const existingMember = await db.queryRow<any>`
      SELECT 1 FROM group_members WHERE group_id = ${groupId} AND user_id = ${invitee.id}
    `;

    if (existingMember) {
      throw APIError.alreadyExists("user is already a member");
    }

    const existingInvite = await db.queryRow<any>`
      SELECT id FROM group_invitations 
      WHERE group_id = ${groupId} AND invitee_email = ${inviteeEmail} AND status = 'PENDING'
    `;

    if (existingInvite) {
      throw APIError.alreadyExists("invitation already sent");
    }

    const id = nanoid();
    await db.exec`
      INSERT INTO group_invitations (id, group_id, inviter_id, invitee_email, status)
      VALUES (${id}, ${groupId}, ${auth.userID}, ${inviteeEmail}, 'PENDING')
    `;

    await createNotification({
      userId: invitee.id,
      message: `You have been invited to join a group`,
      link: `/groups/invitations/${id}`,
    });

    await createAuditLog({
      actorId: auth.userID,
      action: "GROUP_INVITATION_SENT",
      targetId: id,
      details: { groupId, inviteeEmail },
    });

    return { id, status: "PENDING" };
  }
);
