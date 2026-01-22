CREATE TABLE "program_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"registration_start_date" timestamp NOT NULL,
	"registration_end_date" timestamp NOT NULL,
	"quota" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "program_benefit" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"icon" text,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_faq" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "program_application" ADD COLUMN "batch_id" text;--> statement-breakpoint
ALTER TABLE "program_batch" ADD CONSTRAINT "program_batch_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_benefit" ADD CONSTRAINT "program_benefit_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_faq" ADD CONSTRAINT "program_faq_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_application" ADD CONSTRAINT "program_application_batch_id_program_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."program_batch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program" DROP COLUMN "quota";