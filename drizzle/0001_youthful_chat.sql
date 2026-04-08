DO $$ BEGIN ALTER TYPE "public"."role" ADD VALUE 'parent'; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parentChildren" (
	"id" serial PRIMARY KEY NOT NULL,
	"parentId" integer NOT NULL,
	"childId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "playerReports" (
	"id" serial PRIMARY KEY NOT NULL,
	"athleteId" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"reportDate" timestamp NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "athleteProfiles" ADD COLUMN "coachProfileNotes" text; EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "invites" ADD COLUMN "name" varchar(255); EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "videoAnalysis" ADD COLUMN "swingType" varchar(50); EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "videoAnalysis" ADD COLUMN "drillId" varchar(255); EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "videoAnalysis" ADD COLUMN "isStandalone" integer DEFAULT 0; EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "videoAnalysis" ADD COLUMN "athleteNotes" text; EXCEPTION WHEN duplicate_column THEN null; END $$;
