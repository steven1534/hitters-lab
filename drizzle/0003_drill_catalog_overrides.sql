CREATE TABLE IF NOT EXISTS "drillCatalogOverrides" (
	"drillId" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(500),
	"difficulty" varchar(50),
	"categories" json,
	"duration" varchar(50),
	"tags" json,
	"externalUrl" text,
	"hiddenFromDirectory" integer DEFAULT 0 NOT NULL,
	"updatedBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
