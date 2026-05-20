import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// ─── Resend Broadcast Log ──────────────────────────────────────────────────

/**
 * Tracks broadcasts created via the Resend API.
 * Stores local metadata (e.g., CMS article ID, author) alongside Resend IDs.
 */
export const newsletterBroadcast = pgTable("newsletter_broadcast", {
  id: text("id").primaryKey(), // local UUID
  resendBroadcastId: text("resend_broadcast_id"), // Resend broadcast ID (set after creation)
  resendSegmentId: text("resend_segment_id"), // Resend segment ID used
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  /** "draft" | "scheduled" | "sending" | "sent" */
  status: text("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  /** Reference to CMS article if this is a newsletter digest */
  articleId: text("article_id"),
  /** User ID who created the broadcast */
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Resend Segment Registry ───────────────────────────────────────────────

/**
 * Keeps local track of Resend segments for quick lookup.
 * A "segment" groups contacts that will receive broadcasts.
 */
export const newsletterSegment = pgTable("newsletter_segment", {
  id: text("id").primaryKey(), // Resend segment ID
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
