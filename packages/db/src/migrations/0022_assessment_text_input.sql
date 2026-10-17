CREATE TYPE "public"."assessment_text_eval" AS ENUM('exact_match', 'numeric_tolerance', 'keyword_match', 'pattern_match');
CREATE TYPE "public"."assessment_scoring_agg" AS ENUM('correct', 'weight', 'time');
ALTER TABLE "questions" ADD COLUMN "weight" integer DEFAULT 1 NOT NULL;
CREATE TABLE "text_input_configs" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"question_id" varchar(24) NOT NULL,
	"evaluation_type" "public"."assessment_text_eval" DEFAULT 'exact_match' NOT NULL,
	"answer_key" text NOT NULL,
	"numeric_tolerance" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "idx_textcfg_question" ON "text_input_configs" ("question_id");
ALTER TABLE "text_input_configs" ADD CONSTRAINT "text_input_configs_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
