CREATE TABLE "commercial"."inquiries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'NEW' NOT NULL,
	"brand_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"website" text,
	"campaign_objective" text NOT NULL,
	"target_audience" text,
	"creative_types" text,
	"platforms" text,
	"additional_notes" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiries_status_check" CHECK ("commercial"."inquiries"."status" IN ('NEW','REVIEWED','CONVERTED','DISMISSED'))
);
--> statement-breakpoint
CREATE TABLE "commercial"."pricing_configs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"minimum_acceptable_margin_rate" numeric(5, 4) NOT NULL,
	"target_margin_rate" numeric(5, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_configs_org_unique" UNIQUE("organization_id"),
	CONSTRAINT "pricing_configs_minimum_margin_check" CHECK ("commercial"."pricing_configs"."minimum_acceptable_margin_rate" > 0 AND "commercial"."pricing_configs"."minimum_acceptable_margin_rate" < 1)
);
--> statement-breakpoint
CREATE TABLE "production"."delivery_assets" (
	"delivery_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_assets_delivery_id_asset_id_pk" PRIMARY KEY("delivery_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "production"."skill_outputs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"skill_version" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_type" text NOT NULL,
	"actor_role" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"output" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_outputs_status_check" CHECK ("production"."skill_outputs"."status" IN ('PENDING','RUNNING','SUCCEEDED','FAILED')),
	CONSTRAINT "skill_outputs_actor_type_check" CHECK ("production"."skill_outputs"."actor_type" IN ('USER','AGENT'))
);
--> statement-breakpoint
CREATE TABLE "system"."service_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"production_job_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "financial"."payments" DROP CONSTRAINT "payments_status_check";--> statement-breakpoint
ALTER TABLE "commercial"."briefs" ADD COLUMN "brief_text" text;--> statement-breakpoint
ALTER TABLE "commercial"."briefs" ADD COLUMN "deliverables" text;--> statement-breakpoint
ALTER TABLE "commercial"."briefs" ADD COLUMN "target_audience" text;--> statement-breakpoint
ALTER TABLE "commercial"."briefs" ADD COLUMN "timeline_notes" text;--> statement-breakpoint
ALTER TABLE "commercial"."briefs" ADD COLUMN "additional_notes" text;--> statement-breakpoint
ALTER TABLE "commercial"."campaigns" ADD COLUMN "objective" text;--> statement-breakpoint
ALTER TABLE "commercial"."campaigns" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "commercial"."quotes" ADD COLUMN "estimated_cost" numeric(19, 4);--> statement-breakpoint
ALTER TABLE "commercial"."quotes" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "commercial"."quotes" ADD COLUMN "accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD COLUMN "provider_name" text;--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD COLUMN "provider_payment_id" text;--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD COLUMN "payment_method_type" text;--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD COLUMN "provider_event_id" text;--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "production"."ai_generations" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "production"."ai_generations" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "production"."ai_generations" ADD COLUMN "prompt" text;--> statement-breakpoint
ALTER TABLE "production"."ai_generations" ADD COLUMN "params" jsonb;--> statement-breakpoint
ALTER TABLE "production"."ai_generations" ADD COLUMN "result_url" text;--> statement-breakpoint
ALTER TABLE "production"."ai_generations" ADD COLUMN "provider_job_id" text;--> statement-breakpoint
ALTER TABLE "production"."ai_generations" ADD COLUMN "retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "production"."approvals" ADD COLUMN "target_type" text DEFAULT 'ASSET' NOT NULL;--> statement-breakpoint
ALTER TABLE "production"."approvals" ADD COLUMN "target_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "production"."assets" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "production"."assets" ADD COLUMN "file_key" text;--> statement-breakpoint
ALTER TABLE "production"."assets" ADD COLUMN "file_type" text;--> statement-breakpoint
ALTER TABLE "production"."assets" ADD COLUMN "file_size" bigint;--> statement-breakpoint
ALTER TABLE "production"."assets" ADD COLUMN "content_url" text;--> statement-breakpoint
ALTER TABLE "production"."deliveries" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "production"."production_jobs" ADD COLUMN "job_type" text DEFAULT 'MANUAL_UPLOAD' NOT NULL;--> statement-breakpoint
ALTER TABLE "production"."production_jobs" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "production"."production_jobs" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "production"."qc_reviews" ADD COLUMN "reviewer_id" uuid;--> statement-breakpoint
ALTER TABLE "commercial"."pricing_configs" ADD CONSTRAINT "pricing_configs_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production"."delivery_assets" ADD CONSTRAINT "delivery_assets_delivery_id_fk" FOREIGN KEY ("delivery_id","organization_id") REFERENCES "production"."deliveries"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production"."delivery_assets" ADD CONSTRAINT "delivery_assets_asset_id_fk" FOREIGN KEY ("asset_id","organization_id") REFERENCES "production"."assets"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production"."skill_outputs" ADD CONSTRAINT "skill_outputs_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system"."service_tokens" ADD CONSTRAINT "service_tokens_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inquiries_status_idx" ON "commercial"."inquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inquiries_submitted_at_idx" ON "commercial"."inquiries" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "pricing_configs_org_idx" ON "commercial"."pricing_configs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "delivery_assets_delivery_idx" ON "production"."delivery_assets" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "delivery_assets_asset_idx" ON "production"."delivery_assets" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "delivery_assets_org_idx" ON "production"."delivery_assets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "skill_outputs_org_idx" ON "production"."skill_outputs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "skill_outputs_org_entity_idx" ON "production"."skill_outputs" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "skill_outputs_org_skill_idx" ON "production"."skill_outputs" USING btree ("organization_id","skill_id");--> statement-breakpoint
CREATE INDEX "skill_outputs_status_idx" ON "production"."skill_outputs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "service_tokens_token_hash_idx" ON "system"."service_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "service_tokens_org_job_idx" ON "system"."service_tokens" USING btree ("organization_id","production_job_id");--> statement-breakpoint
CREATE INDEX "service_tokens_expires_at_idx" ON "system"."service_tokens" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "production"."qc_reviews" ADD CONSTRAINT "qc_reviews_reviewer_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_provider_payment_id_idx" ON "financial"."payments" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_generations_provider_job_id_unique_idx" ON "production"."ai_generations" USING btree ("organization_id","provider","provider_job_id") WHERE "production"."ai_generations"."provider_job_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ai_generations_provider_job_id_idx" ON "production"."ai_generations" USING btree ("provider","provider_job_id") WHERE "production"."ai_generations"."provider_job_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "production"."approvals" ADD CONSTRAINT "approvals_id_org_unique" UNIQUE("id","organization_id");--> statement-breakpoint
ALTER TABLE "production"."deliveries" ADD CONSTRAINT "deliveries_id_org_unique" UNIQUE("id","organization_id");--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD CONSTRAINT "payments_status_check" CHECK ("financial"."payments"."status" IN ('PENDING','PROCESSING','PAID','FAILED','REFUNDED','CHARGEBACK'));--> statement-breakpoint
ALTER TABLE "production"."approvals" ADD CONSTRAINT "approvals_target_type_check" CHECK ("production"."approvals"."target_type" IN ('ASSET','QUOTE'));--> statement-breakpoint
ALTER TABLE "production"."production_jobs" ADD CONSTRAINT "production_jobs_job_type_check" CHECK ("production"."production_jobs"."job_type" IN ('AI_GENERATION','MANUAL_UPLOAD'));