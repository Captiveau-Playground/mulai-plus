import dotenv from "dotenv";

dotenv.config({ path: "../../apps/server/.env" });

import { eq } from "drizzle-orm";
import { db } from "../src";
import { user } from "../src/schema/auth";
import {
  tmbAiSummaries,
  tmbAssessmentResults,
  tmbRecommendations,
  tmbTestAnswers,
  tmbTestAttempts,
  tmbUserStats,
} from "../src/schema/tmb";

await db.delete(tmbRecommendations);
await db.delete(tmbAiSummaries);
await db.delete(tmbAssessmentResults);
await db.delete(tmbTestAnswers);
await db.delete(tmbTestAttempts);
await db.delete(tmbUserStats);
await db.delete(user).where(eq(user.id, "tmb-e2e-user"));
console.log("Test user & data dibersihkan");
process.exit(0);
