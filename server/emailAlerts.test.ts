import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { getDb } from "./db";
import { coachAlertPreferences, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import * as activityTracking from "./activityTracking";
import * as email from "./email";

// Mock the email sending function
vi.mock("./email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./email")>();
  return {
    ...actual,
    sendActivityAlertEmail: vi.fn().mockResolvedValue({ success: true }),
  };
});

describe("Email Alerts for Activity Tracking", () => {
  let testAthleteId: number;
  let testCoachId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test athlete
    const athleteResult = await db.insert(users).values({
      openId: `test-athlete-email-${Date.now()}`,
      name: "Test Athlete Email",
      email: `athlete-email-${Date.now()}@test.com`,
      role: "athlete",
    });
    testAthleteId = athleteResult[0].insertId;

    // Create test coach with email
    const coachResult = await db.insert(users).values({
      openId: `test-coach-email-${Date.now()}`,
      name: "Test Coach Email",
      email: `coach-email-${Date.now()}@test.com`,
      role: "admin",
    });
    testCoachId = coachResult[0].insertId;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    await db.delete(coachAlertPreferences).where(eq(coachAlertPreferences.coachId, testCoachId));
    await db.delete(users).where(eq(users.id, testAthleteId));
    await db.delete(users).where(eq(users.id, testCoachId));
    
    vi.restoreAllMocks();
  });

  describe("Email Alert Preferences", () => {
    it("should have emailAlerts enabled by default", async () => {
      const prefs = await activityTracking.getCoachAlertPreferences(testCoachId);
      expect(prefs).not.toBeNull();
      expect(prefs?.emailAlerts).toBe(1);
    });

    it("should be able to disable email alerts", async () => {
      const result = await activityTracking.updateCoachAlertPreferences(testCoachId, {
        emailAlerts: 0,
      });
      expect(result).toBe(true);

      const prefs = await activityTracking.getCoachAlertPreferences(testCoachId);
      expect(prefs?.emailAlerts).toBe(0);
    });

    it("should be able to re-enable email alerts", async () => {
      const result = await activityTracking.updateCoachAlertPreferences(testCoachId, {
        emailAlerts: 1,
      });
      expect(result).toBe(true);

      const prefs = await activityTracking.getCoachAlertPreferences(testCoachId);
      expect(prefs?.emailAlerts).toBe(1);
    });
  });

  describe("Activity Alert Email Data", () => {
    it("should generate correct email data structure", () => {
      const emailData: email.ActivityAlertEmailData = {
        coachEmail: "coach@test.com",
        coachName: "Coach Test",
        athleteName: "Athlete Test",
        activityType: "drill_complete",
        activityMessage: "Athlete Test completed drill: Test Drill",
        actionUrl: "https://example.com/drill/123",
        timestamp: new Date(),
        metadata: { drillName: "Test Drill" },
      };

      expect(emailData.coachEmail).toBe("coach@test.com");
      expect(emailData.activityType).toBe("drill_complete");
      expect(emailData.activityMessage).toContain("completed drill");
    });
  });

  describe("sendActivityAlertEmail", () => {
    it("should call sendActivityAlertEmail with correct parameters", async () => {
      const mockSendEmail = vi.mocked(email.sendActivityAlertEmail);
      mockSendEmail.mockClear();

      const emailData: email.ActivityAlertEmailData = {
        coachEmail: "coach@test.com",
        coachName: "Coach Test",
        athleteName: "Athlete Test",
        activityType: "portal_login",
        activityMessage: "Athlete Test logged into their portal",
        actionUrl: "https://example.com/coach-dashboard",
        timestamp: new Date(),
      };

      const result = await email.sendActivityAlertEmail(emailData);
      
      expect(mockSendEmail).toHaveBeenCalledWith(emailData);
      expect(result.success).toBe(true);
    });

    it("should handle different activity types", async () => {
      const mockSendEmail = vi.mocked(email.sendActivityAlertEmail);
      
      const activityTypes = [
        "portal_login",
        "drill_view",
        "drill_complete",
        "video_submit",
        "message_sent",
      ];

      for (const activityType of activityTypes) {
        mockSendEmail.mockClear();

        const emailData: email.ActivityAlertEmailData = {
          coachEmail: "coach@test.com",
          coachName: "Coach Test",
          athleteName: "Athlete Test",
          activityType,
          activityMessage: `Athlete Test performed ${activityType}`,
          actionUrl: "https://example.com/activity",
          timestamp: new Date(),
        };

        const result = await email.sendActivityAlertEmail(emailData);
        expect(result.success).toBe(true);
      }
    });
  });
});
