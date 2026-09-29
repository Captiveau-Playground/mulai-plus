ALTER TABLE "tmb_invitations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "tmb_invitations" CASCADE;--> statement-breakpoint
ALTER TABLE "tmb_batches" ADD COLUMN "invite_code" text;--> statement-breakpoint
ALTER TABLE "tmb_batch_students" DROP COLUMN "invitation_code";--> statement-breakpoint
ALTER TABLE "tmb_batches" ADD CONSTRAINT "tmb_batches_invite_code_unique" UNIQUE("invite_code");