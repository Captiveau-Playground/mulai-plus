ALTER TABLE "program" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "program" ADD COLUMN "registration_form" jsonb;--> statement-breakpoint
ALTER TABLE "program" ADD CONSTRAINT "program_slug_unique" UNIQUE("slug");