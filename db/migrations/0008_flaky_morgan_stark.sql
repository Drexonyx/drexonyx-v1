CREATE SCHEMA "orchestration";
--> statement-breakpoint
CREATE SCHEMA "sales";
--> statement-breakpoint
CREATE TABLE "financial"."credit_packages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"credits" bigint NOT NULL,
	"price_aed" numeric(19, 4) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_packages_credits_positive" CHECK ("financial"."credit_packages"."credits" > 0),
	CONSTRAINT "credit_packages_price_positive" CHECK ("financial"."credit_packages"."price_aed" > 0)
);
--> statement-breakpoint
CREATE TABLE "financial"."credit_purchases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"credit_package_id" uuid NOT NULL,
	"credits" bigint NOT NULL,
	"amount_aed" numeric(19, 4) NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"provider_name" text,
	"provider_payment_id" text,
	"idempotency_key" text,
	"failure_reason" text,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_purchases_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "credit_purchases_status_check" CHECK ("financial"."credit_purchases"."status" IN ('PENDING','PROCESSING','COMPLETED','FAILED','REFUNDED')),
	CONSTRAINT "credit_purchases_credits_positive" CHECK ("financial"."credit_purchases"."credits" > 0),
	CONSTRAINT "credit_purchases_amount_positive" CHECK ("financial"."credit_purchases"."amount_aed" > 0)
);
--> statement-breakpoint
CREATE TABLE "financial"."customer_credit_ledger" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"entry_type" text NOT NULL,
	"credits_delta" bigint NOT NULL,
	"reference_entity_type" text,
	"reference_entity_id" uuid,
	"idempotency_key" text,
	"description" text,
	"actor_id" uuid,
	"actor_role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_credit_ledger_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "customer_credit_ledger_entry_type_check" CHECK ("financial"."customer_credit_ledger"."entry_type" IN ('PURCHASE','RESERVATION','RELEASE','ADJUSTMENT','REFUND'))
);
--> statement-breakpoint
CREATE TABLE "financial"."production_credit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"production_job_id" uuid NOT NULL,
	"credits_consumed" bigint NOT NULL,
	"warning_level" text DEFAULT 'NORMAL' NOT NULL,
	"credit_rate_aed" numeric(19, 8) NOT NULL,
	"estimated_aed" numeric(19, 4) NOT NULL,
	"cost_target_aed" numeric(19, 4) NOT NULL,
	"safety_reserve_aed" numeric(19, 4) NOT NULL,
	"hard_limit_aed" numeric(19, 4) NOT NULL,
	"event_type" text NOT NULL,
	"proceeded" boolean DEFAULT true NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_credit_events_warning_level_check" CHECK ("financial"."production_credit_events"."warning_level" IN ('NORMAL','RESERVE_USED','OVER_TARGET','RUNAWAY')),
	CONSTRAINT "production_credit_events_event_type_check" CHECK ("financial"."production_credit_events"."event_type" IN ('PRODUCTION_START','RETRY','QC_FAIL','COMPLETION','RUNAWAY_REFUSED'))
);
--> statement-breakpoint
CREATE TABLE "orchestration"."agent_tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"parent_task_id" uuid,
	"initiated_by_user_id" uuid NOT NULL,
	"initiator_role" text NOT NULL,
	"intent_type" text NOT NULL,
	"title" text,
	"context" jsonb,
	"plan" jsonb,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"budget_cents" integer,
	"execution_started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failure_reason" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_tasks_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "agent_tasks_status_check" CHECK ("orchestration"."agent_tasks"."status" IN ('PENDING','PLAN_READY','EXECUTING','AWAITING_GATE','COMPLETED','FAILED','ESCALATED','CANCELLED')),
	CONSTRAINT "agent_tasks_initiator_role_check" CHECK ("orchestration"."agent_tasks"."initiator_role" IN ('OWNER','ADMIN_OPERATIONS','CREATIVE_PRODUCTION','QC')),
	CONSTRAINT "agent_tasks_intent_type_check" CHECK ("orchestration"."agent_tasks"."intent_type" IN ('ROUTE_APPROVAL','INSPECT_ASSET_METADATA','OPTIMIZE_BRIEF_PROMPTS','COORDINATE_BATCH_OPERATION','COORDINATE_PRODUCTION_RUN','COORDINATE_QC_REVIEW','COORDINATE_FINANCIAL_MONITORING','GENERATE_OPERATIONAL_REPORT','GENERATE_INTELLIGENCE_REPORT','COORDINATE_INTERNAL_NOTIFICATION','HUNT_LEADS','COORDINATE_WEBSITE_PRODUCTION','AUDIT_WEBSITE_CONTENT'))
);
--> statement-breakpoint
CREATE TABLE "orchestration"."task_approvals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"agent_task_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"approver_role" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"decided_by_user_id" uuid,
	"decision_reason" text,
	"expires_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_approvals_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "task_approvals_status_check" CHECK ("orchestration"."task_approvals"."status" IN ('PENDING','APPROVED','REJECTED','EXPIRED','CANCELLED')),
	CONSTRAINT "task_approvals_approver_role_check" CHECK ("orchestration"."task_approvals"."approver_role" IN ('OWNER','ADMIN_OPERATIONS','QC'))
);
--> statement-breakpoint
CREATE TABLE "orchestration"."task_steps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"agent_task_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"step_index" integer NOT NULL,
	"step_type" text NOT NULL,
	"skill_id" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"error" text,
	"gate_id" uuid,
	"skill_output_id" uuid,
	"production_job_id" uuid,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_steps_task_step_unique" UNIQUE("agent_task_id","step_index"),
	CONSTRAINT "task_steps_status_check" CHECK ("orchestration"."task_steps"."status" IN ('PENDING','DISPATCHED','RUNNING','SUCCEEDED','FAILED','RETRY_PENDING','GATE_PENDING','GATE_APPROVED','GATE_REJECTED','SKIPPED')),
	CONSTRAINT "task_steps_step_type_check" CHECK ("orchestration"."task_steps"."step_type" IN ('SKILL','HUMAN_GATE','FINANCIAL_CHECK','PRODUCTION_JOB','STATUS_TRANSITION','QC_GATE','NOTIFICATION','VERIFY'))
);
--> statement-breakpoint
CREATE TABLE "orchestration"."task_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"agent_task_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_tokens_id_org_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "sales"."follow_ups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"lead_id" uuid NOT NULL,
	"outreach_id" uuid,
	"scheduled_at" timestamp with time zone NOT NULL,
	"channel" text NOT NULL,
	"message_text" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"sent_at" timestamp with time zone,
	"result" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follow_ups_channel_check" CHECK ("sales"."follow_ups"."channel" IN ('email','instagram','whatsapp','manual')),
	CONSTRAINT "follow_ups_status_check" CHECK ("sales"."follow_ups"."status" IN ('PENDING','SENT','SKIPPED','FAILED')),
	CONSTRAINT "follow_ups_result_check" CHECK ("sales"."follow_ups"."result" IS NULL OR "sales"."follow_ups"."result" IN ('REPLIED','NO_RESPONSE','BOUNCED','CONVERTED'))
);
--> statement-breakpoint
CREATE TABLE "sales"."lead_sources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"lead_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"url" text,
	"handle" text,
	"identifier" text NOT NULL,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_sources_platform_identifier_unique" UNIQUE("platform","identifier")
);
--> statement-breakpoint
CREATE TABLE "sales"."outreach_approvals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"lead_id" uuid NOT NULL,
	"outreach_id" uuid,
	"approval_type" text NOT NULL,
	"reason" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"approved_by" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outreach_approvals_approval_type_check" CHECK ("sales"."outreach_approvals"."approval_type" IN ('OUTREACH','FOLLOW_UP','PROPOSAL','SENSITIVE_CONTENT','CHANNEL_USE')),
	CONSTRAINT "outreach_approvals_status_check" CHECK ("sales"."outreach_approvals"."status" IN ('PENDING','APPROVED','REJECTED','EXPIRED'))
);
--> statement-breakpoint
CREATE TABLE "sales"."outreach_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"lead_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"message_text" text NOT NULL,
	"message_type" text DEFAULT 'cold_outreach' NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"approval_status" text DEFAULT 'PENDING' NOT NULL,
	"sent_at" timestamp with time zone,
	"reply_received_at" timestamp with time zone,
	"external_thread_id" text,
	"external_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outreach_messages_channel_check" CHECK ("sales"."outreach_messages"."channel" IN ('email','instagram','whatsapp','linkedin','manual')),
	CONSTRAINT "outreach_messages_message_type_check" CHECK ("sales"."outreach_messages"."message_type" IN ('cold_outreach','follow_up','reply','proposal')),
	CONSTRAINT "outreach_messages_status_check" CHECK ("sales"."outreach_messages"."status" IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','SENT','FAILED','BOUNCED')),
	CONSTRAINT "outreach_messages_approval_status_check" CHECK ("sales"."outreach_messages"."approval_status" IN ('PENDING','APPROVED','REJECTED','NOT_REQUIRED'))
);
--> statement-breakpoint
CREATE TABLE "sales"."sales_leads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text,
	"business_name" text NOT NULL,
	"country" text,
	"city" text,
	"primary_source_platform" text NOT NULL,
	"primary_source_url" text,
	"source_type" text NOT NULL,
	"website" text,
	"public_email" text,
	"public_contact_method" text,
	"lead_score" integer DEFAULT 0,
	"priority" text DEFAULT 'COLD' NOT NULL,
	"status" text DEFAULT 'NEW' NOT NULL,
	"opportunity" text,
	"portfolio_match" text,
	"notes" text,
	"discovered_by" text DEFAULT 'agent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_leads_priority_check" CHECK ("sales"."sales_leads"."priority" IN ('HOT','WARM','COLD')),
	CONSTRAINT "sales_leads_status_check" CHECK ("sales"."sales_leads"."status" IN ('NEW','REVIEWING','QUALIFIED','OUTREACH_SENT','REPLIED','FOLLOW_UP','WON','REJECTED','ARCHIVED')),
	CONSTRAINT "sales_leads_source_type_check" CHECK ("sales"."sales_leads"."source_type" IN ('social_profile','website','directory','websearch','referral','manual')),
	CONSTRAINT "sales_leads_discovered_by_check" CHECK ("sales"."sales_leads"."discovered_by" IN ('agent','human'))
);
--> statement-breakpoint
ALTER TABLE "financial"."credit_purchases" ADD CONSTRAINT "credit_purchases_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial"."credit_purchases" ADD CONSTRAINT "credit_purchases_credit_package_id_fk" FOREIGN KEY ("credit_package_id") REFERENCES "financial"."credit_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial"."customer_credit_ledger" ADD CONSTRAINT "customer_credit_ledger_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial"."production_credit_events" ADD CONSTRAINT "production_credit_events_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestration"."agent_tasks" ADD CONSTRAINT "agent_tasks_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestration"."agent_tasks" ADD CONSTRAINT "agent_tasks_initiated_by_user_id_fk" FOREIGN KEY ("initiated_by_user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestration"."agent_tasks" ADD CONSTRAINT "agent_tasks_parent_task_id_fk" FOREIGN KEY ("parent_task_id","organization_id") REFERENCES "orchestration"."agent_tasks"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestration"."task_approvals" ADD CONSTRAINT "task_approvals_agent_task_id_fk" FOREIGN KEY ("agent_task_id","organization_id") REFERENCES "orchestration"."agent_tasks"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestration"."task_steps" ADD CONSTRAINT "task_steps_agent_task_id_fk" FOREIGN KEY ("agent_task_id","organization_id") REFERENCES "orchestration"."agent_tasks"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestration"."task_steps" ADD CONSTRAINT "task_steps_gate_id_fk" FOREIGN KEY ("gate_id","organization_id") REFERENCES "orchestration"."task_approvals"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestration"."task_steps" ADD CONSTRAINT "task_steps_skill_output_id_fk" FOREIGN KEY ("skill_output_id") REFERENCES "production"."skill_outputs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestration"."task_steps" ADD CONSTRAINT "task_steps_production_job_id_fk" FOREIGN KEY ("production_job_id","organization_id") REFERENCES "production"."production_jobs"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestration"."task_tokens" ADD CONSTRAINT "task_tokens_agent_task_id_fk" FOREIGN KEY ("agent_task_id","organization_id") REFERENCES "orchestration"."agent_tasks"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales"."follow_ups" ADD CONSTRAINT "follow_ups_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "sales"."sales_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales"."follow_ups" ADD CONSTRAINT "follow_ups_outreach_id_fk" FOREIGN KEY ("outreach_id") REFERENCES "sales"."outreach_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales"."lead_sources" ADD CONSTRAINT "lead_sources_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "sales"."sales_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales"."outreach_approvals" ADD CONSTRAINT "outreach_approvals_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "sales"."sales_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales"."outreach_approvals" ADD CONSTRAINT "outreach_approvals_outreach_id_fk" FOREIGN KEY ("outreach_id") REFERENCES "sales"."outreach_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales"."outreach_messages" ADD CONSTRAINT "outreach_messages_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "sales"."sales_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_packages_active_idx" ON "financial"."credit_packages" USING btree ("is_active","display_order");--> statement-breakpoint
CREATE INDEX "credit_purchases_org_idx" ON "financial"."credit_purchases" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "credit_purchases_status_idx" ON "financial"."credit_purchases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "credit_purchases_provider_id_idx" ON "financial"."credit_purchases" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE INDEX "customer_credit_ledger_org_idx" ON "financial"."customer_credit_ledger" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "customer_credit_ledger_entry_type_idx" ON "financial"."customer_credit_ledger" USING btree ("entry_type");--> statement-breakpoint
CREATE INDEX "customer_credit_ledger_reference_idx" ON "financial"."customer_credit_ledger" USING btree ("reference_entity_type","reference_entity_id");--> statement-breakpoint
CREATE INDEX "customer_credit_ledger_created_at_idx" ON "financial"."customer_credit_ledger" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "production_credit_events_org_idx" ON "financial"."production_credit_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "production_credit_events_job_idx" ON "financial"."production_credit_events" USING btree ("production_job_id");--> statement-breakpoint
CREATE INDEX "production_credit_events_warning_idx" ON "financial"."production_credit_events" USING btree ("warning_level");--> statement-breakpoint
CREATE INDEX "production_credit_events_event_type_idx" ON "financial"."production_credit_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "production_credit_events_created_at_idx" ON "financial"."production_credit_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_tasks_org_idx" ON "orchestration"."agent_tasks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "agent_tasks_status_idx" ON "orchestration"."agent_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_tasks_user_idx" ON "orchestration"."agent_tasks" USING btree ("initiated_by_user_id");--> statement-breakpoint
CREATE INDEX "task_approvals_task_idx" ON "orchestration"."task_approvals" USING btree ("agent_task_id");--> statement-breakpoint
CREATE INDEX "task_approvals_org_idx" ON "orchestration"."task_approvals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "task_approvals_status_idx" ON "orchestration"."task_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_steps_task_idx" ON "orchestration"."task_steps" USING btree ("agent_task_id");--> statement-breakpoint
CREATE INDEX "task_steps_org_idx" ON "orchestration"."task_steps" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "task_steps_status_idx" ON "orchestration"."task_steps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_tokens_task_idx" ON "orchestration"."task_tokens" USING btree ("agent_task_id");--> statement-breakpoint
CREATE INDEX "task_tokens_org_idx" ON "orchestration"."task_tokens" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "task_tokens_expires_idx" ON "orchestration"."task_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "follow_ups_lead_idx" ON "sales"."follow_ups" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "follow_ups_scheduled_at_idx" ON "sales"."follow_ups" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "follow_ups_status_idx" ON "sales"."follow_ups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lead_sources_lead_idx" ON "sales"."lead_sources" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_sources_platform_idx" ON "sales"."lead_sources" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "lead_sources_identifier_idx" ON "sales"."lead_sources" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "outreach_approvals_lead_idx" ON "sales"."outreach_approvals" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "outreach_approvals_status_idx" ON "sales"."outreach_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "outreach_approvals_type_idx" ON "sales"."outreach_approvals" USING btree ("approval_type");--> statement-breakpoint
CREATE INDEX "outreach_approvals_requested_at_idx" ON "sales"."outreach_approvals" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX "outreach_messages_lead_idx" ON "sales"."outreach_messages" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "outreach_messages_status_idx" ON "sales"."outreach_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "outreach_messages_channel_idx" ON "sales"."outreach_messages" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "outreach_messages_approval_status_idx" ON "sales"."outreach_messages" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "sales_leads_status_idx" ON "sales"."sales_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sales_leads_priority_idx" ON "sales"."sales_leads" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "sales_leads_score_idx" ON "sales"."sales_leads" USING btree ("lead_score");--> statement-breakpoint
CREATE INDEX "sales_leads_created_at_idx" ON "sales"."sales_leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sales_leads_last_activity_idx" ON "sales"."sales_leads" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "sales_leads_platform_idx" ON "sales"."sales_leads" USING btree ("primary_source_platform");