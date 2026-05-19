import { randomUUID } from "node:crypto";
import { count, db, eq, schema } from "@mulai-plus/db";
import { user } from "@mulai-plus/db/schema/auth";
import { newsletterSubscriber } from "@mulai-plus/db/schema/cms";
import { env } from "@mulai-plus/env/server";
import { resend } from "./resend";

/**
 * Newsletter Manager — High-level provider for newsletter broadcasts.
 *
 * Environment separation:
 *   - Production: segment name is clean ("Newsletter Subscribers")
 *   - Dev/Staging: segment name gets env suffix ("Newsletter Subscribers (dev)")
 *   - This prevents mixing dev test contacts with production subscribers
 *   - Combined with separate RESEND_API_KEY per env for full isolation
 */

/**
 * Detect environment from BETTER_AUTH_URL (more reliable than NODE_ENV).
 * - localhost → dev
 * - staging in URL → staging
 * - otherwise → production
 */
function detectEnv(): "production" | "staging" | "development" {
  const url = env.BETTER_AUTH_URL;
  if (url.includes("localhost") || url.includes("127.0.0.1")) return "development";
  if (url.includes("staging")) return "staging";
  return "production";
}

/** Get environment-aware segment name. Dev & staging share `(dev)` suffix, production is clean. */
function getSegmentName(): string {
  const base = "Newsletter Subscribers";
  const env = detectEnv();
  if (env === "production") return base;
  return `${base} Dev`;
}

