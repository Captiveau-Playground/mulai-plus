import { db, eq } from "@mulai-plus/db";
import { systemSettings } from "@mulai-plus/db/schema/settings";
import { z } from "zod";
import { adminProcedure, publicProcedure } from "../index";

export type ShortLink = {
  to: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
};

export type ShortLinksMap = Record<string, ShortLink>;

const defaultLinks: ShortLinksMap = {
  ig: { to: "/", utm_source: "instagram", utm_medium: "social", utm_campaign: "bio" },
  in: { to: "/", utm_source: "linkedin", utm_medium: "social", utm_campaign: "bio" },
  yt: { to: "/", utm_source: "youtube", utm_medium: "social", utm_campaign: "bio" },
  tt: { to: "/", utm_source: "tiktok", utm_medium: "social", utm_campaign: "bio" },
  wa: { to: "/", utm_source: "whatsapp", utm_medium: "social", utm_campaign: "share" },
  programs: { to: "/programs", utm_source: "instagram", utm_medium: "social", utm_campaign: "bio" },
  scholarship: { to: "/programs", utm_source: "instagram", utm_medium: "social", utm_campaign: "scholarship" },
};

const linkSchema = z.object({
  to: z.string().min(1),
  utm_source: z.string().min(1),
  utm_medium: z.string().min(1),
  utm_campaign: z.string().min(1),
});

const _linksMapSchema = z.record(z.string(), linkSchema);

export const shortLinksRouter = {
  /**
   * Public endpoint — no auth required.
   * Returns all short links for the redirect page.
   */
  getAll: publicProcedure.handler(async () => {
    const setting = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, "short_links"),
    });

    if (!setting?.value) {
      return defaultLinks;
    }

    // Merge defaults + saved overrides so new defaults are always available
    const saved = setting.value as Record<string, Partial<ShortLink>>;
    return { ...defaultLinks, ...saved } as ShortLinksMap;
  }),

  /**
   * Admin-only endpoint to update short links.
   */
  update: adminProcedure
    .input(
      z.object({
        slug: z.string().min(1).max(50),
        config: linkSchema,
      }),
    )
    .handler(async ({ input }) => {
      const setting = await db.query.systemSettings.findFirst({
        where: eq(systemSettings.key, "short_links"),
      });

      const current = (setting?.value ?? {}) as ShortLinksMap;
      current[input.slug] = input.config;

      await db
        .insert(systemSettings)
        .values({
          key: "short_links",
          value: current,
          description: "Short-link redirects for social bios (go/[slug])",
        })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: { value: current, updatedAt: new Date() },
        });

      return { success: true };
    }),

  /**
   * Admin-only: delete a short link.
   */
  delete: adminProcedure.input(z.object({ slug: z.string().min(1) })).handler(async ({ input }) => {
    const setting = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, "short_links"),
    });

    const current = (setting?.value ?? {}) as ShortLinksMap;
    delete current[input.slug];

    await db
      .insert(systemSettings)
      .values({
        key: "short_links",
        value: current,
        description: "Short-link redirects for social bios (go/[slug])",
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: current, updatedAt: new Date() },
      });

    return { success: true };
  }),
};
