import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { nanoid } from "nanoid";
import { createAuditLog } from "../audit/create";
import { createNotification } from "../notification/create";

interface CreateAssignmentRequest {
  registrationId: string;
  reviewerId: string;
  role: string;
}

interface Assignment {
  id: string;
  registrationId: string;
  reviewerId: string;
  role: string;
  status: string;
}

// Creates a reviewer or committee assignment for a registration.
export const create = api<CreateAssignmentRequest, Assignment>(
  { auth: true, expose: true, method: "POST", path: "/assignments" },
  async ({ registrationId, reviewerId, role }) => {
    const auth = getAuthData()!;
    const hod = await db.queryRow<any>`
      SELECT role FROM users WHERE id = ${auth.userID}
    `;

    if (!hod || hod.role !== 'head_of_department') {
      throw APIError.permissionDenied("only head of department can create assignments");
    }

    const registration = await db.queryRow<any>`
      SELECT supervisor_id FROM topic_registrations WHERE id = ${registrationId}
    `;

    if (!registration) {
      throw APIError.notFound("registration not found");
    }

    if (registration.supervisor_id === reviewerId) {
      throw APIError.invalidArgument("cannot assign supervisor as reviewer");
    }

    const reviewer = await db.queryRow<any>`
      SELECT role FROM users WHERE id = ${reviewerId}
    `;

    if (!reviewer || (reviewer.role !== 'supervisor' && reviewer.role !== 'reviewer')) {
      throw APIError.invalidArgument("reviewer must be a supervisor or reviewer");
    }

    if (role !== 'reviewer' && role !== 'committee') {
      throw APIError.invalidArgument("role must be 'reviewer' or 'committee'");
    }

    const id = nanoid();
    await db.exec`
      INSERT INTO assignments (id, registration_id, reviewer_id, role, status)
      VALUES (${id}, ${registrationId}, ${reviewerId}, ${role}, 'PENDING')
    `;

    await createNotification({
      userId: reviewerId,
      message: `You have been assigned as ${role} for a thesis`,
      link: `/assignments/${id}`,
    });

    await createAuditLog({
      actorId: auth.userID,
      action: "ASSIGNMENT_CREATED",
      targetId: id,
      details: { registrationId, reviewerId, role },
    });

    return {
      id,
      registrationId,
      reviewerId,
      role,
      status: "PENDING",
    };
  }
);
