-- Phase 08: Production Queue
-- DR 0053, DR 0054, DR 0035, DR 0036, DR 0037

-- G1: Add job_type, description, metadata to production.production_jobs (DR 0053 §2.2)
ALTER TABLE "production"."production_jobs"
  ADD COLUMN "job_type" text NOT NULL DEFAULT 'MANUAL_UPLOAD',
  ADD COLUMN "description" text,
  ADD COLUMN "metadata" jsonb;
--> statement-breakpoint
ALTER TABLE "production"."production_jobs"
  ADD CONSTRAINT "production_jobs_job_type_check"
  CHECK (job_type IN ('AI_GENERATION', 'MANUAL_UPLOAD'));
--> statement-breakpoint

-- G2: Add provider fields to production.ai_generations (DR 0053 §2.6)
ALTER TABLE "production"."ai_generations"
  ADD COLUMN "provider" text,
  ADD COLUMN "model" text,
  ADD COLUMN "prompt" text,
  ADD COLUMN "params" jsonb,
  ADD COLUMN "result_url" text;
--> statement-breakpoint

-- G3: Add file reference columns to production.assets (DR 0054 §2.2)
ALTER TABLE "production"."assets"
  ADD COLUMN "name" text,
  ADD COLUMN "file_key" text,
  ADD COLUMN "file_type" text,
  ADD COLUMN "file_size" bigint,
  ADD COLUMN "content_url" text;
--> statement-breakpoint

-- G4: Add reviewer_id to production.qc_reviews (Phase 08 reviewer attribution)
ALTER TABLE "production"."qc_reviews"
  ADD COLUMN "reviewer_id" uuid;
--> statement-breakpoint
ALTER TABLE "production"."qc_reviews"
  ADD CONSTRAINT "qc_reviews_reviewer_id_fk"
  FOREIGN KEY ("reviewer_id") REFERENCES "identity"."users"("id");
--> statement-breakpoint

-- G5: Add target_type and target_id to production.approvals (DR 0028 §2, DR 0029 §2)
ALTER TABLE "production"."approvals"
  ADD COLUMN "target_type" text NOT NULL DEFAULT 'ASSET',
  ADD COLUMN "target_id" uuid NOT NULL DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE "production"."approvals"
  ADD CONSTRAINT "approvals_target_type_check"
  CHECK (target_type IN ('ASSET', 'QUOTE'));
--> statement-breakpoint

-- G6: Add failure_reason to production.deliveries (DR 0036 §2.2)
ALTER TABLE "production"."deliveries"
  ADD COLUMN "failure_reason" text;
--> statement-breakpoint

-- G7: Add unique constraints needed for composite FKs from delivery_assets
ALTER TABLE "production"."deliveries"
  ADD CONSTRAINT "deliveries_id_org_unique" UNIQUE ("id", "organization_id");
--> statement-breakpoint

-- G8: Create production.delivery_assets join table (DR 0037 §2, D2)
CREATE TABLE "production"."delivery_assets" (
  "delivery_id" uuid NOT NULL,
  "asset_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("delivery_id", "asset_id"),
  CONSTRAINT "delivery_assets_delivery_id_fk"
    FOREIGN KEY ("delivery_id", "organization_id")
    REFERENCES "production"."deliveries"("id", "organization_id"),
  CONSTRAINT "delivery_assets_asset_id_fk"
    FOREIGN KEY ("asset_id", "organization_id")
    REFERENCES "production"."assets"("id", "organization_id")
);
--> statement-breakpoint
CREATE INDEX "delivery_assets_delivery_idx" ON "production"."delivery_assets" ("delivery_id");
--> statement-breakpoint
CREATE INDEX "delivery_assets_asset_idx" ON "production"."delivery_assets" ("asset_id");
--> statement-breakpoint
CREATE INDEX "delivery_assets_org_idx" ON "production"."delivery_assets" ("organization_id");
