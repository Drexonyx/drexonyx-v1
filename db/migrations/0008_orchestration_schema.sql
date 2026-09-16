CREATE SCHEMA IF NOT EXISTS "orchestration";
--> statement-breakpoint
CREATE TABLE "orchestration"."agent_tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
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
	CONSTRAINT "agent_tasks_status_check" CHECK ("orchestration"."agent_tasks"."status" IN ('PENDING','PLANNING','AWAITING_APPROVAL','RUNNING','COMPLETED','FAILED','CANCELLED')),
	CONSTRAINT "agent_tasks_initiator_role_check" CHECK ("orchestration"."agent_tasks"."initiator_role" IN ('OWNER','ADMIN_OPERATIONS','CREATIVE_PRODUCTION','QC')),
	CONSTRAINT "agent_tasks_intent_type_check" CHECK ("orchestration"."agent_tasks"."intent_type" IN ('BATCH_QC_REVIEW','BATCH_UPLOAD_REVIEW','PROMPT_OPTIMIZE','BATCH_COORDINATE'))
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
	CONSTRAINT "task_approvals_status_check" CHECK ("orchestration"."task_approvals"."status" IN ('PENDING','APPROVED','REJECTED','EXPIRED','CANCELLED')),
	CONSTRAINT "task_approvals_approver_role_check" CHECK ("orchestration"."task_approvals"."approver_role" IN ('OWNER','ADMIN_OPERATIONS'))
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
	CONSTRAINT "task_steps_status_check" CHECK ("orchestration"."task_steps"."status" IN ('PENDING','RUNNING','SUCCEEDED','FAILED','SKIPPED','CANCELLED')),
	CONSTRAINT "task_steps_step_type_check" CHECK ("orchestration"."task_steps"."step_type" IN ('SKILL','HUMAN_GATE'))
);
--> statement-breakpoint
ALTER TABLE "orchestration"."agent_tasks" ADD CONSTRAINT "agent_tasks_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestration"."agent_tasks" ADD CONSTRAINT "agent_tasks_initiated_by_user_id_fk" FOREIGN KEY ("initiated_by_user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestration"."agent_tasks" ADD CONSTRAINT "agent_tasks_id_org_unique" UNIQUE("id","organization_id");--> statement-breakpoint
ALTER TABLE "orchestration"."task_approvals" ADD CONSTRAINT "task_approvals_agent_task_id_fk" FOREIGN KEY ("agent_task_id","organization_id") REFERENCES "orchestration"."agent_tasks"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestration"."task_approvals" ADD CONSTRAINT "task_approvals_id_org_unique" UNIQUE("id","organization_id");--> statement-breakpoint
ALTER TABLE "orchestration"."task_steps" ADD CONSTRAINT "task_steps_agent_task_id_fk" FOREIGN KEY ("agent_task_id","organization_id") REFERENCES "orchestration"."agent_tasks"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestration"."task_steps" ADD CONSTRAINT "task_steps_gate_id_fk" FOREIGN KEY ("gate_id","organization_id") REFERENCES "orchestration"."task_approvals"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestration"."task_steps" ADD CONSTRAINT "task_steps_skill_output_id_fk" FOREIGN KEY ("skill_output_id") REFERENCES "production"."skill_outputs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestration"."task_steps" ADD CONSTRAINT "task_steps_production_job_id_fk" FOREIGN KEY ("production_job_id","organization_id") REFERENCES "production"."production_jobs"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestration"."task_steps" ADD CONSTRAINT "task_steps_task_step_unique" UNIQUE("agent_task_id","step_index");--> statement-breakpoint
CREATE INDEX "agent_tasks_org_idx" ON "orchestration"."agent_tasks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "agent_tasks_status_idx" ON "orchestration"."agent_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_tasks_user_idx" ON "orchestration"."agent_tasks" USING btree ("initiated_by_user_id");--> statement-breakpoint
CREATE INDEX "task_approvals_task_idx" ON "orchestration"."task_approvals" USING btree ("agent_task_id");--> statement-breakpoint
CREATE INDEX "task_approvals_org_idx" ON "orchestration"."task_approvals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "task_approvals_status_idx" ON "orchestration"."task_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_steps_task_idx" ON "orchestration"."task_steps" USING btree ("agent_task_id");--> statement-breakpoint
CREATE INDEX "task_steps_org_idx" ON "orchestration"."task_steps" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "task_steps_status_idx" ON "orchestration"."task_steps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_events_org_entity_created_at_idx" ON "system"."audit_events" USING btree ("organization_id","entity_type","created_at");
