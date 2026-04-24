import { db } from ".";
import { permission, role } from "./schema/auth";

const main = async () => {
  console.log("Seeding roles and permissions...");

  // Insert permissions
  await db
    .insert(permission)
    .values([
      // User management
      { id: "user.create", description: "Create users" },
      { id: "user.read", description: "Read users" },
      { id: "user.update", description: "Update users" },
      { id: "user.delete", description: "Delete users" },
      { id: "user.ban", description: "Ban users" },
      // Role management
      { id: "role.create", description: "Create roles" },
      { id: "role.read", description: "Read roles" },
      { id: "role.update", description: "Update roles" },
      { id: "role.delete", description: "Delete roles" },
      // Session management
      { id: "session.revoke", description: "Revoke sessions" },
      // Program management
      { id: "program.create", description: "Create programs" },
      { id: "program.read", description: "Read programs" },
      { id: "program.update", description: "Update programs" },
      { id: "program.delete", description: "Delete programs" },
      // Batch management
      { id: "batch.create", description: "Create batches" },
      { id: "batch.read", description: "Read batches" },
      { id: "batch.update", description: "Update batches" },
      { id: "batch.delete", description: "Delete batches" },
      // Application management
      { id: "application.read", description: "Read applications" },
      { id: "application.approve", description: "Approve applications" },
      { id: "application.reject", description: "Reject applications" },
      // Participant management
      { id: "participant.read", description: "Read participants" },
      { id: "participant.update", description: "Update participants" },
      // Attendance management
      { id: "attendance.read", description: "Read attendance" },
      { id: "attendance.update", description: "Update attendance" },
      // Session management
      { id: "session.create", description: "Create sessions" },
      { id: "session.read", description: "Read sessions" },
      { id: "session.update", description: "Update sessions" },
      { id: "session.delete", description: "Delete sessions" },
      // Attachment management
      { id: "attachment.create", description: "Create attachments" },
      { id: "attachment.read", description: "Read attachments" },
      { id: "attachment.update", description: "Update attachments" },
      { id: "attachment.delete", description: "Delete attachments" },
      // Testimonial management
      { id: "testimonial.create", description: "Create testimonials" },
      { id: "testimonial.read", description: "Read testimonials" },
      { id: "testimonial.update", description: "Update testimonials" },
      { id: "testimonial.delete", description: "Delete testimonials" },
      // Analytics
      { id: "analytics.read", description: "Read analytics" },
    ])
    .onConflictDoNothing();

  // Insert roles
  const allPermissions = [
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
    "program.create",
    "program.read",
    "program.update",
    "program.delete",
    "batch.create",
    "batch.read",
    "batch.update",
    "batch.delete",
    "application.read",
    "application.approve",
    "application.reject",
    "participant.read",
    "participant.update",
    "attendance.read",
    "attendance.update",
    "session.create",
    "session.read",
    "session.update",
    "session.delete",
    "attachment.create",
    "attachment.read",
    "attachment.update",
    "attachment.delete",
    "testimonial.create",
    "testimonial.read",
    "testimonial.update",
    "testimonial.delete",
    "analytics.read",
  ];

  await db
    .insert(role)
    .values([
      {
        id: "admin",
        name: "Admin",
        description: "Full access",
        permissions: allPermissions,
      },
      {
        id: "program_manager",
        name: "Program Manager",
        description: "Manages programs, batches, applications, and participants",
        permissions: [
          "program.create",
          "program.read",
          "program.update",
          "program.delete",
          "batch.create",
          "batch.read",
          "batch.update",
          "batch.delete",
          "application.read",
          "application.approve",
          "application.reject",
          "participant.read",
          "participant.update",
          "attendance.read",
          "attendance.update",
          "session.create",
          "session.read",
          "session.update",
          "session.delete",
          "attachment.create",
          "attachment.read",
          "attachment.update",
          "attachment.delete",
          "testimonial.create",
          "testimonial.read",
          "testimonial.update",
          "testimonial.delete",
          "analytics.read",
          "user.read",
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
