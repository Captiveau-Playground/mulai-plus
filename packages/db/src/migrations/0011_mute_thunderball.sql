CREATE TYPE "public"."summary_report_status" AS ENUM('draft', 'submitted', 'approved', 'revision');--> statement-breakpoint
CREATE TABLE "summary_report" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"mentor_id" text NOT NULL,
	"student_id" text NOT NULL,
	"status" "summary_report_status" DEFAULT 'draft' NOT NULL,
	"mentor_notes" text,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "summary_report_item" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "summary_report" ADD CONSTRAINT "summary_report_batch_id_program_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."program_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summary_report" ADD CONSTRAINT "summary_report_mentor_id_user_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summary_report" ADD CONSTRAINT "summary_report_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summary_report_item" ADD CONSTRAINT "summary_report_item_report_id_summary_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."summary_report"("id") ON DELETE cascade ON UPDATE no action;