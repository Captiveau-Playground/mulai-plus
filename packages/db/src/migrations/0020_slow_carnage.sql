CREATE TYPE "public"."assessment_content_type" AS ENUM('description', 'bullet_list', 'cards');--> statement-breakpoint
CREATE TYPE "public"."assessment_media_position" AS ENUM('above_text', 'below_text', 'side_by_side');--> statement-breakpoint
CREATE TYPE "public"."assessment_presentation_mode" AS ENUM('standard_option_card', 'icon_option', 'image_option', 'emoji_option', 'visual_comparison');--> statement-breakpoint
CREATE TYPE "public"."assessment_question_type" AS ENUM('multiple_choice', 'text_input');--> statement-breakpoint
CREATE TYPE "public"."assessment_scoring_method" AS ENUM('sum', 'average', 'weighted');--> statement-breakpoint
CREATE TYPE "public"."assessment_session_status" AS ENUM('in_progress', 'paused', 'completed', 'timeout');--> statement-breakpoint
CREATE TYPE "public"."assessment_timer_scope" AS ENUM('dimension', 'question', 'none');--> statement-breakpoint
CREATE TYPE "public"."assessment_version_status" AS ENUM('draft', 'preview', 'validate', 'live', 'archived');--> statement-breakpoint
CREATE TABLE "answer_scale_options" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"scale_id" varchar(24) NOT NULL,
	"value" varchar(20) NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"label" text NOT NULL,
	"has_math_notation" boolean DEFAULT false NOT NULL,
	"icon" text,
	"image_url" text,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answer_scales" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_answers" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"session_id" varchar(24) NOT NULL,
	"question_id" varchar(24) NOT NULL,
	"selected_option_id" varchar(24),
	"text_answer" text,
	"score_earned" integer,
	"answered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_dimension_scores" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"session_id" varchar(24) NOT NULL,
	"dimension_id" varchar(24) NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"rank" integer,
	"completion_time_seconds" integer,
	"accuracy_rate" jsonb
);
--> statement-breakpoint
CREATE TABLE "assessment_dimensions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"version_id" varchar(24) NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(80) NOT NULL,
	"short_name" varchar(40),
	"description" text,
	"icon_url" text,
	"duration_seconds" integer,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_results" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"session_id" varchar(24) NOT NULL,
	"profile_code" varchar(40),
	"top_dimensions_json" jsonb,
	"raw_scores_json" jsonb,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_sections" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"version_id" varchar(24) NOT NULL,
	"title" varchar(200) NOT NULL,
	"content_type" "assessment_content_type" DEFAULT 'description' NOT NULL,
	"content_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"visibility" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_sessions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"version_id" varchar(24) NOT NULL,
	"status" "assessment_session_status" DEFAULT 'in_progress' NOT NULL,
	"current_dimension_id" varchar(24),
	"config_json" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "assessment_versions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"assessment_id" varchar(24) NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"status" "assessment_version_status" DEFAULT 'draft' NOT NULL,
	"config_json" jsonb NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"default_config_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "dimension_instructions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"dimension_id" varchar(24) NOT NULL,
	"header" varchar(200),
	"content_type" "assessment_content_type" DEFAULT 'description' NOT NULL,
	"content_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_options" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"question_id" varchar(24) NOT NULL,
	"option_value" varchar(20) NOT NULL,
	"label" text NOT NULL,
	"has_math_notation" boolean DEFAULT false NOT NULL,
	"image_url" text,
	"image_caption" text,
	"score" integer DEFAULT 0 NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"version_id" varchar(24) NOT NULL,
	"dimension_id" varchar(24) NOT NULL,
	"scale_id" varchar(24),
	"question_code" varchar(40),
	"question_text" text NOT NULL,
	"has_math_notation" boolean DEFAULT false NOT NULL,
	"media_url" text,
	"media_type" varchar(20),
	"media_caption" text,
	"media_position" "assessment_media_position",
	"alt_text" text,
	"question_type" "assessment_question_type" DEFAULT 'multiple_choice' NOT NULL,
	"presentation_mode" "assessment_presentation_mode" DEFAULT 'standard_option_card' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_reco_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"riasec_primary" text,
	"riasec_vector" jsonb,
	"ability" jsonb,
	"goals" jsonb,
	"prefs" jsonb,
	"interests_signals" jsonb,
	"last_active" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "answer_scale_options" ADD CONSTRAINT "answer_scale_options_scale_id_answer_scales_id_fk" FOREIGN KEY ("scale_id") REFERENCES "public"."answer_scales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_session_id_assessment_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_dimension_scores" ADD CONSTRAINT "assessment_dimension_scores_session_id_assessment_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_dimensions" ADD CONSTRAINT "assessment_dimensions_version_id_assessment_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."assessment_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_session_id_assessment_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_sections" ADD CONSTRAINT "assessment_sections_version_id_assessment_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."assessment_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_version_id_assessment_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."assessment_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_versions" ADD CONSTRAINT "assessment_versions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dimension_instructions" ADD CONSTRAINT "dimension_instructions_dimension_id_assessment_dimensions_id_fk" FOREIGN KEY ("dimension_id") REFERENCES "public"."assessment_dimensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_version_id_assessment_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."assessment_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_reco_profile" ADD CONSTRAINT "student_reco_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ass_answers_session_question" ON "assessment_answers" USING btree ("session_id","question_id");--> statement-breakpoint
CREATE INDEX "idx_ass_sessions_student" ON "assessment_sessions" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_assessment_versions_uniq" ON "assessment_versions" USING btree ("assessment_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_assessment_versions_status" ON "assessment_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_questions_version_dim" ON "questions" USING btree ("version_id","dimension_id");--> statement-breakpoint
CREATE INDEX "idx_reco_last_active" ON "student_reco_profile" USING btree ("last_active");