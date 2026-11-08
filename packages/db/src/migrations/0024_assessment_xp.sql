ALTER TABLE "assessment_results" ADD COLUMN "xp_earned" integer DEFAULT 0 NOT NULL;
ALTER TABLE "assessment_results" ADD COLUMN "streak" integer DEFAULT 0 NOT NULL;
ALTER TABLE "assessment_results" ADD COLUMN "timed_out" boolean DEFAULT false NOT NULL;
