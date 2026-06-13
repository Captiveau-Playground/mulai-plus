import { relations } from "drizzle-orm";
import { boolean, index, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Chatbot sessions — tracks guest & auth user chats
 */
export const chatbotSession = pgTable(
  "chatbot_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    isAuth: boolean("is_auth").default(false).notNull(),
    messageCount: integer("message_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastActive: timestamp("last_active", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_chatbot_sessions_user").on(table.userId)],
);

/**
 * Chatbot messages — per message with cost tracking
 */
export const chatbotMessage = pgTable(
  "chatbot_messages",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => chatbotSession.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'user' | 'assistant'
    content: text("content").notNull(),
    promptTokens: integer("prompt_tokens").default(0),
    completionTokens: integer("completion_tokens").default(0),
    model: text("model"),
    cost: numeric("cost", { precision: 10, scale: 8 }).default("0"),
    feedback: text("feedback"), // 'up' | 'down' | null
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_chatbot_messages_session").on(table.sessionId),
    index("idx_chatbot_messages_created").on(table.createdAt),
  ],
);

export const chatbotSessionRelations = relations(chatbotSession, ({ many }) => ({
  messages: many(chatbotMessage),
}));

export const chatbotMessageRelations = relations(chatbotMessage, ({ one }) => ({
  session: one(chatbotSession, {
    fields: [chatbotMessage.sessionId],
    references: [chatbotSession.id],
  }),
}));
