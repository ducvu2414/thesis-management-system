import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { nanoid } from "nanoid";
import { createAuditLog } from "../audit/create";

interface CreateTopicRequest {
  title: string;
  description: string;
  goals: string;
  requirements: string;
  maxStudents: number;
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

// Creates a new thesis topic as a draft.
export const create = api<CreateTopicRequest, Topic>(
  { auth: true, expose: true, method: "POST", path: "/topics" },
  async (req) => {
    const auth = getAuthData()!;
    const id = nanoid();
    
    await db.exec`
      INSERT INTO topics (
        id, title, description, goals, requirements, 
        max_students, supervisor_id, status
      )
      VALUES (
        ${id}, ${req.title}, ${req.description}, ${req.goals}, 
        ${req.requirements}, ${req.maxStudents}, ${auth.userID}, 'DRAFT'
      )
    `;

    await createAuditLog({
      actorId: auth.userID,
      action: "TOPIC_CREATED",
      targetId: id,
      details: { title: req.title },
    });

    return {
      id,
      title: req.title,
      description: req.description,
      goals: req.goals,
      requirements: req.requirements,
      maxStudents: req.maxStudents,
      currentStudents: 0,
      supervisorId: auth.userID,
      status: "DRAFT",
    };
  }
);
