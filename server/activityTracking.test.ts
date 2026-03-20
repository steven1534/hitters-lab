import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { athleteActivity, coachAlertPreferences, users, notifications } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import * as activityTracking from "./activityTracking";

describe("Activity Tracking", { timeout: 30000 }, () => {
  let testAthleteId: number;
  let testCoachId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test athlete
    const athleteResult = await db.insert(users).values({
      openId: `test-athlete-activity-${Date.now()}`,
      name: "Test Athlete Activity",
      email: `athlete-activity-${Date.now()}@test.com`,
      role: "athlete",
    });
    testAthleteId = athleteResult[0].insertId;

    // Create test coach
    const coachResult = await db.insert(users).values({
      openId: `test-coach-activity-${Date.now()}`,
      name: "Test Coach Activity",
      email: `coach-activity-${Date.now()}@test.com`,
      role: "coach",
    });
    testCoachId = coachResult[0].insertId;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    await db.delete(athleteActivity).where(eq(athleteActivity.athleteId, testAthleteId));
    await db.delete(notifications).where(eq(notifications.userId, testCoachId));
    await db.delete(coachAlertPreferences).where(eq(coachAlertPreferences.coachId, testCoachId));
    await db.delete(users).where(eq(users.id, testAthleteId));
    await db.delete(users).where(eq(users.id, testCoachId));
  });

  describe("logActivity", () => {
    it("should log a portal login activity", async () => {
      const result = await activityTracking.logActivity(testAthleteId, "portal_login");
      expect(result).toBe(true);

      // Verify activity was logged
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const activities = await db
        .select()
        .from(athleteActivity)
        .where(
          and(
            eq(athleteActivity.athleteId, testAthleteId),
            eq(athleteActivity.activityType, "portal_login")
          )
        )
        .orderBy(desc(athleteActivity.createdAt))
        .limit(1);

      expect(activities.length).toBe(1);
      expect(activities[0].activityType).toBe("portal_login");
    });

    it("should log a drill view activity with metadata", async () => {
      const result = await activityTracking.logActivity(testAthleteId, "drill_view", {
        relatedId: "drill-123",
        relatedType: "drill",
        metadata: { drillName: "Test Drill" },
      });
      expect(result).toBe(true);

      // Verify activity was logged
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const activities = await db
        .select()
        .from(athleteActivity)
        .where(
          and(
            eq(athleteActivity.athleteId, testAthleteId),
            eq(athleteActivity.activityType, "drill_view")
          )
        )
        .orderBy(desc(athleteActivity.createdAt))
        .limit(1);

      expect(activities.length).toBe(1);
      expect(activities[0].relatedId).toBe("drill-123");
      expect(activities[0].relatedType).toBe("drill");
    });

    it("should log a drill complete activity", async () => {
      const result = await activityTracking.logActivity(testAthleteId, "drill_complete", {
        relatedId: "drill-456",
        relatedType: "drill",
        metadata: { drillName: "Completed Drill" },
      });
      expect(result).toBe(true);
    });

    it("should log a video submit activity", async () => {
      const result = await activityTracking.logActivity(testAthleteId, "video_submit", {
        relatedId: "submission-789",
        relatedType: "submission",
        metadata: { drillName: "Video Drill" },
      });
      expect(result).toBe(true);
    });
  });

  describe("getRecentActivities", () => {
    it("should return recent activities", async () => {
      const activities = await activityTracking.getRecentActivities(10);
      expect(Array.isArray(activities)).toBe(true);
      // Should have at least the activities we logged
      expect(activities.length).toBeGreaterThanOrEqual(1);
    });

    it("should respect the limit parameter", async () => {
      const activities = await activityTracking.getRecentActivities(2);
      expect(activities.length).toBeLessThanOrEqual(2);
    });
  });

  describe("getAthleteActivities", () => {
    it("should return activities for a specific athlete", async () => {
      const activities = await activityTracking.getAthleteActivities(testAthleteId);
      expect(Array.isArray(activities)).toBe(true);
      // All activities should belong to the test athlete
      activities.forEach((activity) => {
        expect(activity.athleteId).toBe(testAthleteId);
      });
    });
  });

  describe("getActivitySummary", () => {
    it("should return activity summary stats", async () => {
      const summary = await activityTracking.getActivitySummary();
      expect(summary).toHaveProperty("activeAthletesToday");
      expect(summary).toHaveProperty("drillsViewedToday");
      expect(summary).toHaveProperty("drillsCompletedToday");
      expect(summary).toHaveProperty("videosSubmittedToday");
      expect(summary).toHaveProperty("messagesReceivedToday");
      // All values should be numbers
      expect(typeof summary.activeAthletesToday).toBe("number");
      expect(typeof summary.drillsViewedToday).toBe("number");
    });
  });

  describe("Coach Alert Preferences", () => {
    it("should create default preferences for a coach", async () => {
      const prefs = await activityTracking.getCoachAlertPreferences(testCoachId);
      expect(prefs).not.toBeNull();
      expect(prefs?.coachId).toBe(testCoachId);
      // Default values should be 1 (enabled)
      expect(prefs?.alertOnPortalLogin).toBe(1);
      expect(prefs?.alertOnDrillView).toBe(1);
      expect(prefs?.inAppAlerts).toBe(1);
    });

    it("should update coach alert preferences", async () => {
      const result = await activityTracking.updateCoachAlertPreferences(testCoachId, {
        alertOnPortalLogin: 0,
        alertOnDrillView: 0,
      });
      expect(result).toBe(true);

      const prefs = await activityTracking.getCoachAlertPreferences(testCoachId);
      expect(prefs?.alertOnPortalLogin).toBe(0);
      expect(prefs?.alertOnDrillView).toBe(0);
      // Other preferences should remain unchanged
      expect(prefs?.alertOnDrillComplete).toBe(1);
    });
  });

  describe("getInactiveAthletes", () => {
    it("should return inactive athletes", async () => {
      const inactive = await activityTracking.getInactiveAthletes(3);
      expect(Array.isArray(inactive)).toBe(true);
      // Each inactive athlete should have the expected properties
      inactive.forEach((athlete) => {
        expect(athlete).toHaveProperty("id");
        expect(athlete).toHaveProperty("name");
        expect(athlete).toHaveProperty("lastSeen");
      });
    });
  });
});
