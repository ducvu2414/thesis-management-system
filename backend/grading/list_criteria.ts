import { api } from "encore.dev/api";
import db from "../db";

interface Criteria {
  id: string;
  name: string;
  weight: number;
  applicableTo: string[];
}

interface ListCriteriaResponse {
  criteria: Criteria[];
}

// Retrieves all active grading criteria.
export const listCriteria = api<void, ListCriteriaResponse>(
  { expose: true, method: "GET", path: "/grading/criteria" },
  async () => {
    const rows = await db.queryAll<any>`
      SELECT * FROM grading_criteria WHERE active = true ORDER BY name
    `;

    const criteria = rows.map(row => ({
      id: row.id,
      name: row.name,
      weight: row.weight,
      applicableTo: row.applicable_to,
    }));

    return { criteria };
  }
);
