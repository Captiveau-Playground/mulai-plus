CREATE TYPE "public"."campaign_type" AS ENUM('completion', 'periodic');--> statement-breakpoint
CREATE TABLE "chatbot_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0,
	"completion_tokens" integer DEFAULT 0,
	"model" text,
	"cost" numeric(10, 8) DEFAULT '0',
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"is_auth" boolean DEFAULT false NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"credit_limit" integer DEFAULT 30,
	"banned" boolean DEFAULT false NOT NULL,
	"banned_at" timestamp with time zone,
	"banned_reason" text,
	"notes" text,
	"clicked_login" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "esign_signature" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"document_type" text NOT NULL,
	"document_id" text NOT NULL,
	"signer_name" text NOT NULL,
	"signer_role" text NOT NULL,
	"document_hash" text,
	"metadata" jsonb,
	"verified_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_verified_at" timestamp,
	CONSTRAINT "esign_signature_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "cms_article" ADD COLUMN "newsletter_sent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_campaign" ADD COLUMN "campaign_type" "campaign_type" DEFAULT 'completion' NOT NULL;--> statement-breakpoint
ALTER TABLE "chatbot_messages" ADD CONSTRAINT "chatbot_messages_session_id_chatbot_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chatbot_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chatbot_messages_session" ON "chatbot_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_chatbot_messages_created" ON "chatbot_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_chatbot_sessions_user" ON "chatbot_sessions" USING btree ("user_id");