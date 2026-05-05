import { db, eq } from "@mulai-plus/db";
import * as schema from "@mulai-plus/db/schema/auth";
import { createAccessControl } from "better-auth/plugins/access";

/**
 * Define your permission statements here.
 * Since we are using dynamic permissions from the database,
 * this acts as a type definition and default structure.
 *
 * Resource: [Actions]
 */
const statement = {
  // Core Resources
  admin: ["access"],
  user: ["create", "read", "update", "delete", "ban", "impersonate"],
  role: ["create", "read", "update", "delete", "assign"],
  permission: ["create", "read", "update", "delete"],

  // Application Resources
  project: ["create", "read", "update", "delete", "share"],
  task: ["create", "read", "update", "delete", "assign"],
  comment: ["create", "read", "update", "delete"],

  // Program Management
  program: ["create", "read", "update", "delete"],
  batch: ["create", "read", "update", "delete"],
  application: ["read", "approve", "reject"],
  participant: ["read", "update"],
  attendance: ["read", "update"],
  session: ["create", "read", "update", "delete"],
  attachment: ["create", "read", "update", "delete"],
  testimonial: ["create", "read", "update", "delete"],
  analytics: ["read"],

  // Dashboard Access
  dashboard: ["access"],
  student_dashboard: ["access"],
  mentor_dashboard: ["access"],
  admin_dashboard: ["access"],
  program_manager_dashboard: ["access"],

  // Dynamic catch-all for custom resources created at runtime
  // This allows the AC to be flexible with DB-defined permissions
  "*": ["*"],
} as const;

export const ac = createAccessControl(statement);

/**
 * Fetch roles from the database and convert them to Better Auth Role objects.
 * This ensures the application permissions match the database state.
 */
export const getRoles = async () => {
  try {
    const roles = await db.select().from(schema.role);
    const roleMap: Record<string, unknown> = {};

    for (const r of roles) {
      const permissions: Record<string, string[]> = {};

      for (const p of r.permissions || []) {
        let resource: string | undefined = "";
        let action: string | undefined = "";

        // Handle different separators based on convention
        if (p.includes(":")) {
          // Convention: action:resource (e.g. access:student_dashboard)
          const parts = p.split(":");
          action = parts[0];
          resource = parts[1];
        } else if (p.includes(".")) {
          // Convention: resource.action (e.g. user.create)
          const parts = p.split(".");
          resource = parts[0];
          action = parts[1];
        }

        if (resource && action) {
          if (!permissions[resource]) {
            permissions[resource] = [];
          }
          // Avoid duplicates
          if (permissions[resource] && !permissions[resource]?.includes(action)) {
            permissions[resource]?.push(action);
          }
        }
      }

      roleMap[r.id] = ac.newRole(permissions as any);
    }

    return roleMap as any;
  } catch (error) {
    console.error("Failed to load roles from DB:", error);
    // Fallback to default admin role if DB fails to prevent startup crash
    return {
      admin: ac.newRole({
        admin: ["access"],
        dashboard: ["access"],
        admin_dashboard: ["access"],
        "*": ["*"],
      }),
    };
  }
};

/**
 * Fetch all user IDs that have the 'admin' role.
 */
export const getAdminUserIds = async () => {
  try {
    const admins = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.role, "admin"));
    return admins.map((a) => a.id);
  } catch (error) {
    console.error("Failed to load admin IDs from DB:", error);
    return [];
  }
};

// Deprecated: These static exports are replaced by getRoles()
// Keeping them temporarily to avoid breaking imports during migration if referenced elsewhere
// but they should not be used for the active admin plugin configuration.
export const admin = ac.newRole({
  admin: ["access"],
  "*": ["*"],
});
export const student = ac.newRole({});
export const mentor = ac.newRole({});
export const program_manager = ac.newRole({});
