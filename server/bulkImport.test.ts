import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";
import { getDb } from "./db";

describe("Bulk Import Functions", () => {
  let database: any;

  beforeAll(async () => {
    database = await getDb();
  });

  it("should import drill descriptions", async () => {
    const testData = [
      {
        drillName: "Test Drill 1",
        description: "This is a test drill description",
      },
      {
        drillName: "Test Drill 2",
        description: "Another test drill description",
      },
    ];

    const result = await db.bulkImportDrillDescriptions(testData);

    expect(result.success).toBeGreaterThan(0);
    expect(result.failed).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it("should import drill goals", async () => {
    const testData = [
      {
        drillName: "Test Drill 1",
        goal: "To improve hitting technique",
      },
      {
        drillName: "Test Drill 2",
        goal: "To build strength and endurance",
      },
    ];

    const result = await db.bulkImportDrillGoals(testData);

    expect(result.success).toBeGreaterThan(0);
    expect(result.failed).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it("should handle empty data gracefully", async () => {
    const result = await db.bulkImportDrillDescriptions([]);

    expect(result.success).toBe(0);
    expect(result.failed).toBe(0);
  });
});
