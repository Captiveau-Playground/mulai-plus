ALTER TABLE "course_lesson" ALTER COLUMN "video_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "course_section" ALTER COLUMN "course_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "course_lesson" ADD COLUMN "course_id" text;--> statement-breakpoint
ALTER TABLE "course_lesson" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "course_lesson" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "course_lesson" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "course_section" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "course_lesson" ADD CONSTRAINT "course_lesson_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;