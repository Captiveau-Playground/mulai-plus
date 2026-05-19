import { randomUUID } from "node:crypto";
import { count, db, eq, schema } from "@mulai-plus/db";
import { newsletterSubscriber } from "@mulai-plus/db/schema/cms";
import { env } from "@mulai-plus/env/server";
import { resend } from "./resend";

/**
 * Newsletter Manager — High-level provider for newsletter broadcasts.
 *
 * Responsibilities:
 *  - Segment (audience) lifecycle: create, list, delete
 *  - Contact sync: push local subscribers to Resend, keep in sync
 *  - Broadcast: create, send, schedule newsletters
 *  - Local tracking: persist broadcast logs and segment registry
 */

const NEWSLETTER_SEGMENT_NAME = "Newsletter Subscribers";

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

// ─── Newsletter Manager ────────────────────────────────────────────────────

class NewsletterManager {
  // ── Segment ──────────────────────────────────────────────────────────────

  /**
   * Get or create the default newsletter segment in Resend.
   * Caches the segment ID in local DB for fast lookups.
   */
  async getOrCreateSegment(): Promise<{ success: boolean; segmentId?: string; error?: string }> {
    // Check local cache first
    const existing = await db.query.newsletterSegment.findFirst();
    if (existing) {
      // Verify it still exists in Resend
      const check = await resend.segments.get(existing.id);
      if (check.success) {
        return { success: true, segmentId: existing.id };
      }
      // Segment deleted externally — remove local ref and recreate
      await db.delete(schema.newsletterSegment).where(eq(schema.newsletterSegment.id, existing.id));
    }

    // Look for existing segment in Resend by name
    const list = await resend.segments.list();
    if (list.success && list.data) {
      const found = list.data.find((s) => s.name === NEWSLETTER_SEGMENT_NAME);
      if (found) {
        await db
          .insert(schema.newsletterSegment)
          .values({
            id: found.id,
            name: found.name,
          })
          .onConflictDoNothing();
        return { success: true, segmentId: found.id };
      }
    }

    // Create new segment
    const created = await resend.segments.create({ name: NEWSLETTER_SEGMENT_NAME });
    if (!created.success || !created.data) {
      return { success: false, error: String(created.error ?? "Failed to create segment") };
    }

    await db
      .insert(schema.newsletterSegment)
      .values({
        id: created.data.id,
        name: created.data.name,
      })
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
    return { success: result.success, error: result.error ? String(result.error) : undefined };
  }

  // ── Contacts Sync ────────────────────────────────────────────────────────

  /**
   * Sync local newsletter subscribers to Resend contacts.
   *
   * Uses audienceId temporarily since Resend Contacts API still uses audience IDs
   * for contact-scoping. Once segments are fully supported for contacts, switch.
   */
  async syncContacts(
    segmentId: string,
  ): Promise<{ success: boolean; synced: number; skipped: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;
    let skipped = 0;
    let failed = 0;

    // Get active local subscribers
    const subscribers = await db.select().from(newsletterSubscriber).where(eq(newsletterSubscriber.status, "active"));

    if (subscribers.length === 0) {
      return { success: true, synced: 0, skipped: 0, failed: 0, errors: [] };
    }

    console.log(`Syncing ${subscribers.length} newsletter subscribers to Resend...`);

    // Fetch existing Resend contacts for comparison
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
        errors.push(`${sub.email}: ${String(result.error)}`);
      }

