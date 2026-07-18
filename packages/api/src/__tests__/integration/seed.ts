// @ts-nocheck — Drizzle ORM type inference issue only, runtime aman
import { db } from "@mulai-plus/db";
import { auditLog } from "@mulai-plus/db/schema/audit";
import { role, user } from "@mulai-plus/db/schema/auth";
import { cmsArticle, cmsAuthor, cmsCategory } from "@mulai-plus/db/schema/cms";
import { course, enrollment } from "@mulai-plus/db/schema/lms";
import {
  batchReportTemplateItem,
  feedbackCampaign,
  feedbackQuestion,
  feedbackResponse,
  feedbackTemplate,
  mentorMentee,
  program,
  programApplication,
  programBatch,
  programBenefit,
  programFaq,
  programParticipant,
  programSession,
  programSyllabus,
  summaryReport,
  summaryReportItem,
} from "@mulai-plus/db/schema/programs";
import { systemSettings } from "@mulai-plus/db/schema/settings";
import { testimonial } from "@mulai-plus/db/schema/testimonials";

const tables = [
  feedbackResponse,
  feedbackCampaign,
  feedbackQuestion,
  feedbackTemplate,
  summaryReportItem,
  summaryReport,
  programSession,
  programApplication,
  programParticipant,
  mentorMentee,
  batchReportTemplateItem,
  programFaq,
  programBenefit,
  programSyllabus,
  enrollment,
  course,
  cmsArticle,
  cmsCategory,
  cmsAuthor,
  testimonial,
  auditLog,
  programBatch,
  program,
  user,
  role,
  systemSettings,
];

export async function cleanAll() {
  for (const t of tables) {
    try {
      await db.delete(t);
    } catch {}
  }
}

