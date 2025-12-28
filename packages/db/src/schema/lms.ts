import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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

export const course = pgTable("course", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  published: boolean("published").default(false).notNull(),
  categoryId: text("category_id").references(() => category.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const courseSection = pgTable("course_section", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => course.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").notNull().default(0),
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
  title: text("title").notNull(),
  videoUrl: text("video_url").notNull(), // YouTube URL
  order: integer("order").notNull().default(0),
  duration: integer("duration"), // Duration in seconds
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
  sections: many(courseSection),
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
}));
