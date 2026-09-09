CREATE TABLE "core"."brand_dna" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"brand_name" text,
	"brand_voice" text,
	"visual_guidelines_summary" text,
	"target_audience" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_dna_org_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
ALTER TABLE "identity"."users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "core"."brand_dna" ADD CONSTRAINT "brand_dna_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_dna_org_idx" ON "core"."brand_dna" USING btree ("organization_id");