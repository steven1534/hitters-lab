-- Routines: ordered drill sequences a coach can author once and assign to
-- athletes. We reuse the existing drillAssignments table as the single source
-- of truth for "what is assigned" — a routine assignment is just a batch of
-- drillAssignments rows that share a routineId + an explicit routineOrder.

CREATE TABLE IF NOT EXISTS "routines" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "durationMinutes" integer,
  "equipment" json,
  "space" varchar(64),
  "skillFocus" varchar(255),
  "createdBy" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "routineDrills" (
  "id" serial PRIMARY KEY NOT NULL,
  "routineId" integer NOT NULL,
  "drillId" varchar(255) NOT NULL,
  "order" integer NOT NULL,
  "repsOrDuration" varchar(64),
  "note" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "routineDrills_routineId_idx" ON "routineDrills" ("routineId");

-- Extend drillAssignments so routine-assigned drills carry their routine
-- context. Both columns are nullable: standalone (ad-hoc) assignments leave
-- them null.
ALTER TABLE "drillAssignments" ADD COLUMN IF NOT EXISTS "routineId" integer;
ALTER TABLE "drillAssignments" ADD COLUMN IF NOT EXISTS "routineOrder" integer;

CREATE INDEX IF NOT EXISTS "drillAssignments_routineId_idx" ON "drillAssignments" ("routineId");
