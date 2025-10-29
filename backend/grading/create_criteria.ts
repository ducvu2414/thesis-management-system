import { api } from "encore.dev/api";
import db from "../db";
import { nanoid } from "nanoid";
import { createAuditLog } from "../audit/create";

interface CreateCriteriaRequest {
  name: string;
  weight: number;
  applicableTo: string[];
  adminId: string;
}

interface Criteria {
  id: string;
  name: string;
  weight: number;
  applicableTo: string[];
}

// Creates a new grading criteria.
export const createCriteria = api<CreateCriteriaRequest, Criteria>(
  { expose: true, method: "POST", path: "/grading/criteria" },
  async ({ name, weight, applicableTo, adminId }) => {
    const id = nanoid();
    
    await db.exec`
      INSERT INTO grading_criteria (id, name, weight, applicable_to)
      VALUES (${id}, ${name}, ${weight}, ${applicableTo})
    `;

    await createAuditLog({
      actorId: adminId,
      action: "CRITERIA_CREATED",
      targetId: id,
      details: { name, weight, applicableTo },
    });

    return { id, name, weight, applicableTo };
  }
);
