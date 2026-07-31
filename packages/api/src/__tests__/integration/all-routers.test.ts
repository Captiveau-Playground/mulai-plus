// @ts-nocheck — ORPC call() context type terlalu strict untuk test, runtime aman

import { call } from "@orpc/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auditRouter } from "../../routers/audit";
import { articlesRouter } from "../../routers/cms";
import { emailAdminRouter } from "../../routers/email-admin";
import { esignRouter } from "../../routers/esign";
import { feedbackRouter } from "../../routers/feedback";
import { lmsRouter } from "../../routers/lms";
import { newsletterAdminRouter } from "../../routers/newsletter-admin";
import { notificationRouter } from "../../routers/notification";
import { paymentsRouter } from "../../routers/payments";
import { pddiktiRouter } from "../../routers/pddikti";
import { programActivitiesRouter } from "../../routers/program-activities";
import { programsRouter } from "../../routers/programs";
import { settingsRouter } from "../../routers/settings";
import { testimonialsRouter } from "../../routers/testimonials";
import { userRouter } from "../../routers/user";
import { cleanAll, seedAll } from "./seed";

const ctx = (u?: { id: string; name: string; email: string; role: string }) => ({ session: u ? { user: u } : null });
const A = ctx({ id: "admin-1", name: "Admin", email: "a@a.com", role: "admin" });
const S = ctx({ id: "student-1", name: "Budi", email: "b@b.com", role: "student" });
const M = ctx({ id: "mentor-1", name: "Dewi", email: "d@d.com", role: "mentor" });

