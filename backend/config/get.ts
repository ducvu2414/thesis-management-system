import { api, APIError } from "encore.dev/api";
import db from "../db";

interface GetConfigParams {
  key: string;
}

interface GetConfigResponse {
  key: string;
  value: Record<string, any>;
}

// Retrieves a system configuration value by key.
export const get = api<GetConfigParams, GetConfigResponse>(
  { expose: true, method: "GET", path: "/config/:key" },
  async ({ key }) => {
    const row = await db.queryRow<any>`
      SELECT * FROM system_config WHERE key = ${key}
    `;

    if (!row) {
      throw APIError.notFound("configuration not found");
    }

    return {
      key: row.key,
      value: row.value,
    };
  }
);
