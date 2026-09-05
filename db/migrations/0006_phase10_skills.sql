-- DR 0070: Brief and Campaign content fields (read-only for Phase 10 Skills)
ALTER TABLE "commercial"."briefs" ADD COLUMN "brief_text" text;
--> statement-breakpoint
ALTER TABLE "commercial"."briefs" ADD COLUMN "deliverables" text;
--> statement-breakpoint
ALTER TABLE "commercial"."briefs" ADD COLUMN "target_audience" text;
--> statement-breakpoint
ALTER TABLE "commercial"."briefs" ADD COLUMN "timeline_notes" text;
--> statement-breakpoint
ALTER TABLE "commercial"."briefs" ADD COLUMN "additional_notes" text;
--> statement-breakpoint
ALTER TABLE "commercial"."campaigns" ADD COLUMN "objective" text;
--> statement-breakpoint
ALTER TABLE "commercial"."campaigns" ADD COLUMN "description" text;
--> statement-breakpoint

-- DR 0071: Skill output persistence table
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
ALTER TABLE "production"."skill_outputs"
	ADD CONSTRAINT "skill_outputs_organization_id_fk"
	FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "skill_outputs_org_idx" ON "production"."skill_outputs" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "skill_outputs_org_entity_idx" ON "production"."skill_outputs" USING btree ("organization_id","entity_type","entity_id");
--> statement-breakpoint
CREATE INDEX "skill_outputs_org_skill_idx" ON "production"."skill_outputs" USING btree ("organization_id","skill_id");
--> statement-breakpoint
CREATE INDEX "skill_outputs_status_idx" ON "production"."skill_outputs" USING btree ("status");
