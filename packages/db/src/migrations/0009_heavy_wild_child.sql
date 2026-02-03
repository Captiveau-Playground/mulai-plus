CREATE TYPE "public"."attachment_action" AS ENUM('create', 'update', 'delete');--> statement-breakpoint
CREATE TYPE "public"."attachment_type" AS ENUM('file', 'video', 'link', 'tool');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'excused');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('scheduled', 'completed', 'cancelled', 'missed');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('one_on_one', 'group_mentoring');--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"link" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"week" integer,
	"session_id" text,
	"name" text NOT NULL,
	"type" "attachment_type" NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_attachment_request" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"attachment_id" text,
	"action" "attachment_action" NOT NULL,
	"data" jsonb NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"requested_by" text NOT NULL,
	"reviewed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"user_id" text NOT NULL,
	"week" integer NOT NULL,
	"status" "attendance_status" NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "week_check" CHECK ("program_attendance"."week" > 0)
);
--> statement-breakpoint
CREATE TABLE "program_batch_mentor" (
	"batch_id" text NOT NULL,
	"user_id" text NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonial" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"education" text,
	"program_name" text,
	"rating" text DEFAULT '5',
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "program_session" DROP CONSTRAINT "program_session_program_id_program_id_fk";
--> statement-breakpoint
ALTER TABLE "program_session" DROP CONSTRAINT "program_session_batch_id_program_batch_id_fk";
--> statement-breakpoint
ALTER TABLE "program_session" ALTER COLUMN "batch_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "program_session" ALTER COLUMN "mentor_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "program" ADD COLUMN "banner_url" text;--> statement-breakpoint
ALTER TABLE "program_batch" ADD COLUMN "banner_url" text;--> statement-breakpoint
ALTER TABLE "program_batch" ADD COLUMN "duration_weeks" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "program_batch" ADD COLUMN "verification_start_date" timestamp;--> statement-breakpoint
ALTER TABLE "program_batch" ADD COLUMN "verification_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "program_batch" ADD COLUMN "assessment_start_date" timestamp;--> statement-breakpoint
ALTER TABLE "program_batch" ADD COLUMN "assessment_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "program_batch" ADD COLUMN "announcement_date" timestamp;--> statement-breakpoint
ALTER TABLE "program_batch" ADD COLUMN "onboarding_date" timestamp;--> statement-breakpoint
ALTER TABLE "program_session" ADD COLUMN "student_id" text;--> statement-breakpoint
ALTER TABLE "program_session" ADD COLUMN "week" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "program_session" ADD COLUMN "type" "session_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "program_session" ADD COLUMN "status" "session_status" DEFAULT 'scheduled' NOT NULL;--> statement-breakpoint
ALTER TABLE "program_session" ADD COLUMN "starts_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "program_session" ADD COLUMN "duration_minutes" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "program_session" ADD COLUMN "meeting_link" text;--> statement-breakpoint
ALTER TABLE "program_session" ADD COLUMN "recording_link" text;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_attachment" ADD CONSTRAINT "program_attachment_batch_id_program_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."program_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_attachment" ADD CONSTRAINT "program_attachment_session_id_program_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."program_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_attachment_request" ADD CONSTRAINT "program_attachment_request_batch_id_program_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."program_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_attachment_request" ADD CONSTRAINT "program_attachment_request_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_attachment_request" ADD CONSTRAINT "program_attachment_request_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_attendance" ADD CONSTRAINT "program_attendance_batch_id_program_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."program_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_attendance" ADD CONSTRAINT "program_attendance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_batch_mentor" ADD CONSTRAINT "program_batch_mentor_batch_id_program_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."program_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_batch_mentor" ADD CONSTRAINT "program_batch_mentor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonial" ADD CONSTRAINT "testimonial_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_session" ADD CONSTRAINT "program_session_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_session" ADD CONSTRAINT "program_session_batch_id_program_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."program_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program" DROP COLUMN "duration_weeks";--> statement-breakpoint
ALTER TABLE "program" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "program_session" DROP COLUMN "program_id";--> statement-breakpoint
ALTER TABLE "program_session" DROP COLUMN "datetime";