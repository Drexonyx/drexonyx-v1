-- Social Seller Bot CRM schema (DR-0130)
-- Tables: ssb_leads, ssb_subscriptions, ssb_payments, ssb_bot_configs

CREATE SCHEMA IF NOT EXISTS "ssb";
--> statement-breakpoint

-- ── SSB Leads ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ssb"."ssb_leads" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "business_name" text NOT NULL,
  "business_type" text,
  "platform" text,
  "contact_whatsapp" text NOT NULL,
  "working_hours" text,
  "services" text,
  "source_bot" text NOT NULL DEFAULT 'mda-sales',
  "source_url" text,
  "status" text NOT NULL DEFAULT 'NEW',
  "notes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ssb_leads_status_check" CHECK ("status" IN ('NEW','CONTACTED','QUALIFIED','WON','REJECTED'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ssb_leads_status_idx" ON "ssb"."ssb_leads" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ssb_leads_created_at_idx" ON "ssb"."ssb_leads" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ssb_leads_source_bot_idx" ON "ssb"."ssb_leads" USING btree ("source_bot");
--> statement-breakpoint

-- ── SSB Subscriptions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ssb"."ssb_subscriptions" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "merchant_slug" text NOT NULL,
  "business_name" text NOT NULL,
  "business_type" text,
  "contact_whatsapp" text NOT NULL,
  "plan_name" text NOT NULL DEFAULT 'Basic AED 299/month',
  "monthly_amount_fils" integer NOT NULL DEFAULT 29900,
  "active" boolean NOT NULL DEFAULT true,
  "activated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at" timestamp with time zone,
  "lead_id" uuid,
  "notes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ssb_subscriptions_lead_id_fk" FOREIGN KEY ("lead_id")
    REFERENCES "ssb"."ssb_leads"("id") ON DELETE SET NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ssb_subscriptions_slug_unique" ON "ssb"."ssb_subscriptions" USING btree ("merchant_slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ssb_subscriptions_active_idx" ON "ssb"."ssb_subscriptions" USING btree ("active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ssb_subscriptions_slug_idx" ON "ssb"."ssb_subscriptions" USING btree ("merchant_slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ssb_subscriptions_expires_at_idx" ON "ssb"."ssb_subscriptions" USING btree ("expires_at");
--> statement-breakpoint

-- ── SSB Payments ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ssb"."ssb_payments" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "subscription_id" uuid NOT NULL,
  "ziina_payment_id" text NOT NULL,
  "amount_fils" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'PENDING',
  "period_month" text NOT NULL,
  "redirect_url" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ssb_payments_status_check" CHECK ("status" IN ('PENDING','COMPLETED','FAILED','CANCELLED')),
  CONSTRAINT "ssb_payments_subscription_id_fk" FOREIGN KEY ("subscription_id")
    REFERENCES "ssb"."ssb_subscriptions"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ssb_payments_ziina_id_unique" ON "ssb"."ssb_payments" USING btree ("ziina_payment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ssb_payments_subscription_idx" ON "ssb"."ssb_payments" USING btree ("subscription_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ssb_payments_status_idx" ON "ssb"."ssb_payments" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ssb_payments_period_idx" ON "ssb"."ssb_payments" USING btree ("period_month");
--> statement-breakpoint

-- ── SSB Bot Configs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ssb"."ssb_bot_configs" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "subscription_id" uuid NOT NULL,
  "merchant_slug" text NOT NULL,
  "config_json" jsonb NOT NULL,
  "qc_passed_at" timestamp with time zone,
  "delivered_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ssb_bot_configs_subscription_id_fk" FOREIGN KEY ("subscription_id")
    REFERENCES "ssb"."ssb_subscriptions"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ssb_bot_configs_subscription_unique" ON "ssb"."ssb_bot_configs" USING btree ("subscription_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ssb_bot_configs_slug_unique" ON "ssb"."ssb_bot_configs" USING btree ("merchant_slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ssb_bot_configs_slug_idx" ON "ssb"."ssb_bot_configs" USING btree ("merchant_slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ssb_bot_configs_qc_idx" ON "ssb"."ssb_bot_configs" USING btree ("qc_passed_at");
