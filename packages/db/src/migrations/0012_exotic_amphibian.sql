CREATE TYPE "public"."feedback_campaign_status" AS ENUM('scheduled', 'open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."feedback_question_type" AS ENUM('text', 'likert');--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM('mentee_to_mentor', 'mentee_to_platform', 'mentor_to_platform');--> statement-breakpoint
CREATE TABLE "graduation_rates" (
	"id_sp" text PRIMARY KEY NOT NULL,
	"grad_rate_id" text,
	"graduation_rate" double precision
);
--> statement-breakpoint
CREATE TABLE "lecturer_counts" (
	"id_sp" text PRIMARY KEY NOT NULL,
	"lecturer_count_id" text,
	"total_lecturers" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "name_histories" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_sp" text NOT NULL,
	"old_name" text,
	"year_changed" integer
);
--> statement-breakpoint
CREATE TABLE "program_counts" (
	"id_sp" text PRIMARY KEY NOT NULL,
	"program_count_id" text,
	"total_programs" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "program_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"snpmb_program_id" integer NOT NULL,
	"snpmb_program_code" integer,
	"snpmb_program_name" text NOT NULL,
	"level" text,
	"pddikti_program_id" text,
	"pddikti_program_code" text,
	"pddikti_program_name" text,
	"pddikti_level" text,
	"id_ptn" integer NOT NULL,
	"id_sp" text,
	"similarity" double precision
);
--> statement-breakpoint
CREATE TABLE "snbp_capacity_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_prodi" integer NOT NULL,
	"year" integer NOT NULL,
	"capacity" integer,
	"applicants" integer,
	"accepted" integer
);
--> statement-breakpoint
CREATE TABLE "snbp_programs" (
	"id_prodi" integer PRIMARY KEY NOT NULL,
	"id_ptn" integer NOT NULL,
	"code" integer,
	"name" text NOT NULL,
	"level" text,
	"portfolio_code" integer DEFAULT 0,
	"portfolio_name" text,
	"capacity" integer,
	"is_new" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "snbt_applicant_provinces" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_prodi" integer NOT NULL,
	"year" integer NOT NULL,
	"province_code" text,
	"province_name" text,
	"total_applicants" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "snbt_capacity_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_prodi" integer NOT NULL,
	"year" integer NOT NULL,
	"capacity" integer,
	"applicants" integer,
	"accepted" integer
);
--> statement-breakpoint
CREATE TABLE "snbt_programs" (
	"id_prodi" integer PRIMARY KEY NOT NULL,
	"id_ptn" integer NOT NULL,
	"code" integer,
	"name" text NOT NULL,
	"level" text,
	"portfolio_code" integer DEFAULT 0,
	"portfolio_name" text,
	"capacity" integer,
	"is_new" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "snpmb_universities" (
	"id_ptn" integer PRIMARY KEY NOT NULL,
	"code" integer,
	"name" text NOT NULL,
	"province" text,
	"type" text,
	"is_ptnbh" integer DEFAULT 0,
	"website" text,
	"address" text
);
--> statement-breakpoint
CREATE TABLE "student_stats" (
	"id_sp" text PRIMARY KEY NOT NULL,
	"student_stats_id" text,
	"avg_graduates" double precision DEFAULT 0,
	"avg_new_students" double precision DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "study_durations" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_sp" text NOT NULL,
	"duration_id" text,
	"level" text,
	"avg_duration_years" double precision
);
--> statement-breakpoint
CREATE TABLE "study_programs" (
	"id_sms" text PRIMARY KEY NOT NULL,
	"id_sp" text NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"level" text,
	"accreditation" text,
	"status" text,
	"lecturers_nidn" integer DEFAULT 0,
	"lecturers_nidk" integer DEFAULT 0,
	"total_lecturers" integer DEFAULT 0,
	"teaching_lecturers" integer DEFAULT 0,
	"total_students" integer DEFAULT 0,
	"ratio" text,
	"data_completeness" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "tuition_fees" (
	"id_sp" text PRIMARY KEY NOT NULL,
	"fee_id" text,
	"tuition_range" text
);
--> statement-breakpoint
CREATE TABLE "universities" (
	"id_sp" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"short_name" text,
	"type" text,
	"status" text,
	"province" text,
	"regency" text,
	"accreditation" text,
	"total_programs" integer,
	"tuition_range" text
);
--> statement-breakpoint
CREATE TABLE "university_details" (
	"id_sp" text PRIMARY KEY NOT NULL,
	"detail_id" text,
	"group_name" text,
	"supervisor" text,
	"email" text,
	"phone" text,
	"fax" text,
	"website" text,
	"address" text,
	"postal_code" text,
	"subdistrict" text,
	"latitude" double precision,
	"longitude" double precision,
	"founded_date" text,
	"establishment_decree_date" text,
	"establishment_decree" text,
	"accreditation_status" text,
	"accreditation" text
);
--> statement-breakpoint
CREATE TABLE "university_mappings" (
	"id_ptn" integer PRIMARY KEY NOT NULL,
	"code" integer,
	"name" text NOT NULL,
	"id_sp" text,
	"pt_code" text,
	"pt_name" text,
	"province" text,
	"group_name" text,
	"supervisor" text,
	"match_type" text DEFAULT 'exact',
	"match_similarity" double precision DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "batch_report_template_item" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"title" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_campaign" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" "feedback_campaign_status" DEFAULT 'scheduled' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_question" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"question" text NOT NULL,
	"question_type" "feedback_question_type" DEFAULT 'text' NOT NULL,
	"likert_options" jsonb,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_response" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"question_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text,
	"batch_id" text NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_template" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "feedback_type" NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "program_syllabus" ADD COLUMN "tujuan" text;--> statement-breakpoint
ALTER TABLE "program_syllabus" ADD COLUMN "kegiatan_utama" text;--> statement-breakpoint
ALTER TABLE "program_syllabus" ADD COLUMN "fokus_utama" text;--> statement-breakpoint
ALTER TABLE "program_syllabus" ADD COLUMN "output" text;--> statement-breakpoint
ALTER TABLE "graduation_rates" ADD CONSTRAINT "graduation_rates_id_sp_universities_id_sp_fk" FOREIGN KEY ("id_sp") REFERENCES "public"."universities"("id_sp") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecturer_counts" ADD CONSTRAINT "lecturer_counts_id_sp_universities_id_sp_fk" FOREIGN KEY ("id_sp") REFERENCES "public"."universities"("id_sp") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "name_histories" ADD CONSTRAINT "name_histories_id_sp_universities_id_sp_fk" FOREIGN KEY ("id_sp") REFERENCES "public"."universities"("id_sp") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_counts" ADD CONSTRAINT "program_counts_id_sp_universities_id_sp_fk" FOREIGN KEY ("id_sp") REFERENCES "public"."universities"("id_sp") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snbp_capacity_history" ADD CONSTRAINT "snbp_capacity_history_id_prodi_snbp_programs_id_prodi_fk" FOREIGN KEY ("id_prodi") REFERENCES "public"."snbp_programs"("id_prodi") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snbp_programs" ADD CONSTRAINT "snbp_programs_id_ptn_snpmb_universities_id_ptn_fk" FOREIGN KEY ("id_ptn") REFERENCES "public"."snpmb_universities"("id_ptn") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snbt_applicant_provinces" ADD CONSTRAINT "snbt_applicant_provinces_id_prodi_snbt_programs_id_prodi_fk" FOREIGN KEY ("id_prodi") REFERENCES "public"."snbt_programs"("id_prodi") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snbt_capacity_history" ADD CONSTRAINT "snbt_capacity_history_id_prodi_snbt_programs_id_prodi_fk" FOREIGN KEY ("id_prodi") REFERENCES "public"."snbt_programs"("id_prodi") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snbt_programs" ADD CONSTRAINT "snbt_programs_id_ptn_snpmb_universities_id_ptn_fk" FOREIGN KEY ("id_ptn") REFERENCES "public"."snpmb_universities"("id_ptn") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_stats" ADD CONSTRAINT "student_stats_id_sp_universities_id_sp_fk" FOREIGN KEY ("id_sp") REFERENCES "public"."universities"("id_sp") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_durations" ADD CONSTRAINT "study_durations_id_sp_universities_id_sp_fk" FOREIGN KEY ("id_sp") REFERENCES "public"."universities"("id_sp") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_programs" ADD CONSTRAINT "study_programs_id_sp_universities_id_sp_fk" FOREIGN KEY ("id_sp") REFERENCES "public"."universities"("id_sp") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tuition_fees" ADD CONSTRAINT "tuition_fees_id_sp_universities_id_sp_fk" FOREIGN KEY ("id_sp") REFERENCES "public"."universities"("id_sp") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "university_details" ADD CONSTRAINT "university_details_id_sp_universities_id_sp_fk" FOREIGN KEY ("id_sp") REFERENCES "public"."universities"("id_sp") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "university_mappings" ADD CONSTRAINT "university_mappings_id_ptn_snpmb_universities_id_ptn_fk" FOREIGN KEY ("id_ptn") REFERENCES "public"."snpmb_universities"("id_ptn") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "university_mappings" ADD CONSTRAINT "university_mappings_id_sp_universities_id_sp_fk" FOREIGN KEY ("id_sp") REFERENCES "public"."universities"("id_sp") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_report_template_item" ADD CONSTRAINT "batch_report_template_item_batch_id_program_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."program_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_campaign" ADD CONSTRAINT "feedback_campaign_template_id_feedback_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."feedback_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_campaign" ADD CONSTRAINT "feedback_campaign_batch_id_program_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."program_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_campaign" ADD CONSTRAINT "feedback_campaign_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_question" ADD CONSTRAINT "feedback_question_template_id_feedback_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."feedback_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_response" ADD CONSTRAINT "feedback_response_campaign_id_feedback_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."feedback_campaign"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_response" ADD CONSTRAINT "feedback_response_question_id_feedback_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."feedback_question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_response" ADD CONSTRAINT "feedback_response_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_response" ADD CONSTRAINT "feedback_response_to_user_id_user_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_response" ADD CONSTRAINT "feedback_response_batch_id_program_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."program_batch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_program_mappings_snpmb" ON "program_mappings" USING btree ("snpmb_program_id");--> statement-breakpoint
CREATE INDEX "idx_program_mappings_pddikti" ON "program_mappings" USING btree ("pddikti_program_id");--> statement-breakpoint
CREATE INDEX "idx_snbp_capacity_id_prodi" ON "snbp_capacity_history" USING btree ("id_prodi");--> statement-breakpoint
CREATE INDEX "idx_snbp_programs_id_ptn" ON "snbp_programs" USING btree ("id_ptn");--> statement-breakpoint
CREATE INDEX "idx_snbt_prov_id_prodi" ON "snbt_applicant_provinces" USING btree ("id_prodi");--> statement-breakpoint
CREATE INDEX "idx_snbt_prov_year" ON "snbt_applicant_provinces" USING btree ("year");--> statement-breakpoint
CREATE INDEX "idx_snbt_capacity_id_prodi" ON "snbt_capacity_history" USING btree ("id_prodi");--> statement-breakpoint
CREATE INDEX "idx_snbt_programs_id_ptn" ON "snbt_programs" USING btree ("id_ptn");--> statement-breakpoint
CREATE INDEX "idx_study_durations_id_sp" ON "study_durations" USING btree ("id_sp");--> statement-breakpoint
CREATE INDEX "idx_study_programs_id_sp" ON "study_programs" USING btree ("id_sp");--> statement-breakpoint
CREATE INDEX "idx_study_programs_code" ON "study_programs" USING btree ("code");