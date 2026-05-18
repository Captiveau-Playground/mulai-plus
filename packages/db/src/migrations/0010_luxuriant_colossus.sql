CREATE TYPE "public"."cms_article_status" AS ENUM('draft', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."cms_article_type" AS ENUM('news', 'article');--> statement-breakpoint
CREATE TABLE "student_detail" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"address" text,
	"phone_number" text,
	"school" text,
	"education_level" text,
	"social_media" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_detail_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "cms_article" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text,
	"excerpt" text,
	"cover_image_url" text,
	"cover_image_alt" text,
	"type" "cms_article_type" DEFAULT 'article' NOT NULL,
	"status" "cms_article_status" DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp,
	"published_at" timestamp,
	"author_id" text NOT NULL,
	"category_id" text,
	"view_count" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"allow_comments" boolean DEFAULT true NOT NULL,
	"reading_time_minutes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "cms_article_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cms_article_seo" (
	"id" text PRIMARY KEY NOT NULL,
	"article_id" text NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"meta_keywords" text,
	"og_image_url" text,
	"canonical_url" text,
	"robots" text DEFAULT 'index,follow',
	"twitter_card" text DEFAULT 'summary_large_image',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_article_seo_article_id_unique" UNIQUE("article_id")
);
--> statement-breakpoint
CREATE TABLE "cms_article_tag" (
	"article_id" text NOT NULL,
	"tag_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_author" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"role" text DEFAULT 'contributor' NOT NULL,
	"social_links" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_author_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cms_category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"parent_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cms_media" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt" text,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_tag_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscriber" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"subscribed_at" timestamp DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp,
	"source" text,
	CONSTRAINT "newsletter_subscriber_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "program_attendance" ADD COLUMN "progress_note" text;--> statement-breakpoint
ALTER TABLE "program_batch" ADD COLUMN "community_link" text;--> statement-breakpoint
ALTER TABLE "student_detail" ADD CONSTRAINT "student_detail_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_article" ADD CONSTRAINT "cms_article_author_id_cms_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."cms_author"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_article" ADD CONSTRAINT "cms_article_category_id_cms_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."cms_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_article_seo" ADD CONSTRAINT "cms_article_seo_article_id_cms_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."cms_article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_article_tag" ADD CONSTRAINT "cms_article_tag_article_id_cms_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."cms_article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_article_tag" ADD CONSTRAINT "cms_article_tag_tag_id_cms_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."cms_tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cms_article_type_idx" ON "cms_article" USING btree ("type");--> statement-breakpoint
CREATE INDEX "cms_article_status_idx" ON "cms_article" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cms_article_author_idx" ON "cms_article" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "cms_article_category_idx" ON "cms_article" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "cms_article_published_idx" ON "cms_article" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_article_slug_idx" ON "cms_article" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "cms_article_seo_article_idx" ON "cms_article_seo" USING btree ("article_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_author_slug_idx" ON "cms_author" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "cms_author_userId_idx" ON "cms_author" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cms_category_parent_idx" ON "cms_category" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_category_slug_idx" ON "cms_category" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "cms_media_uploaded_by_idx" ON "cms_media" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "cms_media_mime_type_idx" ON "cms_media" USING btree ("mime_type");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_tag_slug_idx" ON "cms_tag" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscriber_email_idx" ON "newsletter_subscriber" USING btree ("email");--> statement-breakpoint
CREATE INDEX "newsletter_subscriber_status_idx" ON "newsletter_subscriber" USING btree ("status");