function formatError(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** Resend requires "Name <email>" format for the from field */
function formatFrom(): string {
  const raw = env.RESEND_FROM_EMAIL || "noreply@captiveau.fun";
  if (raw.includes("<")) return raw;
  return `MULAI+ <${raw}>`;
}

export interface BroadcastOptions {
  name: string;
  subject: string;
  html: string;
  text?: string;
  sendNow?: boolean;
  scheduledAt?: string;
  articleId?: string;
  createdBy?: string;
}

class NewsletterManager {
  // ── Segment ──────────────────────────────────────────────────────────

  async getOrCreateSegment(): Promise<{ success: boolean; segmentId?: string; error?: string }> {
    const targetName = getSegmentName();

    // 1. Check local cache — MUST match THIS environment's segment name
    const existing = await db.query.newsletterSegment.findFirst({
      where: eq(schema.newsletterSegment.name, targetName),
    });
    if (existing) {
      const check = await resend.segments.get(existing.id);
      if (check.success && check.data?.name === targetName) {
        return { success: true, segmentId: existing.id };
      }
      await db.delete(schema.newsletterSegment).where(eq(schema.newsletterSegment.id, existing.id));
    }

    // 2. Search Resend by this environment's segment name
    const list = await resend.segments.list();
    if (list.success && list.data) {
      const found = list.data.find((s) => s.name === targetName);
      if (found) {
        await db.insert(schema.newsletterSegment).values({ id: found.id, name: found.name }).onConflictDoNothing();
        return { success: true, segmentId: found.id };
      }
    }

    // 3. Create new segment for this environment
    const created = await resend.segments.create({ name: targetName });
    if (!created.success || !created.data) {
      return { success: false, error: formatError(created.error ?? "Failed to create segment") };
    }

    await db
      .insert(schema.newsletterSegment)
      .values({ id: created.data.id, name: created.data.name })
      .onConflictDoNothing();

    return { success: true, segmentId: created.data.id };
  }

  async listSegments(): Promise<{ id: string; name: string; created_at: string }[]> {
    const result = await resend.segments.list();
    return result.data ?? [];
  }

  async deleteSegment(id: string): Promise<{ success: boolean; error?: string }> {
    const result = await resend.segments.delete(id);
    if (result.success) {
      await db.delete(schema.newsletterSegment).where(eq(schema.newsletterSegment.id, id));
    }
    return { success: result.success, error: result.error ? formatError(result.error) : undefined };
  }

  // ── Contacts Sync ────────────────────────────────────────────────────

  async syncContacts(segmentId: string) {
    const errors: string[] = [];
    let synced = 0;
    let skipped = 0;
    let failed = 0;

    const subscribers = await db.select().from(newsletterSubscriber).where(eq(newsletterSubscriber.status, "active"));

    if (subscribers.length === 0) {
      return { success: true, synced: 0, skipped: 0, failed: 0, errors: [] };
    }

    console.log(`Syncing ${subscribers.length} subscribers to Resend...`);

    const existingContacts = await resend.contacts.list(segmentId);
    const existingEmails = new Set(existingContacts.data?.map((c) => c.email.toLowerCase()) ?? []);

    for (let i = 0; i < subscribers.length; i++) {
      const sub = subscribers[i]!;
      if (existingEmails.has(sub.email.toLowerCase())) {
        skipped++;
        continue;
      }
      const result = await resend.contacts.create({
        email: sub.email,
        audienceId: segmentId,
        unsubscribed: sub.status !== "active",
      });
      if (result.success) {
        synced++;
      } else {
        failed++;
        errors.push(`${sub.email}: ${formatError(result.error)}`);
      }
      if (subscribers.length > 10 && (i + 1) % 10 === 0) {
        console.log(`Sync progress: ${i + 1}/${subscribers.length}`);
      }
    }
    console.log(`Sync complete: ${synced} synced, ${skipped} skipped, ${failed} failed`);
    return { success: failed === 0, synced, skipped, failed, errors };
  }

  /**
   * Sync ALL registered users to Resend contacts (not just newsletter subs).
   * Use when you want to broadcast to every user.
   */
  async syncAllUsers(segmentId: string) {
    const errors: string[] = [];
    let synced = 0;
    let skipped = 0;
    let failed = 0;

    const users = await db.select({ email: user.email, name: user.name }).from(user);

    if (users.length === 0) {
      return { success: true, synced: 0, skipped: 0, failed: 0, errors: [] };
    }

    console.log(`Syncing ${users.length} users to Resend...`);

    const existingContacts = await resend.contacts.list(segmentId);
    const existingEmails = new Set(existingContacts.data?.map((c) => c.email.toLowerCase()) ?? []);

    for (let i = 0; i < users.length; i++) {
      const u = users[i]!;
      if (existingEmails.has(u.email.toLowerCase())) {
        skipped++;
        continue;
      }
      const nameParts = (u.name ?? "").split(" ");
      const result = await resend.contacts.create({
        email: u.email,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(" ") || undefined,
        audienceId: segmentId,
      });
      if (result.success) {
        synced++;
      } else {
        failed++;
        errors.push(`${u.email}: ${formatError(result.error)}`);
      }
      if (users.length > 10 && (i + 1) % 10 === 0) {
        console.log(`User sync progress: ${i + 1}/${users.length}`);
      }
    }
    console.log(`User sync complete: ${synced} synced, ${skipped} skipped, ${failed} failed`);
    return { success: failed === 0, synced, skipped, failed, errors };
  }

  async addContact(email: string, segmentId: string): Promise<{ success: boolean; error?: string }> {
    const result = await resend.contacts.create({ email, audienceId: segmentId });
    return { success: result.success, error: result.error ? formatError(result.error) : undefined };
  }

  async unsubscribeContact(email: string): Promise<{ success: boolean; error?: string }> {
    const result = await resend.contacts.update({ email, unsubscribed: true });
    return { success: result.success, error: result.error ? formatError(result.error) : undefined };
  }

  // ── Broadcasts ───────────────────────────────────────────────────────

  async createBroadcast(options: BroadcastOptions) {
    const seg = await this.getOrCreateSegment();
    if (!seg.success || !seg.segmentId) {
      return { success: false, error: seg.error ?? "No segment available. Run 'Ensure Segment' first." };
    }

    const result = await resend.broadcasts.create({
      name: options.name,
      segmentId: seg.segmentId,
      from: formatFrom(),
      subject: options.subject,
      html: options.html,
      text: options.text,
      send: options.sendNow ?? false,
      scheduledAt: options.scheduledAt,
    });

    if (!result.success || !result.data) {
      return { success: false, error: formatError(result.error ?? "Failed to create broadcast") };
    }

    const localId = randomUUID();
    await db.insert(schema.newsletterBroadcast).values({
      id: localId,
      resendBroadcastId: result.data.id,
      resendSegmentId: seg.segmentId,
      name: options.name,
      subject: options.subject,
      status: options.sendNow ? "sent" : "draft",
      scheduledAt: options.scheduledAt ? new Date(options.scheduledAt) : undefined,
      sentAt: options.sendNow ? new Date() : undefined,
      articleId: options.articleId,
      createdBy: options.createdBy,
    });

    return { success: true, broadcastId: localId, resendBroadcastId: result.data.id };
  }

  async sendBroadcast(localId: string): Promise<{ success: boolean; error?: string }> {
    const record = await db.query.newsletterBroadcast.findFirst({
      where: eq(schema.newsletterBroadcast.id, localId),
    });
    if (!record?.resendBroadcastId) {
      return { success: false, error: "Broadcast not found or no Resend ID" };
    }
    const result = await resend.broadcasts.send(record.resendBroadcastId);
    if (!result.success) return { success: false, error: formatError(result.error) };
    await db
      .update(schema.newsletterBroadcast)
      .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.newsletterBroadcast.id, localId));
    return { success: true };
  }

  async sendBroadcastNow(options: BroadcastOptions) {
    return this.createBroadcast({ ...options, sendNow: true });
  }

  async scheduleBroadcast(options: BroadcastOptions & { scheduledAt: string }) {
    return this.createBroadcast({ ...options, sendNow: true, scheduledAt: options.scheduledAt });
  }

  async listBroadcasts(limit = 50, offset = 0) {
    const items = await db
      .select()
      .from(schema.newsletterBroadcast)
      .orderBy(schema.newsletterBroadcast.createdAt)
      .limit(limit)
      .offset(offset);
    const [total] = await db.select({ count: count() }).from(schema.newsletterBroadcast);
    return { data: items, pagination: { total: total?.count ?? 0, limit, offset } };
  }

  async getBroadcast(localId: string) {
    const record = await db.query.newsletterBroadcast.findFirst({
      where: eq(schema.newsletterBroadcast.id, localId),
    });
    if (!record) return null;
    let resendStatus: Record<string, unknown> | null = null;
    if (record.resendBroadcastId) {
      const live = await resend.broadcasts.get(record.resendBroadcastId);
      if (live.success && live.data) {
        resendStatus = live.data as unknown as Record<string, unknown>;
        if (live.data.status && live.data.status !== record.status) {
          await db
            .update(schema.newsletterBroadcast)
            .set({ status: live.data.status, updatedAt: new Date() })
            .where(eq(schema.newsletterBroadcast.id, localId));
        }
      }
    }
    return { ...record, resendStatus };
  }

  async deleteBroadcast(localId: string, deleteInResend = true): Promise<{ success: boolean; error?: string }> {
    const record = await db.query.newsletterBroadcast.findFirst({
      where: eq(schema.newsletterBroadcast.id, localId),
    });
    if (!record) return { success: false, error: "Broadcast not found" };
    if (deleteInResend && record.resendBroadcastId) {
      await resend.broadcasts.remove(record.resendBroadcastId);
    }
    await db.delete(schema.newsletterBroadcast).where(eq(schema.newsletterBroadcast.id, localId));
    return { success: true };
  }

  get isReady(): boolean {
    return resend.isConfigured;
  }

  async getStats() {
    const [totalBroadcasts] = await db.select({ count: count() }).from(schema.newsletterBroadcast);
    const [totalSubs] = await db.select({ count: count() }).from(newsletterSubscriber);
    const [activeSubs] = await db
      .select({ count: count() })
      .from(newsletterSubscriber)
      .where(eq(newsletterSubscriber.status, "active"));
    const [totalUsers] = await db.select({ count: count() }).from(user);
    const seg = await db.query.newsletterSegment.findFirst({
      where: eq(schema.newsletterSegment.name, getSegmentName()),
    });

    return {
      resendConfigured: resend.isConfigured,
      segmentId: seg?.id ?? null,
      segmentName: seg?.name ?? null,
      totalSubscribers: totalSubs?.count ?? 0,
      activeSubscribers: activeSubs?.count ?? 0,
      totalBroadcasts: totalBroadcasts?.count ?? 0,
      totalUsers: totalUsers?.count ?? 0,
    };
  }
}

export const newsletter = new NewsletterManager();
