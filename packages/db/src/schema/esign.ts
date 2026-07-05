import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * E-signature records — one per signer per document.
 * Each signature gets a unique token that encodes:
 *   - signer identity (name, role)
 *   - document reference
 *   - timestamp
 *   - cryptographic hash (for tamper detection)
 */
export const esignSignature = pgTable("esign_signature", {
  id: text("id").primaryKey(),
  token: text("token").unique().notNull(),
  documentType: text("document_type").notNull(), // e.g. "summary_report"
  documentId: text("document_id").notNull(),
  signerName: text("signer_name").notNull(),
  signerRole: text("signer_role").notNull(), // "program_manager" | "founder"
  documentHash: text("document_hash"), // SHA-256 of document content snapshot
  metadata: jsonb("metadata"),
  verifiedCount: integer("verified_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastVerifiedAt: timestamp("last_verified_at"),
});
