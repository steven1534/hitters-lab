-- Routines: ordered drill sequences authored by coach, assignable to athletes
CREATE TYPE "routine_status" AS ENUM ('active', 'paused', 'completed');

CREATE TABLE "routines" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "durationMinutes" integer,
  "equipment" text,
  "location" varchar(100),
  "routineType" varchar(100),
  "createdBy" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "routineDrills" (
  "id" serial PRIMARY KEY NOT NULL,
  "routineId" integer NOT NULL,
  "drillId" varchar(255) NOT NULL,
  "drillName" varchar(255) NOT NULL,
  "orderIndex" integer NOT NULL,
  "durationSeconds" integer,
  "reps" integer,
  "sets" integer,
  "coachNotes" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "routineAssignments" (
  "id" serial PRIMARY KEY NOT NULL,
  "routineId" integer NOT NULL,
  "userId" integer NOT NULL,
  "frequency" varchar(100),
  "status" "routine_status" DEFAULT 'active' NOT NULL,
  "assignedAt" timestamp DEFAULT now() NOT NULL,
  "completedAt" timestamp
);
