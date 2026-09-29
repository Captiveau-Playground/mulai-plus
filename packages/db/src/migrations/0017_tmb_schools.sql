CREATE TYPE "public"."tmb_school_status" AS ENUM('prospek', 'aktif', 'selesai');--> statement-breakpoint
CREATE TABLE "tmb_schools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"city" text,
	"status" "tmb_school_status" DEFAULT 'prospek' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tmb_batches" DROP CONSTRAINT "tmb_batches_school_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "tmb_batches" ADD CONSTRAINT "tmb_batches_school_id_tmb_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."tmb_schools"("id") ON DELETE cascade ON UPDATE no action;