import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Profil rekomendasi siswa — satu baris per user, di-update otomatis dari:
 *  - hasil Tes Minat/Bakat (TMB) → riasecPrimary / ability vector
 *  - percakapan asisten ("kenalan") → goals / prefs
 *  - sinyal program (daftar/shortlist) → interestsSignals
 * Konsolidasi dari student_detail & tmb_profiles; dipakai asisten & sistem rekomendasi.
 */
export const studentRecoProfile = pgTable(
  "student_reco_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    riasecPrimary: text("riasec_primary"), // R/I/A/S/E/C
    riasecVector: jsonb("riasec_vector").$type<Record<string, number>>(), // { R: 0.8, I: 0.2, ... }
    ability: jsonb("ability").$type<Record<string, number>>(), // { numerical: 0.7, ... }
    goals: jsonb("goals").$type<string[]>(),
    prefs: jsonb("prefs").$type<{
      educationLevel?: string;
      targetPtn?: string[];
      targetMajor?: string[];
      region?: string[];
      budget?: string;
      careerGoal?: string;
    }>(),
    interestsSignals: jsonb("interests_signals").$type<Record<string, number>>(), // probinti chat/aksi
    lastActive: timestamp("last_active").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("idx_reco_last_active").on(table.lastActive)],
);
