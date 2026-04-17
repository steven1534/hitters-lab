CREATE TABLE IF NOT EXISTS "weeklyChallenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"targetCount" integer DEFAULT 5 NOT NULL,
	"drillCategory" varchar(128),
	"startsAt" timestamp NOT NULL,
	"endsAt" timestamp NOT NULL,
	"createdByUserId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
