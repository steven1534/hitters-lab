import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAthleteContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "athlete-user",
    email: "athlete@example.com",
    name: "Athlete User",
    loginMethod: "manus",
    role: "athlete",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("drillDetails.saveDrillInstructions - inline goal editing", () => {
  it("allows admin to save a goal update", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.drillDetails.saveDrillInstructions({
      drillId: "test-goal-edit-drill",
      goal: "Updated goal text for testing inline editing",
    });

    expect(result).toEqual({ success: true });
  });

  it("allows admin to save goal-only update without other fields", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Only sending drillId and goal - simulates inline goal edit
    const result = await caller.drillDetails.saveDrillInstructions({
      drillId: "test-goal-only-drill",
      goal: "This is just a goal update, no other fields",
    });

    expect(result).toEqual({ success: true });
  });

  it("rejects goal update from non-admin user", async () => {
    const ctx = createAthleteContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.drillDetails.saveDrillInstructions({
        drillId: "test-goal-edit-drill",
        goal: "Athlete should not be able to edit this",
      })
    ).rejects.toThrow("Admin access required");
  });

  it("persists goal and can be retrieved", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const testGoal = "Persisted goal text - " + Date.now();

    await caller.drillDetails.saveDrillInstructions({
      drillId: "test-persist-goal-drill",
      goal: testGoal,
    });

    const detail = await caller.drillDetails.getDrillDetail({
      drillId: "test-persist-goal-drill",
    });

    expect(detail).not.toBeNull();
    expect(detail?.goal).toBe(testGoal);
  });

  it("updates existing goal without losing other fields", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // First save with full data
    await caller.drillDetails.saveDrillInstructions({
      drillId: "test-update-goal-drill",
      goal: "Original goal",
      skillSet: "Hitting",
      time: "10 min",
      athletes: "1-4",
      equipment: "Bat, Tee",
      difficulty: "Medium",
    });

    // Now update just the goal
    await caller.drillDetails.saveDrillInstructions({
      drillId: "test-update-goal-drill",
      goal: "Updated goal text",
    });

    const detail = await caller.drillDetails.getDrillDetail({
      drillId: "test-update-goal-drill",
    });

    expect(detail).not.toBeNull();
    expect(detail?.goal).toBe("Updated goal text");
  });
});