      // Log progress for large syncs
      if (subscribers.length > 10 && (i + 1) % 10 === 0) {
        console.log(`Contact sync progress: ${i + 1}/${subscribers.length}`);
      }
    }

    console.log(`Contact sync complete: ${synced} synced, ${skipped} skipped, ${failed} failed`);
    return { success: failed === 0, synced, skipped, failed, errors };
  }

  /**
   * Add a single subscriber to Resend immediately (called on new signup).
   */
  async addContact(email: string, segmentId: string): Promise<{ success: boolean; error?: string }> {
    const result = await resend.contacts.create({ email, audienceId: segmentId });
    return { success: result.success, error: result.error ? String(result.error) : undefined };
  }

  /**
   * Unsubscribe a contact in Resend.
   */
  async unsubscribeContact(email: string): Promise<{ success: boolean; error?: string }> {
    const result = await resend.contacts.update({ email, unsubscribed: true });
    return { success: result.success, error: result.error ? String(result.error) : undefined };
  }

  // ── Broadcasts ───────────────────────────────────────────────────────────

  /**
   * Create a newsletter broadcast (draft or immediate send).
   */
  async createBroadcast(options: BroadcastOptions): Promise<{
    success: boolean;
    broadcastId?: string;
    resendBroadcastId?: string;
    error?: string;
  }> {
    // Get/create the segment
    const seg = await this.getOrCreateSegment();
    if (!seg.success || !seg.segmentId) {
      return { success: false, error: seg.error ?? "No segment available" };
    }

    // Create broadcast in Resend
    const result = await resend.broadcasts.create({
      name: options.name,
      segmentId: seg.segmentId,
      from: env.RESEND_FROM_EMAIL || "noreply@captiveau.fun",
      subject: options.subject,
      html: options.html,
      text: options.text,
      send: options.sendNow ?? false,
      scheduledAt: options.scheduledAt,
    });

    if (!result.success || !result.data) {
      return { success: false, error: String(result.error ?? "Failed to create broadcast") };
    }

    // Persist locally
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

    return {
      success: true,
      broadcastId: localId,
      resendBroadcastId: result.data.id,
    };
  }

  /**
   * Send a previously created draft broadcast.
   */
  async sendBroadcast(localId: string): Promise<{ success: boolean; error?: string }> {
    const record = await db.query.newsletterBroadcast.findFirst({
      where: eq(schema.newsletterBroadcast.id, localId),
    });

    if (!record?.resendBroadcastId) {
      return { success: false, error: "Broadcast not found or no Resend ID" };
    }

    const result = await resend.broadcasts.send(record.resendBroadcastId);
    if (!result.success) {
      return { success: false, error: String(result.error) };
    }

    await db
      .update(schema.newsletterBroadcast)
      .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.newsletterBroadcast.id, localId));

    return { success: true };
  }

  /**
   * Create and immediately send a broadcast (one-step).
   */
  async sendBroadcastNow(options: BroadcastOptions): Promise<{
    success: boolean;
    broadcastId?: string;
    resendBroadcastId?: string;
    error?: string;
  }> {
    return this.createBroadcast({ ...options, sendNow: true });
  }

  /**
   * Schedule a broadcast for later delivery.
   */
  async scheduleBroadcast(options: BroadcastOptions & { scheduledAt: string }): Promise<{
    success: boolean;
    broadcastId?: string;
    resendBroadcastId?: string;
    error?: string;
  }> {
    return this.createBroadcast({ ...options, sendNow: true, scheduledAt: options.scheduledAt });
  }

  /**
   * List locally tracked broadcasts.
   */
  async listBroadcasts(limit = 50, offset = 0) {
    const items = await db
      .select()
      .from(schema.newsletterBroadcast)
      .orderBy(schema.newsletterBroadcast.createdAt)
      .limit(limit)
      .offset(offset);

    const [total] = await db.select({ count: count() }).from(schema.newsletterBroadcast);

    return {
      data: items,
      pagination: { total: total?.count ?? 0, limit, offset },
    };
  }

  /**
   * Get a single broadcast by local ID, enriched with Resend status.
   */
  async getBroadcast(localId: string) {
    const record = await db.query.newsletterBroadcast.findFirst({
      where: eq(schema.newsletterBroadcast.id, localId),
    });
    if (!record) return null;

    // Try to fetch live status from Resend
    let resendStatus: Record<string, unknown> | null = null;
    if (record.resendBroadcastId) {
      const live = await resend.broadcasts.get(record.resendBroadcastId);
      if (live.success && live.data) {
        resendStatus = live.data as unknown as Record<string, unknown>;
        // Update local status if it changed
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

  /**
   * Delete a broadcast locally and optionally in Resend.
   */
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

  /**
   * Check if Resend is fully configured and ready.
   */
  get isReady(): boolean {
    return resend.isConfigured;
  }

  /**
   * Get summary stats.
   */
  async getStats() {
    const [totalBroadcasts] = await db.select({ count: count() }).from(schema.newsletterBroadcast);
    const [totalSubs] = await db.select({ count: count() }).from(newsletterSubscriber);
    const [activeSubs] = await db
      .select({ count: count() })
      .from(newsletterSubscriber)
      .where(eq(newsletterSubscriber.status, "active"));

    const seg = await db.query.newsletterSegment.findFirst();

    return {
      resendConfigured: resend.isConfigured,
      segmentId: seg?.id ?? null,
      segmentName: seg?.name ?? null,
      totalSubscribers: totalSubs?.count ?? 0,
      activeSubscribers: activeSubs?.count ?? 0,
      totalBroadcasts: totalBroadcasts?.count ?? 0,
    };
  }
}

export const newsletter = new NewsletterManager();