describe("API Integration", () => {
  beforeAll(async () => {
    await seedAll();
  }, 30000);
  afterAll(async () => {
    await cleanAll();
  }, 30000);

  // ═══════════════════════════════════════════
  //  PROGRAMS
  // ═══════════════════════════════════════════
  describe("Programs", () => {
    it("public.list", async () => {
      const r = await call(programsRouter.public.list, {}, { context: {} });
      expect(r.data.length).toBeGreaterThanOrEqual(1);
    });
    it("public.get by slug", async () => {
      const r = await call(programsRouter.public.get, { slug: "program-beasiswa-mentoring" }, { context: {} });
      expect(r.name).toBe("Program Beasiswa Mentoring");
    });
    it("public.get throws for invalid slug", async () => {
      await expect(call(programsRouter.public.get, { slug: "none" }, { context: {} })).rejects.toThrow(/not found/i);
    });
    it("admin.batches.get", async () => {
      const r = await call(programsRouter.admin.batches.get, { id: "batch-1" }, { context: A });
      expect(r.name).toBe("Batch 1 - Jan 2026");
    });
    it("admin.batches.list", async () => {
      const r = await call(programsRouter.admin.batches.list, { programId: "prog-1" }, { context: A });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
    it("admin.summaryReports list", async () => {
      const r = await call(programsRouter.admin.summaryReports.list, { batchId: "batch-1" }, { context: A });
      expect(r.data.length).toBeGreaterThanOrEqual(1);
    });
    it("mentorSummaryReports.list", async () => {
      const r = await call(programsRouter.mentorSummaryReports.list, { batchId: "batch-1" }, { context: M });
      expect(r.data.length).toBeGreaterThanOrEqual(1);
    });
    it("studentSummaryReports.list", async () => {
      const r = await call(programsRouter.studentSummaryReports.list, {}, { context: S });
      expect(r.data.length).toBeGreaterThanOrEqual(1);
    });
    it("admin.faqs list", async () => {
      const r = await call(programsRouter.admin.faqs.list, { programId: "prog-1" }, { context: A });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
    it("admin.benefits list", async () => {
      const r = await call(programsRouter.admin.benefits.list, { programId: "prog-1" }, { context: A });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
    it("admin.syllabus update", async () => {
      const r = await call(
        programsRouter.admin.syllabus.update,
        { programId: "prog-1", items: [{ week: 1, title: "Pengenalan" }] },
        { context: A },
      );
      expect(r.success).toBe(true);
    });
    it("student.myPrograms", async () => {
      const r = await call(programsRouter.student.myPrograms, {}, { context: S });
      expect(Array.isArray(r)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  //  PROGRAM ACTIVITIES
  // ═══════════════════════════════════════════
  describe("Activities", () => {
    it("session.list", async () => {
      const r = await call(programActivitiesRouter.session.list, { batchId: "batch-1" }, { context: A });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
    it("student.mySessions", async () => {
      const r = await call(programActivitiesRouter.student.mySessions, {}, { context: S });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
    it.skip("mentor.mySessions", async () => {
      const r = await call(programActivitiesRouter.mentor.mySessions, {}, { context: M });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
    it("session.upsert update", async () => {
      const r = await call(
        programActivitiesRouter.session.upsert,
        {
          id: "sess-1",
          batchId: "batch-1",
          mentorId: "mentor-1",
          studentId: "student-1",
          week: 1,
          type: "one_on_one",
          startsAt: new Date().toISOString(),
          durationMinutes: 90,
        },
        { context: A },
      );
      expect(r.id).toBe("sess-1");
    });
  });

  // ═══════════════════════════════════════════
  //  CMS
  // ═══════════════════════════════════════════
  describe("CMS", () => {
    it("articles.public.list", async () => {
      const r = await call(articlesRouter.public.list, {}, { context: {} });
      expect(r.data.length).toBe(1);
    });
    it("articles.admin.list", async () => {
      const r = await call(articlesRouter.admin.list, {}, { context: A });
      expect(r.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ═══════════════════════════════════════════
  //  FEEDBACK
  // ═══════════════════════════════════════════
  describe("Feedback", () => {
    it("template.list", async () => {
      const r = await call(feedbackRouter.template.list, {}, { context: A });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
    it("campaign.list", async () => {
      const r = await call(feedbackRouter.campaign.list, {}, { context: A });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
    it("response.submit", async () => {
      const r = await call(
        feedbackRouter.response.submit,
        { campaignId: "fc-1", answers: [{ questionId: "fq-1", answer: "Puas" }] },
        { context: S },
      );
      expect(r.success).toBe(true);
    });
    it("response.myActive", async () => {
      const r = await call(feedbackRouter.response.myActive, {}, { context: S });
      expect(r).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  //  LMS
  // ═══════════════════════════════════════════
  describe("LMS", () => {
    it("public.courses", async () => {
      const r = await call(lmsRouter.public.courses, {}, { context: {} });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
    it("public.categories", async () => {
      const r = await call(lmsRouter.public.categories, {}, { context: {} });
      expect(Array.isArray(r)).toBe(true);
    });
    it("public.courseBySlug", async () => {
      const r = await call(lmsRouter.public.courseBySlug, { slug: "persiapan-snbt" }, { context: {} });
      expect(r.title).toBe("Persiapan SNBT");
    });
  });

  // ═══════════════════════════════════════════
  //  TESTIMONIALS
  // ═══════════════════════════════════════════
  describe("Testimonials", () => {
    it("listPublic", async () => {
      const r = await call(testimonialsRouter.listPublic, {}, { context: {} });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
    it("list (admin)", async () => {
      const r = await call(testimonialsRouter.list, {}, { context: A });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ═══════════════════════════════════════════
  //  SETTINGS
  // ═══════════════════════════════════════════
  describe("Settings", () => {
    it("get", async () => {
      const r = await call(settingsRouter.get, { key: "site_name" }, { context: A });
      expect(r).toBe("MULAI+");
    });
    it("get returns null for missing", async () => {
      const r = await call(settingsRouter.get, { key: "_missing_" }, { context: A });
      expect(r).toBeNull();
    });
    it("update", async () => {
      const r = await call(settingsRouter.update, { key: "test_key", value: "test_val" }, { context: A });
      expect(r.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  //  USERS
  // ═══════════════════════════════════════════
  describe("Users", () => {
    it("getProfile", async () => {
      const r = await call(userRouter.getProfile, {}, { context: S });
      expect(r.name).toBe("Budi Santoso");
    });
    it("listStudents", async () => {
      const r = await call(userRouter.listStudents, {}, { context: A });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
    it("updateProfile", async () => {
      const r = await call(userRouter.updateProfile, { name: "Budi Updated" }, { context: S });
      expect(r.success).toBe(true);
      // Reset
      await call(userRouter.updateProfile, { name: "Budi" }, { context: S });
    });
    it("myPermissions", async () => {
      const r = await call(userRouter.myPermissions, {}, { context: S });
      expect(r).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  //  NOTIFICATIONS
  // ═══════════════════════════════════════════
  describe("Notifications", () => {
    it("getUnreadCount", async () => {
      const r = await call(notificationRouter.getUnreadCount, {}, { context: S });
      expect(r).toHaveProperty("count");
    });
    it("markAllAsRead", async () => {
      const r = await call(notificationRouter.markAllAsRead, {}, { context: S });
      expect(r.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  //  AUDIT
  // ═══════════════════════════════════════════
  describe("Audit", () => {
    it("getApiStats", async () => {
      const r = await call(auditRouter.getApiStats, {}, { context: A });
      expect(r).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  //  E-SIGN
  // ═══════════════════════════════════════════
  describe("E-Sign", () => {
    it("signDocument", async () => {
      const r = await call(
        esignRouter.signDocument,
        { signerName: "Test", signerRole: "program_manager", documentId: "test-report", documentDate: "05 Juli 2026" },
        { context: {} },
      );
      expect(r.token).toContain(".");
    });
    it("verifySignature rejects tampered", async () => {
      const r = await call(
        esignRouter.verifySignature,
        { token: "fake.0000000000000000000000000000000000000000000000000000000000000000" },
        { context: {} },
      );
      expect(r.valid).toBe(false);
    });
  });

  // ═══════════════════════════════════════════
  //  EMAIL ADMIN
  // ═══════════════════════════════════════════
  describe("Email Admin", () => {
    it("listTemplates", async () => {
      const r = await call(emailAdminRouter.listTemplates, {}, { context: A });
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
    it("renderPreview", async () => {
      const r = await call(
        emailAdminRouter.renderPreview,
        { templateId: "application-accepted", variables: { name: "Test" } },
        { context: A },
      );
      expect(r).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  //  NEWSLETTER ADMIN
  // ═══════════════════════════════════════════
  describe("Newsletter Admin", () => {
    it("listTemplates", async () => {
      const r = await call(newsletterAdminRouter.listTemplates, {}, { context: A });
      expect(r).toBeDefined();
    });
    it("stats", async () => {
      const r = await call(newsletterAdminRouter.stats, {}, { context: A });
      expect(r).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  //  PDDIKTI
  // ═══════════════════════════════════════════
  describe("PDDikti", () => {
    it("publicListUniversities", async () => {
      const r = await call(pddiktiRouter.publicListUniversities, { page: 1, pageSize: 10 }, { context: {} });
      expect(r).toBeDefined();
    });
    it("publicSearchPrograms", async () => {
      const r = await call(pddiktiRouter.publicSearchPrograms, { page: 1, pageSize: 10 }, { context: {} });
      expect(r).toBeDefined();
    });
    it("publicSearchPassingGrade", async () => {
      const r = await call(pddiktiRouter.publicSearchPassingGrade, { page: 1, pageSize: 10 }, { context: {} });
      expect(r).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  //  PAYMENTS
  // ═══════════════════════════════════════════
  describe("Payments", () => {
    it("has create endpoint", () => {
      expect(paymentsRouter.create).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  //  ERROR SCENARIOS (bad paths)
  // ═══════════════════════════════════════════
  describe("Error Scenarios", () => {
    // ── 401 UNAUTHORIZED ──
    describe("401 Unauthorized", () => {
      it("settings.get without auth", async () => {
        await expect(call(settingsRouter.get, { key: "site_name" }, { context: {} })).rejects.toThrow(/unauthorized/i);
      });
      it("user.getProfile without auth", async () => {
        await expect(call(userRouter.getProfile, {}, { context: {} })).rejects.toThrow(/unauthorized/i);
      });
      it("notification.getUnreadCount without auth", async () => {
        await expect(call(notificationRouter.getUnreadCount, {}, { context: {} })).rejects.toThrow(/unauthorized/i);
      });
    });

    // ── 403 FORBIDDEN ──
    describe("403 Forbidden", () => {
      it("student accesses admin.programs", async () => {
        await expect(call(programsRouter.admin.batches.list, { programId: "prog-1" }, { context: S })).rejects.toThrow(
          /not allowed/i,
        );
      });
      it("student accesses feedback admin", async () => {
        await expect(call(feedbackRouter.template.list, {}, { context: S })).rejects.toThrow(/not allowed/i);
      });
      it("student accesses newsletter admin", async () => {
        await expect(call(newsletterAdminRouter.listTemplates, {}, { context: S })).rejects.toThrow(/not allowed/i);
      });
    });

    // ── 404 NOT_FOUND ──
    describe("404 Not Found", () => {
      it("programs.get invalid slug", async () => {
        await expect(
          call(programsRouter.public.get, { slug: "this-slug-definitely-does-not-exist" }, { context: {} }),
        ).rejects.toThrow(/not found/i);
      });
      it("admin.batches.get invalid id", async () => {
        await expect(
          call(programsRouter.admin.batches.get, { id: "nonexistent-batch" }, { context: A }),
        ).rejects.toThrow(/not found/i);
      });
    });

    // ── 400 BAD_REQUEST ──
    describe("400 Bad Request", () => {
      it("apply with closed batch", async () => {
        const input = {
          programId: "prog-1",
          batchId: "batch-closed",
          answers: {
            name: "X",
            class: "X",
            school: "X",
            major: "X",
            province: "X",
            city: "X",
            reason: "X",
            phone: "X",
            email: "x@x.com",
            reflectionIdealSelf: "X",
            reflectionExpectation: "X",
            reflectionFuture: "X",
          },
        };
        await expect(call(programsRouter.apply, input, { context: S })).rejects.toThrow(/closed/i);
      });
      it("apply with invalid program id", async () => {
        const input = {
          programId: "invalid-prog",
          batchId: "batch-1",
          answers: {
            name: "X",
            class: "X",
            school: "X",
            major: "X",
            province: "X",
            city: "X",
            reason: "X",
            phone: "X",
            email: "x@x.com",
            reflectionIdealSelf: "X",
            reflectionExpectation: "X",
            reflectionFuture: "X",
          },
        };
        await expect(call(programsRouter.apply, input, { context: S })).rejects.toThrow(/not found/i);
      });
      it("renderPreview with invalid template", async () => {
        await expect(
          call(emailAdminRouter.renderPreview, { templateId: "nonexistent-template" }, { context: A }),
        ).rejects.toThrow(/not found/i);
      });
    });

    // ── Zod Validation Errors ──
    describe("Validation Errors", () => {
      it("programs.get with empty slug", async () => {
        const p = call(programsRouter.public.get, { slug: "" }, { context: {} });
        await expect(p).rejects.toThrow();
      });
    });
  });
});
