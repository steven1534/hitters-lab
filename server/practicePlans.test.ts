import { describe, expect, it, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Track all plan IDs created during tests for cleanup
const createdPlanIds: number[] = [];

function createCoachContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "coach-open-id",
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
    openId: "athlete-open-id",
    email: "athlete@example.com",
    name: "Joey Tavares",
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

/** Helper that creates a plan and tracks its ID for cleanup */
async function createAndTrack(
  caller: ReturnType<typeof appRouter.createCaller>,
  input: Parameters<ReturnType<typeof appRouter.createCaller>["practicePlans"]["create"]>[0]
) {
  const result = await caller.practicePlans.create(input);
  createdPlanIds.push(result.planId);
  return result;
}

const sampleBlocks = [
  { sortOrder: 0, blockType: "warmup" as const, title: "Dynamic Stretching", duration: 10, drillId: null, sets: null, reps: null, notes: "Full body warm-up" },
  { sortOrder: 1, blockType: "drill" as const, title: "1-2-3 Rhythm Tee", duration: 15, drillId: "1-2-3-rhythm-tee", sets: 3, reps: 10, notes: "Focus on load timing" },
  { sortOrder: 2, blockType: "break" as const, title: "Water Break", duration: 5, drillId: null, sets: null, reps: null, notes: null },
  { sortOrder: 3, blockType: "cooldown" as const, title: "Cool-Down Stretch", duration: 10, drillId: null, sets: null, reps: null, notes: null },
];

describe("practicePlans", () => {
  // Clean up all test-created plans after all tests finish
  afterAll(async () => {
    const caller = appRouter.createCaller(createCoachContext());
    for (const id of createdPlanIds) {
      try {
        await caller.practicePlans.delete({ planId: id });
      } catch {
        // Plan may already be deleted by a test — ignore
      }
    }
  });

  // ─── CRUD Tests ────────────────────────────────────────────────────────────

  it("coach can create a practice plan", async () => {
    const caller = appRouter.createCaller(createCoachContext());
    const result = await createAndTrack(caller, {
      title: "Test Hitting Session",
      athleteId: null,
      sessionDate: null,
      duration: 40,
      sessionNotes: "Focus on mechanics",
      focusAreas: ["Hitting", "Mental Game"],
      status: "draft",
      isShared: false,
      blocks: sampleBlocks,
    });
    expect(result.success).toBe(true);
    expect(result.planId).toBeDefined();
    expect(typeof result.planId).toBe("number");
  });

  it("coach can get all plans", async () => {
    const caller = appRouter.createCaller(createCoachContext());
    const plans = await caller.practicePlans.getAll();
    expect(Array.isArray(plans)).toBe(true);
  });

  it("coach can get a plan by ID with blocks", async () => {
    const caller = appRouter.createCaller(createCoachContext());
    const { planId } = await createAndTrack(caller, {
      title: "Get By ID Test",
      duration: 30,
      blocks: [{ sortOrder: 0, blockType: "drill", title: "Test Drill", duration: 30 }],
    });
    const plan = await caller.practicePlans.getById({ planId });
    expect(plan).toBeDefined();
    expect(plan.title).toBe("Get By ID Test");
    expect((plan as any).blocks).toBeDefined();
    expect(Array.isArray((plan as any).blocks)).toBe(true);
    expect((plan as any).blocks.length).toBe(1);
  });

  it("coach can update a plan", async () => {
    const caller = appRouter.createCaller(createCoachContext());
    const { planId } = await createAndTrack(caller, {
      title: "Update Test",
      duration: 30,
      blocks: [],
    });
    const result = await caller.practicePlans.update({
      planId,
      title: "Updated Title",
      status: "scheduled",
    });
    expect(result.success).toBe(true);

    const updated = await caller.practicePlans.getById({ planId });
    expect(updated.title).toBe("Updated Title");
    expect(updated.status).toBe("scheduled");
  });

  it("coach can delete a plan", async () => {
    const caller = appRouter.createCaller(createCoachContext());
    const { planId } = await createAndTrack(caller, {
      title: "Delete Test",
      duration: 30,
      blocks: [],
    });
    const result = await caller.practicePlans.delete({ planId });
    expect(result.success).toBe(true);

    await expect(caller.practicePlans.getById({ planId })).rejects.toThrow("Plan not found");
    // Remove from tracking since it's already deleted
    const idx = createdPlanIds.indexOf(planId);
    if (idx !== -1) createdPlanIds.splice(idx, 1);
  });

  it("coach can duplicate a plan", async () => {
    const caller = appRouter.createCaller(createCoachContext());
    const { planId } = await createAndTrack(caller, {
      title: "Original Plan",
      duration: 40,
      focusAreas: ["Hitting"],
      blocks: sampleBlocks,
    });
    const dupResult = await caller.practicePlans.duplicate({ planId });
    createdPlanIds.push(dupResult.planId); // Track the duplicate too
    expect(dupResult.success).toBe(true);
    expect(dupResult.planId).toBeDefined();
    expect(dupResult.planId).not.toBe(planId);

    const dupPlan = await caller.practicePlans.getById({ planId: dupResult.planId });
    expect(dupPlan.title).toContain("Original Plan");
    expect((dupPlan as any).blocks.length).toBe(sampleBlocks.length);
  });

  // ─── Sharing Tests ─────────────────────────────────────────────────────────

  it("coach can toggle share on a plan", async () => {
    const caller = appRouter.createCaller(createCoachContext());
    const { planId } = await createAndTrack(caller, {
      title: "Share Test",
      athleteId: 2,
      duration: 30,
      blocks: [],
    });
    const result = await caller.practicePlans.toggleShare({ planId, isShared: true });
    expect(result.success).toBe(true);

    const plan = await caller.practicePlans.getById({ planId });
    expect(plan.isShared).toBeTruthy();
  });

  it("athlete can see shared plans assigned to them", async () => {
    const coachCaller = appRouter.createCaller(createCoachContext());
    const { planId } = await createAndTrack(coachCaller, {
      title: "Shared Athlete Plan",
      athleteId: 2,
      duration: 30,
      isShared: true,
      blocks: [{ sortOrder: 0, blockType: "drill", title: "Drill A", duration: 30 }],
    });
    await coachCaller.practicePlans.toggleShare({ planId, isShared: true });

    const athleteCaller = appRouter.createCaller(createAthleteContext(2));
    const sharedPlans = await athleteCaller.practicePlans.getMySharedPlans();
    expect(Array.isArray(sharedPlans)).toBe(true);
    const found = sharedPlans.find((p: any) => p.id === planId);
    expect(found).toBeDefined();
  });

  it("athlete can view a shared plan by ID", async () => {
    const coachCaller = appRouter.createCaller(createCoachContext());
    const { planId } = await createAndTrack(coachCaller, {
      title: "Viewable Shared Plan",
      athleteId: 2,
      duration: 45,
      isShared: true,
      blocks: [{ sortOrder: 0, blockType: "warmup", title: "Warm-Up", duration: 10 }],
    });
    await coachCaller.practicePlans.toggleShare({ planId, isShared: true });

    const athleteCaller = appRouter.createCaller(createAthleteContext(2));
    const plan = await athleteCaller.practicePlans.getById({ planId });
    expect(plan.title).toBe("Viewable Shared Plan");
  });

  // ─── Authorization Tests ───────────────────────────────────────────────────

  it("athlete cannot create a plan", async () => {
    const caller = appRouter.createCaller(createAthleteContext());
    await expect(
      caller.practicePlans.create({
        title: "Unauthorized Plan",
        duration: 30,
        blocks: [],
      })
    ).rejects.toThrow("Coach access required");
  });

  it("athlete cannot get all coach plans", async () => {
    const caller = appRouter.createCaller(createAthleteContext());
    await expect(caller.practicePlans.getAll()).rejects.toThrow("Coach access required");
  });

  it("athlete cannot update a plan", async () => {
    const caller = appRouter.createCaller(createAthleteContext());
    await expect(
      caller.practicePlans.update({ planId: 999, title: "Hacked" })
    ).rejects.toThrow("Coach access required");
  });

  it("athlete cannot delete a plan", async () => {
    const caller = appRouter.createCaller(createAthleteContext());
    await expect(caller.practicePlans.delete({ planId: 999 })).rejects.toThrow("Coach access required");
  });

  it("athlete cannot duplicate a plan", async () => {
    const caller = appRouter.createCaller(createAthleteContext());
    await expect(caller.practicePlans.duplicate({ planId: 999 })).rejects.toThrow("Coach access required");
  });

  it("athlete cannot toggle share", async () => {
    const caller = appRouter.createCaller(createAthleteContext());
    await expect(
      caller.practicePlans.toggleShare({ planId: 999, isShared: true })
    ).rejects.toThrow("Coach access required");
  });

  it("athlete cannot view a non-shared plan", async () => {
    const coachCaller = appRouter.createCaller(createCoachContext());
    const { planId } = await createAndTrack(coachCaller, {
      title: "Private Plan",
      athleteId: 2,
      duration: 30,
      isShared: false,
      blocks: [],
    });

    const athleteCaller = appRouter.createCaller(createAthleteContext(2));
    await expect(athleteCaller.practicePlans.getById({ planId })).rejects.toThrow("Access denied");
  });

  it("athlete cannot view a plan assigned to someone else", async () => {
    const coachCaller = appRouter.createCaller(createCoachContext());
    const { planId } = await createAndTrack(coachCaller, {
      title: "Other Athlete Plan",
      athleteId: 99,
      duration: 30,
      isShared: true,
      blocks: [],
    });
    await coachCaller.practicePlans.toggleShare({ planId, isShared: true });

    const athleteCaller = appRouter.createCaller(createAthleteContext(2));
    await expect(athleteCaller.practicePlans.getById({ planId })).rejects.toThrow("Access denied");
  });

  // ─── Validation Tests ──────────────────────────────────────────────────────

  it("rejects empty title", async () => {
    const caller = appRouter.createCaller(createCoachContext());
    await expect(
      caller.practicePlans.create({
        title: "",
        duration: 30,
        blocks: [],
      })
    ).rejects.toThrow();
  });

  it("rejects zero duration", async () => {
    const caller = appRouter.createCaller(createCoachContext());
    await expect(
      caller.practicePlans.create({
        title: "Zero Duration",
        duration: 0,
        blocks: [],
      })
    ).rejects.toThrow();
  });

  it("creates plan with all focus areas", async () => {
    const caller = appRouter.createCaller(createCoachContext());
    const allAreas = ["Hitting", "Pitching", "Fielding", "Catching", "Baserunning", "Throwing", "Mental Game", "Conditioning"];
    const result = await createAndTrack(caller, {
      title: "Full Focus Plan",
      duration: 60,
      focusAreas: allAreas,
      blocks: [],
    });
    expect(result.success).toBe(true);

    const plan = await caller.practicePlans.getById({ planId: result.planId });
    expect(plan.focusAreas).toEqual(allAreas);
  });

  it("creates plan with multiple block types", async () => {
    const caller = appRouter.createCaller(createCoachContext());
    const result = await createAndTrack(caller, {
      title: "Multi Block Plan",
      duration: 50,
      blocks: sampleBlocks,
    });
    expect(result.success).toBe(true);

    const plan = await caller.practicePlans.getById({ planId: result.planId });
    const blocks = (plan as any).blocks;
    expect(blocks.length).toBe(4);
    expect(blocks[0].blockType).toBe("warmup");
    expect(blocks[1].blockType).toBe("drill");
    expect(blocks[1].drillId).toBe("1-2-3-rhythm-tee");
    expect(blocks[2].blockType).toBe("break");
    expect(blocks[3].blockType).toBe("cooldown");
  });

  it("handles session date correctly", async () => {
    const caller = appRouter.createCaller(createCoachContext());
    const dateStr = "2026-03-15T14:00:00.000Z";
    const result = await createAndTrack(caller, {
      title: "Dated Plan",
      duration: 60,
      sessionDate: dateStr,
      blocks: [],
    });
    const plan = await caller.practicePlans.getById({ planId: result.planId });
    expect(plan.sessionDate).toBeDefined();
  });

  // ─── New Fields Tests ─────────────────────────────────────────────────────

  it("creates plan with coaching cues and key points", async () => {
    const caller = appRouter.createCaller(createCoachContext());
    const result = await createAndTrack(caller, {
      title: "Cues Test Plan",
      duration: 30,
      blocks: [{
        sortOrder: 0,
        blockType: "drill",
        title: "Tee Work",
        duration: 15,
        coachingCues: "Stay back, let it travel",
        keyPoints: "Watch for early hip rotation",
        equipment: "Tee, Baseballs",
        intensity: "medium",
        goal: "Consistent contact point",
      }],
    });
    expect(result.success).toBe(true);

    const plan = await caller.practicePlans.getById({ planId: result.planId });
    const block = (plan as any).blocks[0];
    expect(block.coachingCues).toBe("Stay back, let it travel");
    expect(block.keyPoints).toBe("Watch for early hip rotation");
    expect(block.equipment).toBe("Tee, Baseballs");
    expect(block.intensity).toBe("medium");
    expect(block.goal).toBe("Consistent contact point");
  });

  // ─── Templates Tests ───────────────────────────────────────────────────────

  it("coach can get templates", async () => {
    const caller = appRouter.createCaller(createCoachContext());
    const templates = await caller.practicePlans.getTemplates();
    expect(Array.isArray(templates)).toBe(true);
  });

  it("athlete cannot get templates", async () => {
    const caller = appRouter.createCaller(createAthleteContext());
    await expect(caller.practicePlans.getTemplates()).rejects.toThrow("Coach access required");
  });
});
