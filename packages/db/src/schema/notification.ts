import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const notification = pgTable("notification", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info").notNull(), // info | success | warning | error
  read: boolean("read").default(false).notNull(),
  link: text("link"), // Optional link to redirect
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
