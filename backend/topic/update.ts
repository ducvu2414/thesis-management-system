import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { nanoid } from "nanoid";
import { createAuditLog } from "../audit/create";
import { createNotification } from "../notification/create";

interface UpdateTopicRequest {
  id: string;
  title?: string;
  description?: string;
  goals?: string;
  requirements?: string;
  maxStudents?: number;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  goals: string;
  requirements: string;
  maxStudents: number;
  currentStudents: number;
  supervisorId: string;
  status: string;
}

// Updates a topic and creates a version history if the topic was approved.
export const update = api<UpdateTopicRequest, Topic>(
  { auth: true, expose: true, method: "PATCH", path: "/topics/:id" },
  async (req) => {
    const auth = getAuthData()!;
    const existing = await db.queryRow<any>`
      SELECT * FROM topics WHERE id = ${req.id}
    `;

    if (!existing) {
      throw APIError.notFound("topic not found");
    }

    if (existing.supervisor_id !== auth.userID) {
      throw APIError.permissionDenied("only the supervisor can update this topic");
    }

    if (existing.status === 'APPROVED') {
      const versionId = nanoid();
      await db.exec`
        INSERT INTO topic_versions (
          id, topic_id, title, description, goals, requirements, max_students
        )
        VALUES (
          ${versionId}, ${req.id}, ${existing.title}, ${existing.description},
          ${existing.goals}, ${existing.requirements}, ${existing.max_students}
        )
      `;
    }

    const title = req.title || existing.title;
    const description = req.description || existing.description;
    const goals = req.goals || existing.goals;
    const requirements = req.requirements || existing.requirements;
    const maxStudents = req.maxStudents || existing.max_students;
    const newStatus = existing.status === 'APPROVED' ? 'PENDING' : existing.status;

    await db.exec`
      UPDATE topics 
      SET title = ${title}, description = ${description}, goals = ${goals},
          requirements = ${requirements}, max_students = ${maxStudents},
          status = ${newStatus}, updated_at = NOW()
      WHERE id = ${req.id}
    `;

    if (newStatus === 'PENDING') {
      const hods = await db.queryAll<any>`
        SELECT id FROM users WHERE role = 'head_of_department' AND active = true
      `;
      
      for (const hod of hods) {
        await createNotification({
          userId: hod.id,
          message: `Topic "${title}" has been updated and requires re-approval`,
          link: `/topics/${req.id}`,
        });
      }
    }

    await createAuditLog({
      actorId: auth.userID,
      action: "TOPIC_UPDATED",
      targetId: req.id,
      details: { title, previousStatus: existing.status, newStatus },
    });

    return {
      id: req.id,
      title,
      description,
      goals,
      requirements,
      maxStudents,
      currentStudents: existing.current_students,
      supervisorId: existing.supervisor_id,
      status: newStatus,
    };
  }
);
