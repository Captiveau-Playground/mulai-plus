CREATE TYPE "public"."tmb_attempt_status" AS ENUM('in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."tmb_batch_student_status" AS ENUM('invited', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."tmb_reco_type" AS ENUM('major', 'career');--> statement-breakpoint
CREATE TYPE "public"."tmb_test_code" AS ENUM('interest', 'ability');--> statement-breakpoint
CREATE TABLE "tmb_achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tmb_ai_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"result_id" text NOT NULL,
	"content" text NOT NULL,
	"model" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tmb_assessment_results" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"attempt_interest_id" text,
	"attempt_ability_id" text,
	"holland_code" text,
	"holland_scores" jsonb,
	"ability_scores" jsonb,
	"differentiation" text,
	"confidence_score" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tmb_batch_students" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"nis" text,
	"gender" text,
	"status" "tmb_batch_student_status" DEFAULT 'invited' NOT NULL,
	"invitation_code" text,
	"result_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tmb_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"class_name" text,
	"major" text,
	"graduation_year" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tmb_career_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"major_category" text NOT NULL,
	"career_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tmb_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_student_id" text NOT NULL,
	"link_token" text NOT NULL,
	"qr_url" text,
	"sent_at" timestamp,
	"expires_at" timestamp,
	CONSTRAINT "tmb_invitations_link_token_unique" UNIQUE("link_token")
);
--> statement-breakpoint
CREATE TABLE "tmb_major_patterns" (
	"id" text PRIMARY KEY NOT NULL,
	"category_key" text NOT NULL,
	"category_name" text NOT NULL,
	"pattern" text NOT NULL,
	"holland_primary" text NOT NULL,
	"holland_secondary" text NOT NULL,
	"ability_weights" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "tmb_major_patterns_category_key_unique" UNIQUE("category_key")
);
--> statement-breakpoint
CREATE TABLE "tmb_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"gender" text,
	"birth_date" text,
	"education_level" text,
	"school_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tmb_question_bank" (
	"id" text PRIMARY KEY NOT NULL,
	"test_code" "tmb_test_code" NOT NULL,
	"dimension" text NOT NULL,
	"pair_dimension" text,
	"text" text NOT NULL,
	"option_a" text NOT NULL,
	"option_b" text NOT NULL,
	"option_c" text,
	"option_d" text,
	"answer" text,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tmb_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"result_id" text NOT NULL,
	"type" "tmb_reco_type" NOT NULL,
	"rank" integer NOT NULL,
	"item_name" text NOT NULL,
	"category_key" text,
	"confidence" text,
	"prodi_refs" jsonb
);
--> statement-breakpoint
CREATE TABLE "tmb_test_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"attempt_id" text NOT NULL,
	"question_id" text NOT NULL,
	"selected_option" text NOT NULL,
	"is_correct" boolean,
	"answered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tmb_test_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"test_code" "tmb_test_code" NOT NULL,
	"status" "tmb_attempt_status" DEFAULT 'in_progress' NOT NULL,
	"current_question" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tmb_test_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"code" "tmb_test_code" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"xp_reward" integer DEFAULT 50 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "tmb_test_catalog_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "tmb_user_stats" (
	"user_id" text PRIMARY KEY NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_activity_at" timestamp,
	"tests_completed" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chatbot_sessions" ALTER COLUMN "credit_limit" SET DEFAULT 5;--> statement-breakpoint
ALTER TABLE "tmb_achievements" ADD CONSTRAINT "tmb_achievements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmb_ai_summaries" ADD CONSTRAINT "tmb_ai_summaries_result_id_tmb_assessment_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."tmb_assessment_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmb_assessment_results" ADD CONSTRAINT "tmb_assessment_results_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmb_assessment_results" ADD CONSTRAINT "tmb_assessment_results_attempt_interest_id_tmb_test_attempts_id_fk" FOREIGN KEY ("attempt_interest_id") REFERENCES "public"."tmb_test_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmb_assessment_results" ADD CONSTRAINT "tmb_assessment_results_attempt_ability_id_tmb_test_attempts_id_fk" FOREIGN KEY ("attempt_ability_id") REFERENCES "public"."tmb_test_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmb_batch_students" ADD CONSTRAINT "tmb_batch_students_batch_id_tmb_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."tmb_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmb_batch_students" ADD CONSTRAINT "tmb_batch_students_result_id_tmb_assessment_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."tmb_assessment_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmb_batches" ADD CONSTRAINT "tmb_batches_school_id_user_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmb_invitations" ADD CONSTRAINT "tmb_invitations_batch_student_id_tmb_batch_students_id_fk" FOREIGN KEY ("batch_student_id") REFERENCES "public"."tmb_batch_students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmb_profiles" ADD CONSTRAINT "tmb_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmb_recommendations" ADD CONSTRAINT "tmb_recommendations_result_id_tmb_assessment_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."tmb_assessment_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmb_test_answers" ADD CONSTRAINT "tmb_test_answers_attempt_id_tmb_test_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."tmb_test_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmb_test_answers" ADD CONSTRAINT "tmb_test_answers_question_id_tmb_question_bank_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."tmb_question_bank"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmb_test_attempts" ADD CONSTRAINT "tmb_test_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmb_user_stats" ADD CONSTRAINT "tmb_user_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tmb_batch_students_batch" ON "tmb_batch_students" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_tmb_q_test" ON "tmb_question_bank" USING btree ("test_code");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tmb_ans_attempt_question" ON "tmb_test_answers" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE INDEX "idx_tmb_attempt_user" ON "tmb_test_attempts" USING btree ("user_id");