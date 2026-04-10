DO $$ BEGIN
  CREATE TYPE "reset_request_status" AS ENUM ('pending', 'completed', 'dismissed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "passwordResetRequests" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "email" varchar(320) NOT NULL,
  "status" "reset_request_status" DEFAULT 'pending' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
