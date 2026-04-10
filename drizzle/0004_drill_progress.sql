CREATE TABLE IF NOT EXISTS "drillProgress" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "drillId" varchar(128) NOT NULL,
  "completedAt" timestamp DEFAULT now() NOT NULL,
  "notes" text,
  "rating" integer
);
