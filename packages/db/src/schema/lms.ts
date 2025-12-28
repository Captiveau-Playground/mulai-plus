import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const category = pgTable("category", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const tag = pgTable("tag", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const course = pgTable("course", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  benefits: text("benefits").array().default([]),
  price: integer("price").default(0),
  discountType: text("discount_type").default("fixed"), // 'fixed' | 'percentage'
  discountValue: integer("discount_value").default(0),
  published: boolean("published").default(false).notNull(),
  categoryId: text("category_id").references(() => category.id),
  userId: text("user_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const courseTag = pgTable(
  "course_tag",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.tagId] })],
);

export const courseSection = pgTable("course_section", {
  id: text("id").primaryKey(),
  courseId: text("course_id").references(() => course.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  order: integer("order").notNull().default(0),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const courseLesson = pgTable("course_lesson", {
  id: text("id").primaryKey(),
  sectionId: text("section_id")
    .notNull()
    .references(() => courseSection.id, { onDelete: "cascade" }),
  courseId: text("course_id").references(() => course.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url"), // Optional
  order: integer("order").notNull().default(0),
  status: text("status").default("draft").notNull(), // 'draft' | 'published' | 'archived'
  duration: integer("duration"), // Duration in seconds
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Relations
export const categoryRelations = relations(category, ({ many }) => ({
  courses: many(course),
}));

export const courseRelations = relations(course, ({ one, many }) => ({
  category: one(category, {
    fields: [course.categoryId],
    references: [category.id],
  }),
  user: one(user, {
    fields: [course.userId],
    references: [user.id],
  }),
  sections: many(courseSection),
  tags: many(courseTag),
}));

export const tagRelations = relations(tag, ({ many }) => ({
  courses: many(courseTag),
}));

export const courseTagRelations = relations(courseTag, ({ one }) => ({
  course: one(course, {
    fields: [courseTag.courseId],
    references: [course.id],
  }),
  tag: one(tag, {
    fields: [courseTag.tagId],
    references: [tag.id],
  }),
}));

export const courseSectionRelations = relations(courseSection, ({ one, many }) => ({
  course: one(course, {
    fields: [courseSection.courseId],
    references: [course.id],
  }),
  lessons: many(courseLesson),
}));

export const courseLessonRelations = relations(courseLesson, ({ one }) => ({
  section: one(courseSection, {
    fields: [courseLesson.sectionId],
    references: [courseSection.id],
  }),
  course: one(course, {
    fields: [courseLesson.courseId],
    references: [course.id],
  }),
}));
