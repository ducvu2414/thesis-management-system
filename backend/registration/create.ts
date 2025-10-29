import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { nanoid } from "nanoid";
import { createAuditLog } from "../audit/create";
import { createNotification } from "../notification/create";

interface CreateRegistrationRequest {
  groupId: string;
  topicId: string;
}

interface Registration {
  id: string;
  groupId: string;
  topicId: string;
  supervisorId: string;
  status: string;
}

// Creates a new topic registration for a group.
export const create = api<CreateRegistrationRequest, Registration>(
  { auth: true, expose: true, method: "POST", path: "/registrations" },
  async ({ groupId, topicId }) => {
    const auth = getAuthData()!;
    const group = await db.queryRow<any>`
      SELECT owner_id FROM groups WHERE id = ${groupId}
    `;

    if (!group) {
      throw APIError.notFound("group not found");
    }

    if (group.owner_id !== auth.userID) {
      throw APIError.permissionDenied("only group owner can register for topics");
    }

    const topic = await db.queryRow<any>`
      SELECT * FROM topics WHERE id = ${topicId}
    `;

    if (!topic) {
      throw APIError.notFound("topic not found");
    }

    if (topic.status !== 'APPROVED') {
      throw APIError.invalidArgument("can only register for approved topics");
    }

    const memberCount = await db.queryRow<any>`
      SELECT COUNT(*) as count FROM group_members WHERE group_id = ${groupId}
    `;

    const totalCount = topic.current_students + parseInt(memberCount!.count);
    if (totalCount > topic.max_students) {
      throw APIError.failedPrecondition("topic has reached maximum student capacity");
    }

    const existingReg = await db.queryRow<any>`
      SELECT id FROM topic_registrations WHERE group_id = ${groupId}
    `;

    if (existingReg) {
      throw APIError.alreadyExists("group has already registered for a topic");
    }

    const memberRegs = await db.queryAll<any>`
      SELECT gm.user_id 
      FROM group_members gm
      WHERE gm.group_id = ${groupId}
        AND EXISTS (
          SELECT 1 FROM group_members gm2
          JOIN topic_registrations tr ON gm2.group_id = tr.group_id
          WHERE gm2.user_id = gm.user_id
        )
    `;

    if (memberRegs.length > 0) {
      throw APIError.failedPrecondition("one or more members are already registered in another group");
    }

    const id = nanoid();
    await db.exec`
      INSERT INTO topic_registrations (
        id, group_id, topic_id, supervisor_id, status
      )
      VALUES (
        ${id}, ${groupId}, ${topicId}, ${topic.supervisor_id}, 'PENDING'
      )
    `;

    await createNotification({
      userId: topic.supervisor_id,
      message: `New registration for topic "${topic.title}"`,
      link: `/registrations/${id}`,
    });

    await createAuditLog({
      actorId: auth.userID,
      action: "REGISTRATION_CREATED",
      targetId: id,
      details: { groupId, topicId },
    });

    return {
      id,
      groupId,
      topicId,
      supervisorId: topic.supervisor_id,
      status: "PENDING",
    };
  }
);
