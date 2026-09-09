-- Phase 09: Agent Runtime
-- DR 0055-0069: Scoped Service Token, provider_job_id, retry_count

-- G1: Add provider_job_id to production.ai_generations (DR 0068)
ALTER TABLE "production"."ai_generations"
  ADD COLUMN "provider_job_id" text;
--> statement-breakpoint

-- G2: Add retry_count to production.ai_generations (DR 0069)
ALTER TABLE "production"."ai_generations"
  ADD COLUMN "retry_count" integer NOT NULL DEFAULT 0;
--> statement-breakpoint

-- G3: Partial unique index: (organization_id, provider, provider_job_id) WHERE NOT NULL (DR 0068 §2.4)
CREATE UNIQUE INDEX "ai_generations_provider_job_id_unique_idx"
  ON "production"."ai_generations" ("organization_id", "provider", "provider_job_id")
  WHERE "provider_job_id" IS NOT NULL;
--> statement-breakpoint

-- G4: Webhook lookup index: (provider, provider_job_id) WHERE NOT NULL (DR 0068 §2.5)
CREATE INDEX "ai_generations_provider_job_id_idx"
  ON "production"."ai_generations" ("provider", "provider_job_id")
  WHERE "provider_job_id" IS NOT NULL;
--> statement-breakpoint

-- G5: Create system.service_tokens table (DR 0065 §2.7)
CREATE TABLE "system"."service_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "token_hash" text NOT NULL,
  "organization_id" uuid NOT NULL,
  "production_job_id" uuid NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "service_tokens_token_hash_unique" UNIQUE ("token_hash"),
  CONSTRAINT "service_tokens_organization_id_fk"
    FOREIGN KEY ("organization_id")
    REFERENCES "core"."organizations"("id")
);
--> statement-breakpoint
CREATE INDEX "service_tokens_token_hash_idx" ON "system"."service_tokens" ("token_hash");
--> statement-breakpoint
CREATE INDEX "service_tokens_org_job_idx" ON "system"."service_tokens" ("organization_id", "production_job_id");
--> statement-breakpoint
CREATE INDEX "service_tokens_expires_at_idx" ON "system"."service_tokens" ("expires_at");
