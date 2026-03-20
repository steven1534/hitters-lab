import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createCoachContext(userId = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "coach-open-id",
    email: "coach@example.com",
    name: "Coach Steve",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createAthleteContext(userId = 100): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "athlete-open-id",
    email: "athlete@example.com",
    name: "Test Athlete",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("athleteProfiles router", () => {
  describe("get", () => {
    it("allows a coach to query any athlete profile", async () => {
      const { ctx } = createCoachContext();
      const caller = appRouter.createCaller(ctx);

      // This should not throw FORBIDDEN — the coach has admin role
      // It may return null if the user doesn't exist in DB, but the access check passes
      try {
        const result = await caller.athleteProfiles.get({ userId: 999 });
        // Result can be null if user doesn't exist
        expect(result === null || typeof result === "object").toBe(true);
      } catch (err: any) {
        // If it throws, it should NOT be FORBIDDEN
        expect(err.code).not.toBe("FORBIDDEN");
      }
    });

    it("allows an athlete to query their own profile", async () => {
      const { ctx } = createAthleteContext(100);
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.athleteProfiles.get({ userId: 100 });
        expect(result === null || typeof result === "object").toBe(true);
      } catch (err: any) {
        expect(err.code).not.toBe("FORBIDDEN");
      }
    });

    it("denies an athlete from viewing another athlete's profile", async () => {
      const { ctx } = createAthleteContext(100);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.athleteProfiles.get({ userId: 200 });
        // If it didn't throw, that's unexpected
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("getMyProfile", () => {
    it("returns the caller's own profile", async () => {
      const { ctx } = createAthleteContext(100);
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.athleteProfiles.getMyProfile();
        // May be null if user doesn't exist in DB
        expect(result === null || typeof result === "object").toBe(true);
      } catch (err: any) {
        // Should not throw FORBIDDEN
        expect(err.code).not.toBe("FORBIDDEN");
      }
    });
  });

  describe("update", () => {
    it("denies an athlete from updating another athlete's profile", async () => {
      const { ctx } = createAthleteContext(100);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.athleteProfiles.update({
          userId: 200,
          parentName: "Unauthorized Parent",
        });
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err.code).toBe("FORBIDDEN");
      }
    });

    it("validates bats enum correctly", async () => {
      const { ctx } = createCoachContext();
      const caller = appRouter.createCaller(ctx);

      // Invalid enum value should fail validation
      try {
        await caller.athleteProfiles.update({
          userId: 999,
          bats: "X" as any,
        });
        expect(true).toBe(false);
      } catch (err: any) {
        // Should be a validation error (BAD_REQUEST)
        expect(err.code).toBe("BAD_REQUEST");
      }
    });

    it("validates throws enum correctly", async () => {
      const { ctx } = createCoachContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.athleteProfiles.update({
          userId: 999,
          throws: "X" as any,
        });
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err.code).toBe("BAD_REQUEST");
      }
    });
  });

  describe("getParentEmail", () => {
    it("denies non-coach access", async () => {
      const { ctx } = createAthleteContext(100);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.athleteProfiles.getParentEmail({ userId: 100 });
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err.code).toBe("FORBIDDEN");
      }
    });

    it("allows coach access", async () => {
      const { ctx } = createCoachContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.athleteProfiles.getParentEmail({ userId: 999 });
        // May be null if no profile exists
        expect(result === null || typeof result === "string").toBe(true);
      } catch (err: any) {
        // Should not be FORBIDDEN
        expect(err.code).not.toBe("FORBIDDEN");
      }
    });
  });

  describe("getBulk", () => {
    it("denies non-coach access", async () => {
      const { ctx } = createAthleteContext(100);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.athleteProfiles.getBulk({ userIds: [1, 2, 3] });
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err.code).toBe("FORBIDDEN");
      }
    });

    it("allows coach to fetch bulk profiles", async () => {
      const { ctx } = createCoachContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.athleteProfiles.getBulk({ userIds: [] });
        expect(Array.isArray(result)).toBe(true);
      } catch (err: any) {
        expect(err.code).not.toBe("FORBIDDEN");
      }
    });
  });
});
