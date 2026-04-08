DO $$ BEGIN ALTER TABLE "drillDetails" ADD COLUMN "tags" json; EXCEPTION WHEN duplicate_column THEN null; END $$;
