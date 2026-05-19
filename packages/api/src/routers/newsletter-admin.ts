import { z } from "zod";
import { adminProcedure } from "../index";
import { mail } from "../lib/mail";
import { newsletter } from "../lib/newsletter";

// ─── Newsletter Admin Router ───────────────────────────────────────────────

/**
 * Admin endpoints for managing newsletter broadcasts, segments, and contacts.
 *
 * Routes:
 *   newsletter.stats         — Get overview stats
 *   newsletter.segment.*     — Manage Resend segments
 *   newsletter.contacts.*    — Sync/Manage Resend contacts
 *   newsletter.broadcasts.*  — CRUD broadcasts
 *   newsletter.sendNow       — Quick send (create + send in one step)
 *   newsletter.schedule       — Schedule a broadcast
 *   newsletter.sendTest       — Send test email to single recipient
 */

export const newsletterAdminRouter = {
  // ── Stats ────────────────────────────────────────────────────────────────

  stats: adminProcedure.handler(async () => {
    return await newsletter.getStats();
  }),

  // ── Segment Management ──────────────────────────────────────────────────

  segment: {
    /** Get or create the default newsletter segment */
    ensure: adminProcedure.handler(async () => {
      return await newsletter.getOrCreateSegment();
    }),

    /** List all Resend segments */
    list: adminProcedure.handler(async () => {
      return await newsletter.listSegments();
    }),

    /** Delete a segment by ID */
    delete: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      return await newsletter.deleteSegment(input.id);
    }),
  },

  // ── Contact Management ──────────────────────────────────────────────────

  contacts: {
    /** Sync local subscribers to Resend */
    sync: adminProcedure.handler(async () => {
      const seg = await newsletter.getOrCreateSegment();
      if (!seg.success || !seg.segmentId) {
        throw new Error(seg.error ?? "No segment available. Create one first.");
      }
      return await newsletter.syncContacts(seg.segmentId);
    }),

    /** Manually add a contact */
    add: adminProcedure
      .input(
        z.object({
          email: z.string().email(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const seg = await newsletter.getOrCreateSegment();
        if (!seg.success || !seg.segmentId) {
          throw new Error(seg.error ?? "No segment available.");
        }
        return await newsletter.addContact(input.email, seg.segmentId);
      }),

    /** Unsubscribe a contact from Resend */
    unsubscribe: adminProcedure.input(z.object({ email: z.string().email() })).handler(async ({ input }) => {
      return await newsletter.unsubscribeContact(input.email);
    }),
  },

  // ── Broadcast Management ─────────────────────────────────────────────────

  broadcasts: {
    /** List all broadcasts (paginated) */
    list: adminProcedure
      .input(
        z
          .object({
            limit: z.number().default(50),
            offset: z.number().default(0),
          })
          .optional(),
      )
      .handler(async ({ input }) => {
        return await newsletter.listBroadcasts(input?.limit, input?.offset);
      }),

    /** Get single broadcast with live Resend status */
    get: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const record = await newsletter.getBroadcast(input.id);
      if (!record) throw new Error("Broadcast not found");
      return record;
    }),

    /** Create a draft broadcast */
    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          subject: z.string().min(1),
          html: z.string().min(1),
          text: z.string().optional(),
          articleId: z.string().optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        const result = await newsletter.createBroadcast({
          name: input.name,
          subject: input.subject,
          html: input.html,
          text: input.text,
          sendNow: false,
          articleId: input.articleId,
          createdBy: context.session?.user?.id,
        });

        if (!result.success) {
          throw new Error(result.error ?? "Failed to create broadcast");
        }

        return result;
      }),

    /** Send an existing draft broadcast */
    send: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const result = await newsletter.sendBroadcast(input.id);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to send broadcast");
      }
      return result;
    }),

    /** Delete a broadcast */
    delete: adminProcedure
      .input(
        z.object({
          id: z.string(),
          deleteInResend: z.boolean().default(true),
        }),
      )
      .handler(async ({ input }) => {
        return await newsletter.deleteBroadcast(input.id, input.deleteInResend);
      }),
  },

  // ── Quick Actions ────────────────────────────────────────────────────────

  /** Create + send a broadcast in one step */
  sendNow: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        subject: z.string().min(1),
        html: z.string().min(1),
        text: z.string().optional(),
        articleId: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const result = await newsletter.sendBroadcastNow({
        name: input.name,
        subject: input.subject,
        html: input.html,
        text: input.text,
        articleId: input.articleId,
        createdBy: context.session?.user?.id,
      });

      if (!result.success) {
        throw new Error(result.error ?? "Failed to send broadcast");
      }

      return result;
    }),

  /** Schedule a broadcast for later */
  schedule: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        subject: z.string().min(1),
        html: z.string().min(1),
        text: z.string().optional(),
        scheduledAt: z.string().min(1), // natural language ("in 1 hour") or ISO 8601
        articleId: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const result = await newsletter.scheduleBroadcast({
        name: input.name,
        subject: input.subject,
        html: input.html,
        text: input.text,
        scheduledAt: input.scheduledAt,
        articleId: input.articleId,
        createdBy: context.session?.user?.id,
      });

      if (!result.success) {
        throw new Error(result.error ?? "Failed to schedule broadcast");
      }

      return result;
    }),

  /** Send a test email to a single recipient (uses mail.send, not broadcast) */
  sendTest: adminProcedure
    .input(
      z.object({
        to: z.string().email(),
        subject: z.string().min(1),
        html: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const result = await mail.send({
        to: input.to,
        subject: input.subject,
        html: input.html,
      });

      if (!result.success) {
        throw new Error(typeof result.error === "string" ? result.error : "Failed to send test email");
      }

      return { success: true, emailId: result.id };
    }),
};
