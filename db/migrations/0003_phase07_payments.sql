-- Phase 07: Payments & Orders
-- DR 0044, DR 0045, DR 0046, DR 0047, DR 0048, DR 0052

-- G1: Add PROCESSING to financial.payments.status CHECK constraint (DR 0047)
ALTER TABLE "financial"."payments" DROP CONSTRAINT IF EXISTS "payments_status_check";
--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD CONSTRAINT "payments_status_check"
  CHECK (status IN ('PENDING','PROCESSING','PAID','FAILED','REFUNDED','CHARGEBACK'));
--> statement-breakpoint

-- G2: Add accepted_at to commercial.quotes (DR 0046 §5)
ALTER TABLE "commercial"."quotes" ADD COLUMN "accepted_at" timestamp with time zone;
--> statement-breakpoint

-- G3: Add provider fields to financial.payments (DR 0044 §3.2, DR 0048 §4)
ALTER TABLE "financial"."payments" ADD COLUMN "provider_name" text;
--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD COLUMN "provider_payment_id" text;
--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD COLUMN "payment_method_type" text;
--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD COLUMN "failure_reason" text;
--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD COLUMN "paid_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD COLUMN "refunded_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD COLUMN "metadata" jsonb;
--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD COLUMN "provider_event_id" text;
--> statement-breakpoint

-- G4: Partial unique index — at most one PAID payment per Order (DR 0048 §3.4)
CREATE UNIQUE INDEX "payments_order_one_paid"
  ON "financial"."payments" ("order_id")
  WHERE (status = 'PAID');
--> statement-breakpoint

-- Supporting index for provider_payment_id lookup (webhook reconciliation)
CREATE INDEX "payments_provider_payment_id_idx"
  ON "financial"."payments" ("provider_payment_id");
