import { api, APIError } from "encore.dev/api";
import db from "../db";
import { createAuditLog } from "../audit/create";

interface UpdateConfigRequest {
  key: string;
  value: Record<string, any>;
  adminId: string;
}

interface UpdateConfigResponse {
  key: string;
  value: Record<string, any>;
}

// Updates a system configuration value.
export const update = api<UpdateConfigRequest, UpdateConfigResponse>(
  { expose: true, method: "PATCH", path: "/config/:key" },
  async ({ key, value, adminId }) => {
    const admin = await db.queryRow<any>`
      SELECT role FROM users WHERE id = ${adminId}
    `;

    if (!admin || admin.role !== 'admin') {
      throw APIError.permissionDenied("only admins can update configuration");
    }

    await db.exec`
      INSERT INTO system_config (key, value)
      VALUES (${key}, ${JSON.stringify(value)})
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(value)}, updated_at = NOW()
    `;

    await createAuditLog({
      actorId: adminId,
      action: "CONFIG_UPDATED",
      targetId: key,
      details: { key, value },
    });

    return { key, value };
  }
);
