-- DR 0043: Add estimated_cost (nullable) to commercial.quotes.
-- DR 0043: Add currency (text NOT NULL DEFAULT 'USD') to commercial.quotes.
-- DR 0043: Create commercial.pricing_configs (org-level margin thresholds).

ALTER TABLE "commercial"."quotes" ADD COLUMN "estimated_cost" numeric(19, 4);
--> statement-breakpoint
ALTER TABLE "commercial"."quotes" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;
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
ALTER TABLE "commercial"."pricing_configs" ADD CONSTRAINT "pricing_configs_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "pricing_configs_org_idx" ON "commercial"."pricing_configs" USING btree ("organization_id");
