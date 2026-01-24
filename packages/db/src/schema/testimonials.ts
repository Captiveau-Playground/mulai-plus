import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const testimonial = pgTable("testimonial", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  education: text("education"), // e.g. "SMA Negeri 1 Lamongan"
  programName: text("program_name"), // e.g. "Fullstack Web Development Batch 1"
  rating: text("rating").default("5"), // Optional: if we want 1-5 stars
  isVisible: boolean("is_visible").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const testimonialRelations = relations(testimonial, ({ one }) => ({
  user: one(user, {
    fields: [testimonial.userId],
    references: [user.id],
  }),
}));
