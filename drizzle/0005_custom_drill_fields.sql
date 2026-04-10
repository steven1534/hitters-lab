-- Expand customDrills with Manus-style coaching fields
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "purpose" text;
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "bestFor" text;
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "equipment" text;
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "athletes" text;
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "description" json;
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "videoUrl" text;
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "drillType" varchar(100) DEFAULT 'Tee Work';
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "drillTypeRaw" varchar(100);
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "skillSet" varchar(100) DEFAULT 'Hitting';
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "ageLevel" json;
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "tags" json;
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "problem" json;
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "goalTags" json;
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "whatThisFixes" json;
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "whatToFeel" json;
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "commonMistakes" json;
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "coachCue" text;
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "watchFor" text;
ALTER TABLE "customDrills" ADD COLUMN IF NOT EXISTS "nextSteps" json;

-- Expand drillCatalogOverrides with coaching field overrides
ALTER TABLE "drillCatalogOverrides" ADD COLUMN IF NOT EXISTS "purpose" text;
ALTER TABLE "drillCatalogOverrides" ADD COLUMN IF NOT EXISTS "bestFor" text;
ALTER TABLE "drillCatalogOverrides" ADD COLUMN IF NOT EXISTS "equipment" text;
ALTER TABLE "drillCatalogOverrides" ADD COLUMN IF NOT EXISTS "coachCue" text;
ALTER TABLE "drillCatalogOverrides" ADD COLUMN IF NOT EXISTS "watchFor" text;
ALTER TABLE "drillCatalogOverrides" ADD COLUMN IF NOT EXISTS "whatThisFixes" json;
ALTER TABLE "drillCatalogOverrides" ADD COLUMN IF NOT EXISTS "whatToFeel" json;
ALTER TABLE "drillCatalogOverrides" ADD COLUMN IF NOT EXISTS "commonMistakes" json;
