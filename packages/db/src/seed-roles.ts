import { db, eq } from "@mulai-plus/db";
import { permission, role } from "@mulai-plus/db/schema/auth";

async function seed() {
  // 1. Seed Permissions
  const permissionsList = [
    { id: "access:student_dashboard", description: "Access student dashboard" },
    { id: "access:mentor_dashboard", description: "Access mentor dashboard" },
    { id: "access:admin_dashboard", description: "Access admin dashboard" },
  ];

  for (const p of permissionsList) {
    const existing = await db.query.permission.findFirst({
      where: eq(permission.id, p.id),
    });
    if (!existing) {
      console.log(`Creating permission ${p.id}...`);
      await db.insert(permission).values(p);
    }
  }

  // 2. Seed Roles
  const roles = [
    {
      id: "admin",
      name: "Admin",
      description: "Administrator with full access",
      permissions: ["*"],
    },
    {
      id: "student",
      name: "Student",
      description: "Standard user",
      permissions: ["access:student_dashboard"],
    },
    {
      id: "mentor",
      name: "Mentor",
      description: "Mentor user",
      permissions: ["access:mentor_dashboard"],
    },
  ];

  for (const r of roles) {
    const existing = await db.query.role.findFirst({
      where: eq(role.id, r.id),
    });

    if (!existing) {
      console.log(`Creating role ${r.name}...`);
      await db.insert(role).values(r);
    } else {
      console.log(`Updating role ${r.name} permissions...`);
      await db.update(role).set({ permissions: r.permissions }).where(eq(role.id, r.id));
    }
  }

  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
