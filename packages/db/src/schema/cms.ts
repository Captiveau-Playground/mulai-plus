import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// ─── Enums ─────────────────────────────────────────────────────────────────

export const articleTypeEnum = pgEnum("cms_article_type", ["news", "article"]);

export const articleStatusEnum = pgEnum("cms_article_status", ["draft", "scheduled", "published", "archived"]);

// ─── Category ───────────────────────────────────────────────────────────────

// Define the table first without self-reference
const cmsCategoryTable = pgTable(
  "cms_category",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    parentId: text("parent_id"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("cms_category_parent_idx").on(table.parentId), uniqueIndex("cms_category_slug_idx").on(table.slug)],
);

// Add self-reference after table is defined
export const cmsCategory: typeof cmsCategoryTable = cmsCategoryTable;

// ─── Tag ────────────────────────────────────────────────────────────────────

export const cmsTag = pgTable(
  "cms_tag",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("cms_tag_slug_idx").on(table.slug)],
);

// ─── Author ─────────────────────────────────────────────────────────────────

export const cmsAuthor = pgTable(
  "cms_author",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"), // References user.id - set up manually in migration
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    role: text("role").default("contributor").notNull(), // editor | admin | contributor
    socialLinks: jsonb("social_links").$type<{
      instagram?: string;
      linkedin?: string;
      twitter?: string;
      website?: string;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("cms_author_slug_idx").on(table.slug), index("cms_author_userId_idx").on(table.userId)],
);

// ─── Article ────────────────────────────────────────────────────────────────

export const cmsArticle = pgTable(
  "cms_article",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    content: text("content"), // HTML from Tiptap
    excerpt: text("excerpt"), // 150-300 chars
    coverImageUrl: text("cover_image_url"),
    coverImageAlt: text("cover_image_alt"),

    type: articleTypeEnum("type").notNull().default("article"),
    status: articleStatusEnum("status").notNull().default("draft"),

    // Scheduling
    scheduledAt: timestamp("scheduled_at"),
    publishedAt: timestamp("published_at"),

    // Relations
    authorId: text("author_id")
      .notNull()
      .references(() => cmsAuthor.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => cmsCategory.id),

    // Stats
    viewCount: integer("view_count").default(0).notNull(),
    featured: boolean("featured").default(false).notNull(),
    allowComments: boolean("allow_comments").default(true).notNull(),
    readingTimeMinutes: integer("reading_time_minutes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("cms_article_type_idx").on(table.type),
    index("cms_article_status_idx").on(table.status),
    index("cms_article_author_idx").on(table.authorId),
    index("cms_article_category_idx").on(table.categoryId),
    index("cms_article_published_idx").on(table.publishedAt),
    uniqueIndex("cms_article_slug_idx").on(table.slug),
  ],
);

// ─── Article SEO ────────────────────────────────────────────────────────────

export const cmsArticleSeo = pgTable(
  "cms_article_seo",
  {
    id: text("id").primaryKey(),
    articleId: text("article_id")
      .notNull()
      .references(() => cmsArticle.id, { onDelete: "cascade" })
      .unique(),

    metaTitle: text("meta_title"), // max 70 chars
    metaDescription: text("meta_description"), // max 160 chars
    metaKeywords: text("meta_keywords"),

    ogImageUrl: text("og_image_url"),
    canonicalUrl: text("canonical_url"),
    robots: text("robots").default("index,follow"),

    twitterCard: text("twitter_card").default("summary_large_image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("cms_article_seo_article_idx").on(table.articleId)],
);

// ─── Article Tag (Junction) ─────────────────────────────────────────────────

export const cmsArticleTag = pgTable(
  "cms_article_tag",
  {
    articleId: text("article_id")
      .notNull()
      .references(() => cmsArticle.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => cmsTag.id, { onDelete: "cascade" }),
  },
  (table) => [
    {
      pk: { columns: [table.articleId, table.tagId] },
    },
  ],
);

// ─── Media ──────────────────────────────────────────────────────────────────

export const cmsMedia = pgTable(
  "cms_media",
  {
    id: text("id").primaryKey(),
    url: text("url").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(), // bytes
    width: integer("width"),
    height: integer("height"),
    alt: text("alt"),
    uploadedBy: text("uploaded_by"), // References user.id - set up manually in migration
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("cms_media_uploaded_by_idx").on(table.uploadedBy),
    index("cms_media_mime_type_idx").on(table.mimeType),
  ],
);

// ─── Newsletter Subscriber ──────────────────────────────────────────────────

export const newsletterSubscriber = pgTable(
  "newsletter_subscriber",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    status: text("status").default("active").notNull(), // active | unsubscribed
    subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
    unsubscribedAt: timestamp("unsubscribed_at"),
    source: text("source"), // article-page | popup | footer-form
  },
  (table) => [
    uniqueIndex("newsletter_subscriber_email_idx").on(table.email),
    index("newsletter_subscriber_status_idx").on(table.status),
  ],
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const cmsCategoryRelations = relations(cmsCategory, ({ one, many }) => ({
  parent: one(cmsCategory, {
    fields: [cmsCategory.parentId],
    references: [cmsCategory.id],
    relationName: "CmsCategoryParent",
  }),
  children: many(cmsCategory, { relationName: "CmsCategoryParent" }),
  articles: many(cmsArticle),
}));

export const cmsTagRelations = relations(cmsTag, ({ many }) => ({
  articles: many(cmsArticleTag),
}));

export const cmsAuthorRelations = relations(cmsAuthor, ({ many }) => ({
  articles: many(cmsArticle),
}));

export const cmsArticleRelations = relations(cmsArticle, ({ one, many }) => ({
  author: one(cmsAuthor, {
    fields: [cmsArticle.authorId],
    references: [cmsAuthor.id],
  }),
  category: one(cmsCategory, {
    fields: [cmsArticle.categoryId],
    references: [cmsCategory.id],
  }),
  seo: one(cmsArticleSeo, {
    fields: [cmsArticle.id],
    references: [cmsArticleSeo.articleId],
  }),
  tags: many(cmsArticleTag),
}));

export const cmsArticleTagRelations = relations(cmsArticleTag, ({ one }) => ({
  article: one(cmsArticle, {
    fields: [cmsArticleTag.articleId],
    references: [cmsArticle.id],
  }),
  tag: one(cmsTag, {
    fields: [cmsArticleTag.tagId],
    references: [cmsTag.id],
  }),
}));

export const cmsArticleSeoRelations = relations(cmsArticleSeo, ({ one }) => ({
  article: one(cmsArticle, {
    fields: [cmsArticleSeo.articleId],
    references: [cmsArticle.id],
  }),
}));

export const cmsMediaRelations = relations(cmsMedia, () => ({
  // uploadedBy relation will be added in index.ts
}));
