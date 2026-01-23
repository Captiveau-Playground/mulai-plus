ALTER TABLE "program_participant" ADD COLUMN "batch_id" text;--> statement-breakpoint
ALTER TABLE "program_session" ADD COLUMN "batch_id" text;--> statement-breakpoint
ALTER TABLE "program_participant" ADD CONSTRAINT "program_participant_batch_id_program_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."program_batch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_session" ADD CONSTRAINT "program_session_batch_id_program_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."program_batch"("id") ON DELETE no action ON UPDATE no action;