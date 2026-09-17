-- Phase 2: Specialist agent sub-task delegation (parent_task_id on agent_tasks)
ALTER TABLE "orchestration"."agent_tasks" ADD COLUMN "parent_task_id" uuid;
--> statement-breakpoint
ALTER TABLE "orchestration"."agent_tasks" ADD CONSTRAINT "agent_tasks_parent_task_id_fk" FOREIGN KEY ("parent_task_id","organization_id") REFERENCES "orchestration"."agent_tasks"("id","organization_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Phase 2: Extend step_type CHECK constraint to include new step types
ALTER TABLE "orchestration"."task_steps" DROP CONSTRAINT "task_steps_step_type_check";
--> statement-breakpoint
ALTER TABLE "orchestration"."task_steps" ADD CONSTRAINT "task_steps_step_type_check" CHECK ("orchestration"."task_steps"."step_type" IN ('SKILL','HUMAN_GATE','FINANCIAL_CHECK','PRODUCTION_JOB','STATUS_TRANSITION','QC_GATE','NOTIFICATION','VERIFY'));
--> statement-breakpoint

-- Phase 2: Extend task_approvals approver_role to include QC (for QC_GATE step type)
ALTER TABLE "orchestration"."task_approvals" DROP CONSTRAINT "task_approvals_approver_role_check";
--> statement-breakpoint
ALTER TABLE "orchestration"."task_approvals" ADD CONSTRAINT "task_approvals_approver_role_check" CHECK ("orchestration"."task_approvals"."approver_role" IN ('OWNER','ADMIN_OPERATIONS','QC'));
--> statement-breakpoint

-- Phase 2: Task-scoped service tokens (4-hour lifetime for specialist agent access)
CREATE TABLE "orchestration"."task_tokens" (
  "id" uuid PRIMARY KEY NOT NULL,
  "agent_task_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orchestration"."task_tokens" ADD CONSTRAINT "task_tokens_agent_task_id_fk" FOREIGN KEY ("agent_task_id","organization_id") REFERENCES "orchestration"."agent_tasks"("id","organization_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "orchestration"."task_tokens" ADD CONSTRAINT "task_tokens_id_org_unique" UNIQUE("id","organization_id");
--> statement-breakpoint
CREATE INDEX "task_tokens_task_idx" ON "orchestration"."task_tokens" USING btree ("agent_task_id");
--> statement-breakpoint
CREATE INDEX "task_tokens_org_idx" ON "orchestration"."task_tokens" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "task_tokens_expires_idx" ON "orchestration"."task_tokens" USING btree ("expires_at");