export async function seedAll() {
  await cleanAll();

  // Roles
  for (const r of [
    { id: "student", name: "Student" },
    { id: "mentor", name: "Mentor" },
    { id: "admin", name: "Admin" },
    { id: "program_manager", name: "Program Manager" },
  ]) {
    try {
      await db.insert(role).values(r);
    } catch {}
  }

  // Users
  await db.insert(user).values([
    { id: "student-1", name: "Budi Santoso", email: "budi@test.com", role: "student", emailVerified: true },
    { id: "mentor-1", name: "Dewi Lestari", email: "dewi@test.com", role: "mentor", emailVerified: true },
    { id: "admin-1", name: "Admin Test", email: "admin@test.com", role: "admin", emailVerified: true },
  ]);

  // Program
  await db
    .insert(program)
    .values([{ id: "prog-1", name: "Program Beasiswa Mentoring", slug: "program-beasiswa-mentoring" }]);
  await db.insert(programBatch).values([
    {
      id: "batch-1",
      programId: "prog-1",
      name: "Batch 1 - Jan 2026",
      status: "open",
      quota: 10,
      durationWeeks: 8,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-30"),
      registrationStartDate: new Date("2025-12-01"),
      registrationEndDate: new Date("2026-02-01"),
    },
    {
      id: "batch-closed",
      programId: "prog-1",
      name: "Batch Lama",
      status: "closed",
      quota: 10,
      durationWeeks: 8,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-03-30"),
      registrationStartDate: new Date("2024-12-01"),
      registrationEndDate: new Date("2025-01-01"),
    },
  ]);
  await db
    .insert(programFaq)
    .values([
      { id: "faq-1", programId: "prog-1", question: "Apa itu MULAI+?", answer: "Platform bimbingan PTN", order: 1 },
    ]);
  await db
    .insert(programBenefit)
    .values([{ id: "ben-1", programId: "prog-1", title: "Mentor Berpengalaman", order: 1 }]);
  await db.insert(programSyllabus).values([{ id: "syl-1", programId: "prog-1", week: 1, title: "Pengenalan Diri" }]);

  // Mentor-Mentee
  await db
    .insert(mentorMentee)
    .values([{ id: "mm-1", batchId: "batch-1", mentorId: "mentor-1", studentId: "student-1", assignedAt: new Date() }]);

  // Application
  await db
    .insert(programApplication)
    .values([{ id: "app-1", programId: "prog-1", batchId: "batch-1", userId: "student-1", status: "accepted" }]);

  // Participant
  await db
    .insert(programParticipant)
    .values([{ id: "part-1", programId: "prog-1", batchId: "batch-1", userId: "student-1", status: "active" }]);

  // Session
  await db.insert(programSession).values([
    {
      id: "sess-1",
      batchId: "batch-1",
      mentorId: "mentor-1",
      studentId: "student-1",
      week: 1,
      type: "one_on_one",
      status: "completed",
      startsAt: new Date("2026-01-15"),
      durationMinutes: 60,
    },
    {
      id: "sess-2",
      batchId: "batch-1",
      mentorId: "mentor-1",
      studentId: "student-1",
      week: 2,
      type: "one_on_one",
      status: "scheduled",
      startsAt: new Date("2026-01-22"),
      durationMinutes: 60,
    },
  ]);

  // Summary Report
  await db.insert(summaryReport).values([
    { id: "report-1", batchId: "batch-1", mentorId: "mentor-1", studentId: "student-1", status: "approved" },
    { id: "report-2", batchId: "batch-1", mentorId: "mentor-1", studentId: "student-1", status: "draft" },
  ]);
  await db.insert(summaryReportItem).values([
    {
      id: "item-1",
      reportId: "report-1",
      title: "Kemampuan Analisis",
      description: "Mentee mampu menganalisis minat",
      order: 1,
    },
  ]);
  await db.insert(batchReportTemplateItem).values([
    { id: "tmpl-1", batchId: "batch-1", title: "Kemampuan Analisis", order: 1 },
    { id: "tmpl-2", batchId: "batch-1", title: "Pemahaman Jurusan", order: 2 },
  ]);

  // CMS
  await db.insert(cmsAuthor).values([{ id: "author-1", name: "Redaksi MULAI+", slug: "redaksi-mulai" }]);
  await db.insert(cmsCategory).values([{ id: "cat-1", name: "Tips Kuliah", slug: "tips-kuliah" }]);
  await db.insert(cmsArticle).values([
    {
      id: "article-1",
      title: "Cara Memilih Jurusan",
      slug: "cara-memilih-jurusan",
      type: "article",
      status: "published",
      authorId: "author-1",
      categoryId: "cat-1",
    },
    {
      id: "article-2",
      title: "Draft Article",
      slug: "draft-article",
      type: "article",
      status: "draft",
      authorId: "author-1",
      categoryId: "cat-1",
    },
  ]);

  // Feedback
  await db
    .insert(feedbackTemplate)
    .values([{ id: "ft-1", name: "Feedback Mentee", type: "mentee_to_mentor", isActive: true }]);
  await db
    .insert(feedbackQuestion)
    .values([{ id: "fq-1", templateId: "ft-1", question: "Seberapa puas?", questionType: "likert", order: 1 }]);
  await db.insert(feedbackCampaign).values([
    {
      id: "fc-1",
      templateId: "ft-1",
      batchId: "batch-1",
      startDate: new Date("2020-01-01"),
      endDate: new Date("2030-12-31"),
      campaignType: "completion",
      status: "open",
      createdBy: "admin-1",
    },
  ]);

  // LMS
  await db.insert(course).values([
    {
      id: "course-1",
      title: "Persiapan SNBT",
      slug: "persiapan-snbt",
      description: "Course persiapan SNBT",
      price: 100000,
      published: true,
    },
  ]);

  // Testimonials
  await db
    .insert(testimonial)
    .values([{ id: "tst-1", userId: "student-1", content: "MULAI+ membantu saya!", rating: "5" }]);

  // Settings
  await db.insert(systemSettings).values([{ key: "site_name", value: "MULAI+", type: "string" }]);
}
