import { describe, it, expect } from "vitest";
import * as db from "./db";
import fs from "fs";
import path from "path";

describe("Direct Bulk Import from Complete Backup Files", { timeout: 30000 }, () => {
  it("should import all 92 drill descriptions and 72 goals from complete backup files", async () => {
    // Read the complete backup files
    const descriptionsPath = path.join("/home/ubuntu/upload", "Hittingdrillsanddescriptions");
    const goalsPath = path.join("/home/ubuntu/upload", "HiddenDrillGoldDescriptions.json");

    const descriptions = JSON.parse(fs.readFileSync(descriptionsPath, "utf-8"));
    const goals = JSON.parse(fs.readFileSync(goalsPath, "utf-8"));

    console.log(`\n📥 Loaded ${descriptions.length} descriptions and ${goals.length} goals`);

    // Import descriptions
    const descResult = await db.bulkImportDrillDescriptions(descriptions);
    console.log(`✓ Descriptions imported: ${descResult.success} success, ${descResult.failed} failed`);
    
    if (descResult.errors.length > 0) {
      console.log("  Errors:", descResult.errors.slice(0, 3));
    }

    // Import goals
    const goalsResult = await db.bulkImportDrillGoals(goals);
    console.log(`✓ Goals imported: ${goalsResult.success} success, ${goalsResult.failed} failed`);
    
    if (goalsResult.errors.length > 0) {
      console.log("  Errors:", goalsResult.errors.slice(0, 3));
    }

    // Verify results
    expect(descResult.success).toBeGreaterThan(0);
    expect(goalsResult.success).toBeGreaterThan(0);
    
    console.log(`\n✅ Import complete! Total: ${descResult.success + goalsResult.success} records imported`);
  }, 30000);
});
