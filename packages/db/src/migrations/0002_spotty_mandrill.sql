ALTER TABLE "course" ADD COLUMN "price" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "discount_type" text DEFAULT 'fixed';--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "discount_value" integer DEFAULT 0;