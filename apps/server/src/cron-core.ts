import { newsletter } from "@mulai-plus/api/lib/newsletter";
import { and, db, eq, gte, lte } from "@mulai-plus/db/db";
import { auditLog } from "@mulai-plus/db/schema/audit";
import { cmsArticle } from "@mulai-plus/db/schema/cms";
import { env } from "@mulai-plus/env/server";

/**
 * Auto-publish scheduled articles + send newsletter broadcast (every 5 minutes).
 *
 * Runs on:
 * - Bun/VPS runtime → `setInterval(runAutoPublish, 5 * 60 * 1000)` (apps/server/src/index.ts)
 * - Cloudflare Workers → `scheduled` handler + Cron Trigger every 5 minutes (apps/server/src/worker.ts)
 *
 * The db client is injected explicitly so the Workers variant can use the
 * Hyperdrive-backed client (`@mulai-plus/db/worker`) — pg-free core.
 */
export async function runAutoPublish(client: typeof db = db): Promise<void> {
  try {
    const now = new Date();
    const scheduled = await client
      .select()
      .from(cmsArticle)
      .where(and(eq(cmsArticle.status, "scheduled"), lte(cmsArticle.scheduledAt, now)))
      .limit(20);

    for (const article of scheduled) {
      // Update status to published
      await client
        .update(cmsArticle)
        .set({ status: "published", publishedAt: now })
        .where(eq(cmsArticle.id, article.id));

      // Audit log
      await client.insert(auditLog).values({
        id: crypto.randomUUID(),
        action: "SCHEDULED_PUBLISH",
        resource: "cms_article",
        resourceId: article.id,
        details: {
          title: article.title,
          type: article.type,
          slug: article.slug,
          scheduledAt: article.scheduledAt?.toISOString(),
          publishedAt: now.toISOString(),
        },
        createdAt: now,
      });

      // Send newsletter broadcast
      try {
        const typeLabel = article.type === "news" ? "News" : "Artikel";
        const siteUrl = env.APP_URL;
        const articleUrl = `${siteUrl}/blog/${article.type === "news" ? "news" : "articles"}/${article.slug}`;
        const coverImage = article.coverImageUrl
          ? `<img src="${article.coverImageUrl}" alt="${article.title}" style="width:100%;max-width:600px;border-radius:12px;margin:16px 0" />`
          : "";

        const bName1 = `${typeLabel} Baru: ${article.title}`.substring(0, 70);
        await newsletter.sendBroadcastNow({
          name: bName1,
          subject: bName1,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <div style="text-align:center;padding:16px 0;border-bottom:2px solid #1A1F6D">
                <h1 style="color:#1A1F6D;font-size:24px;margin:0">MULAI+</h1>
                <p style="color:#888;font-size:12px">Bimbingan Universitas, Jurusan & Beasiswa</p>
              </div>
              ${coverImage}
              <h2 style="color:#1A1F6D;font-size:20px;margin:16px 0 8px">${article.title}</h2>
              ${article.excerpt ? `<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px">${article.excerpt}</p>` : ""}
              <div style="margin:24px 0;text-align:center">
                <a href="${articleUrl}" style="display:inline-block;background:#1A1F6D;color:#fff;padding:12px 32px;border-radius:999px;text-decoration:none;font-size:14px">
                  Baca ${typeLabel} Lengkap →
                </a>
              </div>
              <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#aaa">
                <p>Dikirim oleh MULAI+ — ${siteUrl}</p>
                <p><a href="{{{{RESEND_UNSUBSCRIBE_URL}}}}" style="color:#888">Berhenti berlangganan</a></p>
              </div>
            </div>
          `,
          articleId: article.id,
        });
      } catch (err) {
        console.error(`[Cron] Newsletter failed for ${article.id}:`, err);
        continue; // cron akan retry di loop Part 2
      }

      // Newsletter sukses — tandai
      await client.update(cmsArticle).set({ newsletterSent: true }).where(eq(cmsArticle.id, article.id));
    }

    if (scheduled.length > 0) {
      console.log(`[Cron] Auto-published ${scheduled.length} articles`);
    }

    // ── Part 2: Retry newsletter — hanya artikel yang baru dipublikasikan ──
    // Filter publishedAt >= 1 jam yang lalu, biar artikel lawas nggak kena spam
    const missed = await client
      .select()
      .from(cmsArticle)
      .where(
        and(
          eq(cmsArticle.status, "published"),
          eq(cmsArticle.newsletterSent, false),
          gte(cmsArticle.publishedAt, new Date(Date.now() - 60 * 60 * 1000)),
        ),
      )
      .limit(20);

    for (const article of missed) {
      try {
        const typeLabel = article.type === "news" ? "News" : "Artikel";
        const siteUrl = env.APP_URL;
        const articleUrl = `${siteUrl}/blog/${article.type === "news" ? "news" : "articles"}/${article.slug}`;
        const coverImage = article.coverImageUrl
          ? `<img src="${article.coverImageUrl}" alt="${article.title}" style="width:100%;max-width:600px;border-radius:12px;margin:16px 0" />`
          : "";

        const bName2 = `${typeLabel} Baru: ${article.title}`.substring(0, 70);
        await newsletter.sendBroadcastNow({
          name: bName2,
          subject: bName2,
          html: `
              <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
                <div style="text-align:center;padding:16px 0;border-bottom:2px solid #1A1F6D">
                  <h1 style="color:#1A1F6D;font-size:24px;margin:0">MULAI+</h1>
                  <p style="color:#888;font-size:12px">Bimbingan Universitas, Jurusan & Beasiswa</p>
                </div>
                ${coverImage}
                <h2 style="color:#1A1F6D;font-size:20px;margin:16px 0 8px">${article.title}</h2>
                ${article.excerpt ? `<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px">${article.excerpt}</p>` : ""}
                <div style="margin:24px 0;text-align:center">
                  <a href="${articleUrl}" style="display:inline-block;background:#1A1F6D;color:#fff;padding:12px 32px;border-radius:999px;text-decoration:none;font-size:14px">
                    Baca ${typeLabel} Lengkap →
                  </a>
                </div>
                <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#aaa">
                  <p>Dikirim oleh MULAI+ — ${siteUrl}</p>
                  <p><a href="{{{{RESEND_UNSUBSCRIBE_URL}}}}" style="color:#888">Berhenti berlangganan</a></p>
                </div>
              </div>
            `,
          articleId: article.id,
        });

        await client.update(cmsArticle).set({ newsletterSent: true }).where(eq(cmsArticle.id, article.id));
      } catch (err) {
        console.error(`[Cron] Retry newsletter failed for ${article.id}:`, err);
      }
    }

    if (missed.length > 0) {
      console.log(`[Cron] Retried newsletter for ${missed.length} missed articles`);
    }
  } catch (err) {
    console.error("[Cron] Error:", err);
  }
}
