import { createAccessControl } from "better-auth/plugins/access";

/**
 * Client-side permission definitions.
 * This should match the server-side structure to ensure type consistency
 * for client-side checks, although the actual enforcement happens via API.
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

  // Dashboard Access
  dashboard: ["access"],
  student_dashboard: ["access"],
  mentor_dashboard: ["access"],
  admin_dashboard: ["access"],

  // Catch-all
  "*": ["*"],
} as const;

export const ac = createAccessControl(statement);

export const admin = ac.newRole({
  admin: ["access"],
  user: ["create", "read", "update", "delete", "ban", "impersonate"],
  role: ["create", "read", "update", "delete", "assign"],
  permission: ["create", "read", "update", "delete"],
  project: ["create", "read", "update", "delete", "share"],
  admin_dashboard: ["access"],
  "*": ["*"],
});

export const student = ac.newRole({
  project: ["read"],
  student_dashboard: ["access"],
});

export const mentor = ac.newRole({
  project: ["read", "update", "share"],
  mentor_dashboard: ["access"],
});
