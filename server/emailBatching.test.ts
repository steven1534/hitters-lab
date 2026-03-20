import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq, and } from "drizzle-orm";
import { pendingEmailAlerts, users } from "../drizzle/schema";
import { getDb } from "./db";
import { queueActivityAlert, processPendingBatches } from "./emailBatching";

describe("Email Batching", () => {
  let testCoachId: number;
  let testAthleteId: number;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test coach
    const coachResult = await db.insert(users).values({
      openId: `test-coach-batch-${Date.now()}`,
      name: "Test Coach Batch",
      email: "testcoachbatch@example.com",
      role: "admin",
      isActiveClient: 1,
    });
    testCoachId = coachResult[0].insertId;

    // Create test athlete
    const athleteResult = await db.insert(users).values({
      openId: `test-athlete-batch-${Date.now()}`,
      name: "Test Athlete Batch",
      email: "testathletebatch@example.com",
      role: "athlete",
      isActiveClient: 1,
    });
    testAthleteId = athleteResult[0].insertId;
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    if (testCoachId) {
      await db.delete(pendingEmailAlerts).where(eq(pendingEmailAlerts.coachId, testCoachId));
      await db.delete(users).where(eq(users.id, testCoachId));
    }
    if (testAthleteId) {
      await db.delete(users).where(eq(users.id, testAthleteId));
    }
  });

  it("should queue an activity alert successfully", async () => {
    const result = await queueActivityAlert(
      testCoachId,
      testAthleteId,
      "Test Athlete Batch",
      "portal_login",
      "Test Athlete Batch logged into their portal",
      "/activity-feed",
      { test: true }
    );

    expect(result).toBe(true);

    // Verify alert was queued
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const alerts = await db.select()
      .from(pendingEmailAlerts)
      .where(
        and(
          eq(pendingEmailAlerts.coachId, testCoachId),
          eq(pendingEmailAlerts.athleteId, testAthleteId)
        )
      );

    expect(alerts.length).toBe(1);
    expect(alerts[0].activityType).toBe("portal_login");
    expect(alerts[0].isSent).toBe(0);
  });

  it("should group multiple activities under the same batch key", async () => {
    // Queue multiple activities rapidly
    await queueActivityAlert(
      testCoachId,
      testAthleteId,
      "Test Athlete Batch",
      "portal_login",
      "Test Athlete Batch logged into their portal",
      "/activity-feed"
    );

    await queueActivityAlert(
      testCoachId,
      testAthleteId,
      "Test Athlete Batch",
      "drill_view",
      "Test Athlete Batch viewed drill: Test Drill",
      "/drill/1"
    );

    await queueActivityAlert(
      testCoachId,
      testAthleteId,
      "Test Athlete Batch",
      "drill_complete",
      "Test Athlete Batch completed drill: Test Drill",
      "/drill/1"
    );

    // Verify all alerts are queued with same batch key
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const alerts = await db.select()
      .from(pendingEmailAlerts)
      .where(
        and(
          eq(pendingEmailAlerts.coachId, testCoachId),
          eq(pendingEmailAlerts.athleteId, testAthleteId),
          eq(pendingEmailAlerts.isSent, 0)
        )
      );

    expect(alerts.length).toBe(3);
    
    // All should have the same batch key
    const batchKeys = new Set(alerts.map(a => a.batchKey));
    expect(batchKeys.size).toBe(1);
    expect(alerts[0].batchKey).toBe(`coach_${testCoachId}_athlete_${testAthleteId}`);
  });

  it("should use the same scheduledSendAt for activities in the same batch", async () => {
    // Queue first activity
    await queueActivityAlert(
      testCoachId,
      testAthleteId,
      "Test Athlete Batch",
      "portal_login",
      "Test Athlete Batch logged into their portal",
      "/activity-feed"
    );

    // Wait a bit and queue second activity
    await new Promise(resolve => setTimeout(resolve, 100));

    await queueActivityAlert(
      testCoachId,
      testAthleteId,
      "Test Athlete Batch",
      "drill_view",
      "Test Athlete Batch viewed drill: Test Drill",
      "/drill/1"
    );

    // Verify both have the same scheduledSendAt (from the first alert)
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const alerts = await db.select()
      .from(pendingEmailAlerts)
      .where(
        and(
          eq(pendingEmailAlerts.coachId, testCoachId),
          eq(pendingEmailAlerts.athleteId, testAthleteId),
          eq(pendingEmailAlerts.isSent, 0)
        )
      );

    expect(alerts.length).toBe(2);
    expect(alerts[0].scheduledSendAt.getTime()).toBe(alerts[1].scheduledSendAt.getTime());
  });

  it("should not process alerts that are not yet due", async () => {
    // Queue an activity (scheduled 5 minutes in the future)
    await queueActivityAlert(
      testCoachId,
      testAthleteId,
      "Test Athlete Batch",
      "portal_login",
      "Test Athlete Batch logged into their portal",
      "/activity-feed"
    );

    // Process pending batches (should not process this one since it's not due)
    const processedCount = await processPendingBatches();

    // The alert we just queued should still be pending (not processed)
    // because it's scheduled 5 minutes in the future
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const alerts = await db.select()
      .from(pendingEmailAlerts)
      .where(
        and(
          eq(pendingEmailAlerts.coachId, testCoachId),
          eq(pendingEmailAlerts.athleteId, testAthleteId)
        )
      );

    expect(alerts.length).toBe(1);
    expect(alerts[0].isSent).toBe(0); // Still pending
  });
});
