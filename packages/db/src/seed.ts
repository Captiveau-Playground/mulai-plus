import { db } from ".";
import { permission, role } from "./schema/auth";

const main = async () => {
  console.log("Seeding roles and permissions...");

  // Insert permissions
  await db
    .insert(permission)
    .values([
      { id: "user.create", description: "Create users" },
      { id: "user.read", description: "Read users" },
      { id: "user.update", description: "Update users" },
      { id: "user.delete", description: "Delete users" },
      { id: "user.ban", description: "Ban users" },
      { id: "role.create", description: "Create roles" },
      { id: "role.read", description: "Read roles" },
      { id: "role.update", description: "Update roles" },
      { id: "role.delete", description: "Delete roles" },
      { id: "session.revoke", description: "Revoke sessions" },
    ])
    .onConflictDoNothing();

  // Insert roles
  await db
    .insert(role)
    .values([
      {
        id: "admin",
        name: "Admin",
        description: "Full access",
        permissions: [
          "user.create",
          "user.read",
          "user.update",
          "user.delete",
          "user.ban",
          "role.create",
          "role.read",
          "role.update",
          "role.delete",
          "session.revoke",
        ],
      },
      {
        id: "student",
        name: "Student",
        description: "Standard user",
        permissions: ["user.read"],
      },
      {
        id: "mentor",
        name: "Mentor",
        description: "Can manage students",
        permissions: ["user.read", "user.update"],
      },
    ])
    .onConflictDoNothing();

  console.log("Seeding complete.");
  process.exit(0);
};

main();
