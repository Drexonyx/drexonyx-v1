CREATE SCHEMA "commercial";
--> statement-breakpoint
CREATE SCHEMA "core";
--> statement-breakpoint
CREATE SCHEMA "financial";
--> statement-breakpoint
CREATE SCHEMA "identity";
--> statement-breakpoint
CREATE SCHEMA "production";
--> statement-breakpoint
CREATE SCHEMA "system";
--> statement-breakpoint
CREATE TABLE "commercial"."briefs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "briefs_status_check" CHECK ("commercial"."briefs"."status" IN ('DRAFT','SUBMITTED','REVISION_REQUIRED','APPROVED'))
);
--> statement-breakpoint
CREATE TABLE "commercial"."campaigns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "campaigns_status_check" CHECK ("commercial"."campaigns"."status" IN ('DRAFT','BRIEFING','PRE_FLIGHT','STRATEGY','QUOTE_PENDING','APPROVAL_PENDING','ORDERED','IN_PRODUCTION','QC','CLIENT_PREVIEW','REVISION','FINAL_APPROVAL','DELIVERY','CLOSED','CANCELLED'))
);
--> statement-breakpoint
CREATE TABLE "commercial"."order_budgets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"planned_amount" numeric(19, 4) NOT NULL,
	"estimated_amount" numeric(19, 4),
	"actual_amount" numeric(19, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_budgets_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "commercial"."orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_quote_id_unique" UNIQUE("quote_id"),
	CONSTRAINT "orders_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "orders_status_check" CHECK ("commercial"."orders"."status" IN ('ACTIVE','COMPLETED','CANCELLED'))
);
--> statement-breakpoint
CREATE TABLE "commercial"."quotes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"total_amount" numeric(19, 4) NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "quotes_status_check" CHECK ("commercial"."quotes"."status" IN ('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED','CANCELLED'))
);
--> statement-breakpoint
CREATE TABLE "core"."organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "financial"."expenses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_budget_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"expense_type" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial"."financial_ledger" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"entry_type" text NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"reference_entity_type" text,
	"reference_entity_id" uuid,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial"."owner_settlements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_settlements_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "owner_settlements_status_check" CHECK ("financial"."owner_settlements"."status" IN ('PENDING','PAID','FAILED'))
);
--> statement-breakpoint
CREATE TABLE "financial"."payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payments_status_check" CHECK ("financial"."payments"."status" IN ('PENDING','PAID','FAILED','REFUNDED','CHARGEBACK'))
);
--> statement-breakpoint
CREATE TABLE "financial"."provider_credits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_credits_status_check" CHECK ("financial"."provider_credits"."status" IN ('ACTIVE','CONSUMED','EXPIRED','CANCELLED'))
);
--> statement-breakpoint
CREATE TABLE "financial"."reserve_allocations" (
	"reserve_id" uuid NOT NULL,
	"owner_settlement_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"allocated_amount" numeric(19, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reserve_allocations_reserve_id_owner_settlement_id_pk" PRIMARY KEY("reserve_id","owner_settlement_id")
);
--> statement-breakpoint
CREATE TABLE "financial"."reserves" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"reserve_type" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reserves_status_check" CHECK ("financial"."reserves"."status" IN ('ACTIVE','ALLOCATED','RELEASED'))
);
--> statement-breakpoint
CREATE TABLE "identity"."org_memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_memberships_org_user_unique" UNIQUE("organization_id","user_id"),
	CONSTRAINT "org_memberships_role_check" CHECK ("identity"."org_memberships"."role" IN ('OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION', 'QC', 'CLIENT', 'AGENT'))
);
--> statement-breakpoint
CREATE TABLE "identity"."users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "production"."ai_generations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"production_job_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" text DEFAULT 'REQUESTED' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_generations_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "ai_generations_status_check" CHECK ("production"."ai_generations"."status" IN ('REQUESTED','RUNNING','SUCCEEDED','FAILED','CANCELLED'))
);
--> statement-breakpoint
CREATE TABLE "production"."approvals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_by_user_id" uuid,
	"decided_by_user_id" uuid,
	"expires_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approvals_status_check" CHECK ("production"."approvals"."status" IN ('PENDING','APPROVED','REJECTED','CANCELLED','EXPIRED'))
);
--> statement-breakpoint
CREATE TABLE "production"."asset_ai_generations" (
	"asset_id" uuid NOT NULL,
	"ai_generation_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_ai_generations_asset_id_ai_generation_id_pk" PRIMARY KEY("asset_id","ai_generation_id")
);
--> statement-breakpoint
CREATE TABLE "production"."assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"status" text DEFAULT 'UPLOADED' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "assets_status_check" CHECK ("production"."assets"."status" IN ('UPLOADED','PROCESSING','READY_FOR_QC','CLIENT_PREVIEW','REVISION_REQUIRED','REJECTED'))
);
--> statement-breakpoint
CREATE TABLE "production"."deliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" text DEFAULT 'PREPARING' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deliveries_status_check" CHECK ("production"."deliveries"."status" IN ('PREPARING','SENDING','COMPLETED','FAILED','CANCELLED'))
);
--> statement-breakpoint
CREATE TABLE "production"."production_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" text DEFAULT 'QUEUED' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_jobs_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "production_jobs_status_check" CHECK ("production"."production_jobs"."status" IN ('QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED'))
);
--> statement-breakpoint
CREATE TABLE "production"."qc_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"verdict" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qc_reviews_verdict_check" CHECK ("production"."qc_reviews"."verdict" IN ('PASS','FAIL'))
);
--> statement-breakpoint
CREATE TABLE "system"."audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"actor_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system"."idempotency_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"operation_type" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"request_hash" text,
	"response_payload" jsonb,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_key_org_unique" UNIQUE("key","organization_id"),
	CONSTRAINT "idempotency_keys_status_check" CHECK ("system"."idempotency_keys"."status" IN ('PENDING','PROCESSING','COMPLETED','FAILED'))
);
--> statement-breakpoint
ALTER TABLE "commercial"."briefs" ADD CONSTRAINT "briefs_campaign_id_fk" FOREIGN KEY ("campaign_id","organization_id") REFERENCES "commercial"."campaigns"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial"."campaigns" ADD CONSTRAINT "campaigns_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial"."order_budgets" ADD CONSTRAINT "order_budgets_order_id_fk" FOREIGN KEY ("order_id","organization_id") REFERENCES "commercial"."orders"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial"."orders" ADD CONSTRAINT "orders_campaign_id_fk" FOREIGN KEY ("campaign_id","organization_id") REFERENCES "commercial"."campaigns"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial"."orders" ADD CONSTRAINT "orders_quote_id_fk" FOREIGN KEY ("quote_id","organization_id") REFERENCES "commercial"."quotes"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial"."quotes" ADD CONSTRAINT "quotes_campaign_id_fk" FOREIGN KEY ("campaign_id","organization_id") REFERENCES "commercial"."campaigns"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial"."expenses" ADD CONSTRAINT "expenses_order_budget_id_fk" FOREIGN KEY ("order_budget_id") REFERENCES "commercial"."order_budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial"."expenses" ADD CONSTRAINT "expenses_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial"."financial_ledger" ADD CONSTRAINT "financial_ledger_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial"."owner_settlements" ADD CONSTRAINT "owner_settlements_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial"."payments" ADD CONSTRAINT "payments_order_id_fk" FOREIGN KEY ("order_id","organization_id") REFERENCES "commercial"."orders"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial"."provider_credits" ADD CONSTRAINT "provider_credits_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial"."reserve_allocations" ADD CONSTRAINT "reserve_allocations_reserve_id_fk" FOREIGN KEY ("reserve_id") REFERENCES "financial"."reserves"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial"."reserve_allocations" ADD CONSTRAINT "reserve_allocations_owner_settlement_id_fk" FOREIGN KEY ("owner_settlement_id") REFERENCES "financial"."owner_settlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial"."reserve_allocations" ADD CONSTRAINT "reserve_allocations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial"."reserves" ADD CONSTRAINT "reserves_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."org_memberships" ADD CONSTRAINT "org_memberships_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."org_memberships" ADD CONSTRAINT "org_memberships_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production"."ai_generations" ADD CONSTRAINT "ai_generations_production_job_id_fk" FOREIGN KEY ("production_job_id","organization_id") REFERENCES "production"."production_jobs"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production"."approvals" ADD CONSTRAINT "approvals_order_id_fk" FOREIGN KEY ("order_id","organization_id") REFERENCES "commercial"."orders"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production"."asset_ai_generations" ADD CONSTRAINT "asset_ai_gen_asset_id_fk" FOREIGN KEY ("asset_id","organization_id") REFERENCES "production"."assets"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production"."asset_ai_generations" ADD CONSTRAINT "asset_ai_gen_generation_id_fk" FOREIGN KEY ("ai_generation_id","organization_id") REFERENCES "production"."ai_generations"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production"."assets" ADD CONSTRAINT "assets_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production"."assets" ADD CONSTRAINT "assets_order_id_fk" FOREIGN KEY ("order_id","organization_id") REFERENCES "commercial"."orders"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production"."deliveries" ADD CONSTRAINT "deliveries_order_id_fk" FOREIGN KEY ("order_id","organization_id") REFERENCES "commercial"."orders"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production"."production_jobs" ADD CONSTRAINT "production_jobs_order_id_fk" FOREIGN KEY ("order_id","organization_id") REFERENCES "commercial"."orders"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production"."qc_reviews" ADD CONSTRAINT "qc_reviews_asset_id_fk" FOREIGN KEY ("asset_id","organization_id") REFERENCES "production"."assets"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system"."audit_events" ADD CONSTRAINT "audit_events_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system"."idempotency_keys" ADD CONSTRAINT "idempotency_keys_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "briefs_campaign_idx" ON "commercial"."briefs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "briefs_org_idx" ON "commercial"."briefs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "campaigns_org_idx" ON "commercial"."campaigns" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "commercial"."campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_budgets_org_idx" ON "commercial"."order_budgets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "orders_campaign_idx" ON "commercial"."orders" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "orders_org_idx" ON "commercial"."orders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "commercial"."orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quotes_campaign_idx" ON "commercial"."quotes" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "quotes_org_idx" ON "commercial"."quotes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "quotes_status_idx" ON "commercial"."quotes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "expenses_order_budget_idx" ON "financial"."expenses" USING btree ("order_budget_id");--> statement-breakpoint
CREATE INDEX "expenses_org_idx" ON "financial"."expenses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "expenses_type_idx" ON "financial"."expenses" USING btree ("expense_type");--> statement-breakpoint
CREATE INDEX "financial_ledger_org_idx" ON "financial"."financial_ledger" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "financial_ledger_entry_type_idx" ON "financial"."financial_ledger" USING btree ("entry_type");--> statement-breakpoint
CREATE INDEX "financial_ledger_reference_idx" ON "financial"."financial_ledger" USING btree ("reference_entity_type","reference_entity_id");--> statement-breakpoint
CREATE INDEX "owner_settlements_org_idx" ON "financial"."owner_settlements" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "owner_settlements_status_idx" ON "financial"."owner_settlements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "financial"."payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_org_idx" ON "financial"."payments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "financial"."payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "provider_credits_org_idx" ON "financial"."provider_credits" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "provider_credits_provider_idx" ON "financial"."provider_credits" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "provider_credits_status_idx" ON "financial"."provider_credits" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reserve_allocations_reserve_idx" ON "financial"."reserve_allocations" USING btree ("reserve_id");--> statement-breakpoint
CREATE INDEX "reserve_allocations_settlement_idx" ON "financial"."reserve_allocations" USING btree ("owner_settlement_id");--> statement-breakpoint
CREATE INDEX "reserve_allocations_org_idx" ON "financial"."reserve_allocations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "reserves_org_idx" ON "financial"."reserves" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "reserves_status_idx" ON "financial"."reserves" USING btree ("status");--> statement-breakpoint
CREATE INDEX "org_memberships_org_idx" ON "identity"."org_memberships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_memberships_user_idx" ON "identity"."org_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_generations_job_idx" ON "production"."ai_generations" USING btree ("production_job_id");--> statement-breakpoint
CREATE INDEX "ai_generations_org_idx" ON "production"."ai_generations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_generations_status_idx" ON "production"."ai_generations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "approvals_order_idx" ON "production"."approvals" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "approvals_org_idx" ON "production"."approvals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "approvals_status_idx" ON "production"."approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "asset_ai_gen_asset_idx" ON "production"."asset_ai_generations" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_ai_gen_generation_idx" ON "production"."asset_ai_generations" USING btree ("ai_generation_id");--> statement-breakpoint
CREATE INDEX "asset_ai_gen_org_idx" ON "production"."asset_ai_generations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "assets_org_idx" ON "production"."assets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "assets_order_idx" ON "production"."assets" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "assets_status_idx" ON "production"."assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deliveries_order_idx" ON "production"."deliveries" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "deliveries_org_idx" ON "production"."deliveries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "deliveries_status_idx" ON "production"."deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "production_jobs_order_idx" ON "production"."production_jobs" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "production_jobs_org_idx" ON "production"."production_jobs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "production_jobs_status_idx" ON "production"."production_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "qc_reviews_asset_idx" ON "production"."qc_reviews" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "qc_reviews_org_idx" ON "production"."qc_reviews" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_events_org_idx" ON "system"."audit_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "system"."audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "system"."audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_events_created_at_idx" ON "system"."audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idempotency_keys_org_idx" ON "system"."idempotency_keys" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idempotency_keys_status_idx" ON "system"."idempotency_keys" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_at_idx" ON "system"."idempotency_keys" USING btree ("expires_at");