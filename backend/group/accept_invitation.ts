import { api, APIError } from "encore.dev/api";
import db from "../db";
import { createAuditLog } from "../audit/create";
import { createNotification } from "../notification/create";

interface AcceptInvitationRequest {
  invitationId: string;
  userId: string;
}

interface AcceptInvitationResponse {
  groupId: string;
}

// Accepts a group invitation.
export const acceptInvitation = api<AcceptInvitationRequest, AcceptInvitationResponse>(
  { expose: true, method: "POST", path: "/groups/invitations/:invitationId/accept" },
  async ({ invitationId, userId }) => {
    const invitation = await db.queryRow<any>`
      SELECT * FROM group_invitations WHERE id = ${invitationId}
    `;

    if (!invitation) {
      throw APIError.notFound("invitation not found");
    }

    const user = await db.queryRow<any>`
      SELECT email FROM users WHERE id = ${userId}
    `;

    if (!user || user.email !== invitation.invitee_email) {
      throw APIError.permissionDenied("this invitation is not for you");
    }

    if (invitation.status !== 'PENDING') {
      throw APIError.invalidArgument("invitation already responded to");
    }

    await db.exec`
      UPDATE group_invitations 
      SET status = 'ACCEPTED', responded_at = NOW()
      WHERE id = ${invitationId}
    `;

    await db.exec`
      INSERT INTO group_members (group_id, user_id)
      VALUES (${invitation.group_id}, ${userId})
    `;

    const group = await db.queryRow<any>`
      SELECT group_name, owner_id FROM groups WHERE id = ${invitation.group_id}
    `;

    await createNotification({
      userId: group!.owner_id,
      message: `${user.email} has joined your group "${group!.group_name}"`,
      link: `/groups/${invitation.group_id}`,
    });

    await createAuditLog({
      actorId: userId,
      action: "GROUP_INVITATION_ACCEPTED",
      targetId: invitationId,
      details: { groupId: invitation.group_id },
    });

    return { groupId: invitation.group_id };
  }
);
