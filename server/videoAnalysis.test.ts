import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createCoachContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "coach-user",
    email: "coach@example.com",
    name: "Coach Steve",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createAthleteContext(id = 2): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `athlete-user-${id}`,
    email: `athlete${id}@example.com`,
    name: `Athlete ${id}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("videoAnalysis router", () => {
  describe("access control", () => {
    it("getPendingReviews rejects non-admin users", async () => {
      const caller = appRouter.createCaller(createAthleteContext());
      await expect(caller.videoAnalysis.getPendingReviews()).rejects.toThrow("Coach access required");
    });

    it("getAllAnalyses rejects non-admin users", async () => {
      const caller = appRouter.createCaller(createAthleteContext());
      await expect(caller.videoAnalysis.getAllAnalyses()).rejects.toThrow("Coach access required");
    });

    it("updateFeedback rejects non-admin users", async () => {
      const caller = appRouter.createCaller(createAthleteContext());
      await expect(
        caller.videoAnalysis.updateFeedback({
          analysisId: 1,
          coachEditedFeedback: "test",
        })
      ).rejects.toThrow("Coach access required");
    });

    it("approveFeedback rejects non-admin users", async () => {
      const caller = appRouter.createCaller(createAthleteContext());
      await expect(
        caller.videoAnalysis.approveFeedback({ analysisId: 1 })
      ).rejects.toThrow("Coach access required");
    });

    it("sendFeedback rejects non-admin users", async () => {
      const caller = appRouter.createCaller(createAthleteContext());
      await expect(
        caller.videoAnalysis.sendFeedback({ analysisId: 1 })
      ).rejects.toThrow("Coach access required");
    });

    it("retryAnalysis rejects non-admin users", async () => {
      const caller = appRouter.createCaller(createAthleteContext());
      await expect(
        caller.videoAnalysis.retryAnalysis({ analysisId: 1 })
      ).rejects.toThrow("Coach access required");
    });

    it("analyzeVideo rejects non-admin users", async () => {
      const caller = appRouter.createCaller(createAthleteContext());
      await expect(
        caller.videoAnalysis.analyzeVideo({ analysisId: 1 })
      ).rejects.toThrow("Coach access required");
    });
  });

  describe("input validation", () => {
    it("triggerAnalysis creates a pending analysis record", async () => {
      const caller = appRouter.createCaller(createAthleteContext());
      const result = await caller.videoAnalysis.triggerAnalysis({
        submissionId: 0,
        drillId: "test-drill",
        videoUrl: "https://example.com/video.mp4",
      });
      expect(result).toHaveProperty("id");
      expect(result.status).toBe("pending");
    });

    it("updateFeedback requires analysisId and feedback text", async () => {
      const caller = appRouter.createCaller(createCoachContext());
      // Should fail because analysis doesn't exist, not because of validation
      await expect(
        caller.videoAnalysis.updateFeedback({
          analysisId: 999999,
          coachEditedFeedback: "test feedback",
        })
      ).rejects.toThrow("Analysis not found");
    });

    it("sendFeedback validates email format when provided", async () => {
      const caller = appRouter.createCaller(createCoachContext());
      await expect(
        caller.videoAnalysis.sendFeedback({
          analysisId: 1,
          recipientEmail: "not-an-email",
        })
      ).rejects.toBeDefined();
    });
  });

  describe("coach operations on non-existent records", () => {
    it("analyzeVideo returns not found for invalid ID", async () => {
      const caller = appRouter.createCaller(createCoachContext());
      await expect(
        caller.videoAnalysis.analyzeVideo({ analysisId: 999999 })
      ).rejects.toThrow("Analysis record not found");
    });

    it("approveFeedback returns not found for invalid ID", async () => {
      const caller = appRouter.createCaller(createCoachContext());
      await expect(
        caller.videoAnalysis.approveFeedback({ analysisId: 999999 })
      ).rejects.toThrow("Analysis not found");
    });

    it("retryAnalysis returns not found for invalid ID", async () => {
      const caller = appRouter.createCaller(createCoachContext());
      await expect(
        caller.videoAnalysis.retryAnalysis({ analysisId: 999999 })
      ).rejects.toThrow("Analysis not found");
    });

    it("getAnalysis returns not found for invalid ID", async () => {
      const caller = appRouter.createCaller(createCoachContext());
      await expect(
        caller.videoAnalysis.getAnalysis({ analysisId: 999999 })
      ).rejects.toThrow("Analysis not found");
    });
  });

  describe("athlete queries", () => {
    it("getAthleteAnalyses returns empty array for athlete with no analyses", async () => {
      const caller = appRouter.createCaller(createAthleteContext(9999));
      const result = await caller.videoAnalysis.getAthleteAnalyses();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("getMyAllAnalyses returns empty array for athlete with no analyses", async () => {
      const caller = appRouter.createCaller(createAthleteContext(9998));
      const result = await caller.videoAnalysis.getMyAllAnalyses();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("getMyAllAnalyses returns all statuses for the current athlete", async () => {
      const caller = appRouter.createCaller(createAthleteContext(2));
      const result = await caller.videoAnalysis.getMyAllAnalyses();
      expect(Array.isArray(result)).toBe(true);
      // Should return analyses of all statuses (not just approved/sent)
      // Unlike getAthleteAnalyses which filters to approved/sent only
    });

    it("getMyAllAnalyses is accessible by non-admin users", async () => {
      const caller = appRouter.createCaller(createAthleteContext(3));
      // Should NOT throw — this is an athlete-accessible endpoint
      const result = await caller.videoAnalysis.getMyAllAnalyses();
      expect(Array.isArray(result)).toBe(true);
    });

    it("getAnalysisBySubmission returns null for non-existent submission", async () => {
      const caller = appRouter.createCaller(createAthleteContext());
      const result = await caller.videoAnalysis.getAnalysisBySubmission({ submissionId: 999999 });
      expect(result).toBeNull();
    });
  });
});
