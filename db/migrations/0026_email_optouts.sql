-- Email opt-outs table (CAN-SPAM / CASL compliance, DR 0129)
-- One record per email address; opted_out_at NULL = subscribed, NOT NULL = opted out.
CREATE TABLE IF NOT EXISTS "sales"."email_optouts" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "token" text NOT NULL,
  "opted_out_at" timestamp with time zone,
  "source_message_id" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_optouts_email_unique" ON "sales"."email_optouts" USING btree ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_optouts_token_unique" ON "sales"."email_optouts" USING btree ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_optouts_opted_out_at_idx" ON "sales"."email_optouts" USING btree ("opted_out_at");
