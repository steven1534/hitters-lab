-- Add coach-authored "plan context" to athleteProfiles:
--   weeklyFocus           — short directive shown at top of My Plan
--   weeklyFocusUpdatedAt  — used to surface staleness ("set 3 days ago")
--   activePathwayId       — slug pointer into the static PATHWAYS list
ALTER TABLE "athleteProfiles" ADD COLUMN IF NOT EXISTS "weeklyFocus" text;
ALTER TABLE "athleteProfiles" ADD COLUMN IF NOT EXISTS "weeklyFocusUpdatedAt" timestamp;
ALTER TABLE "athleteProfiles" ADD COLUMN IF NOT EXISTS "activePathwayId" varchar(255);
