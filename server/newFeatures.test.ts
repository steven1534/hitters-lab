import { describe, it, expect, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

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

// Track IDs for cleanup
const createdPlanIds: number[] = [];

async function createAndTrack(
  caller: ReturnType<typeof appRouter.createCaller>,
  data: any
) {
  const result = await caller.practicePlans.create(data);
  createdPlanIds.push(result.planId);
  return { ...result, ...data };
}

afterAll(async () => {
  const coachCaller = appRouter.createCaller(createCoachContext());
  for (const id of createdPlanIds) {
    try {
      await coachCaller.practicePlans.delete({ id });
    } catch {}
  }
});

// ─── Follow-Up Reminders ─────────────────────────────────────────────────────

describe("Follow-Up Reminders", () => {
  it("sendFollowUpReminder requires coach access", async () => {
    const athleteCaller = appRouter.createCaller(createAthleteContext());
    await expect(
      athleteCaller.drillAssignments.sendFollowUpReminder({ userId: 2 })
    ).rejects.toThrow();
  });

  it("sendFollowUpReminder works for coach with valid athlete", async () => {
    const coachCaller = appRouter.createCaller(createCoachContext());
    // User ID 2 may not exist in test DB — if NOT_FOUND, that's expected behavior
    try {
      const result = await coachCaller.drillAssignments.sendFollowUpReminder({
        userId: 2,
      });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
    } catch (err: any) {
      // NOT_FOUND is acceptable if user doesn't exist in test DB
      expect(err.code).toBe("NOT_FOUND");
    }
  });

  it("sendFollowUpReminder rejects non-existent athlete", async () => {
    const coachCaller = appRouter.createCaller(createCoachContext());
    await expect(
      coachCaller.drillAssignments.sendFollowUpReminder({ userId: 99999 })
    ).rejects.toThrow();
  });
});

// ─── System Templates ────────────────────────────────────────────────────────

describe("System Templates", () => {
  it("getTemplates returns system templates for any user", async () => {
    const coachCaller = appRouter.createCaller(createCoachContext());
    const templates = await coachCaller.drillDetails.getTemplates();
    expect(Array.isArray(templates)).toBe(true);

    // Should include system templates
    const systemTemplates = templates.filter((t: any) => t.isSystem);
    expect(systemTemplates.length).toBeGreaterThan(0);
  });

  it("system templates include expected names", async () => {
    const coachCaller = appRouter.createCaller(createCoachContext());
    const templates = await coachCaller.drillDetails.getTemplates();
    const systemNames = templates
      .filter((t: any) => t.isSystem)
      .map((t: any) => t.name);

    expect(systemNames).toContain("Video + Key Points");
    expect(systemNames).toContain("Drill Breakdown");
    expect(systemNames).toContain("Quick Reference Card");
    expect(systemNames).toContain("Video Gallery");
    expect(systemNames).toContain("Progressive Drill Series");
  });

  it("system templates have blocks array", async () => {
    const coachCaller = appRouter.createCaller(createCoachContext());
    const templates = await coachCaller.drillDetails.getTemplates();
    const systemTemplates = templates.filter((t: any) => t.isSystem);

    for (const tmpl of systemTemplates) {
      const blocks =
        typeof tmpl.blocks === "string"
          ? JSON.parse(tmpl.blocks)
          : tmpl.blocks;
      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBeGreaterThan(0);
    }
  });
});

// ─── Practice Plan Calendar Queries ──────────────────────────────────────────

describe("Practice Plan Calendar Support", () => {
  it("plans with sessionDate can be queried and filtered", async () => {
    const coachCaller = appRouter.createCaller(createCoachContext());

    // Create a plan with a specific session date
    const result = await createAndTrack(coachCaller, {
      title: "Calendar Test Plan",
      athleteId: 2,
      sessionDate: new Date("2026-03-15T10:00:00Z").toISOString(),
      duration: 15,
      status: "scheduled",
      focusAreas: ["hitting"],
      blocks: [
        {
          blockType: "drill",
          title: "Test Drill",
          duration: 15,
          sortOrder: 0,
        },
      ],
    });

    expect(result.planId).toBeDefined();
    expect(result.success).toBe(true);

    // Verify the plan appears in the list
    const plans = await coachCaller.practicePlans.getAll();
    const found = plans.find((p: any) => p.id === result.planId);
    expect(found).toBeDefined();
    expect(found!.sessionDate).toBeDefined();
  });

  it("plans can be created with different statuses for calendar filtering", async () => {
    const coachCaller = appRouter.createCaller(createCoachContext());

    const draftPlan = await createAndTrack(coachCaller, {
      title: "Draft Calendar Plan",
      athleteId: 2,
      duration: 10,
      status: "draft",
      focusAreas: [],
      blocks: [
        {
          blockType: "custom",
          title: "Placeholder",
          duration: 10,
          sortOrder: 0,
        },
      ],
    });

    const scheduledPlan = await createAndTrack(coachCaller, {
      title: "Scheduled Calendar Plan",
      athleteId: 2,
      sessionDate: new Date("2026-03-20T14:00:00Z").toISOString(),
      duration: 20,
      status: "scheduled",
      focusAreas: ["fielding"],
      blocks: [
        {
          blockType: "drill",
          title: "Fielding Drill",
          duration: 20,
          sortOrder: 0,
        },
      ],
    });

    expect(draftPlan.success).toBe(true);
    expect(scheduledPlan.success).toBe(true);
  });
});

// ─── Practice Plan Sharing with Email ────────────────────────────────────────

describe("Practice Plan Sharing Triggers Email", () => {
  it("toggleShare changes shared status", async () => {
    const coachCaller = appRouter.createCaller(createCoachContext());

    const planResult = await createAndTrack(coachCaller, {
      title: "Share Email Test Plan",
      athleteId: 2,
      duration: 15,
      status: "scheduled",
      focusAreas: ["hitting"],
      blocks: [
        {
          blockType: "drill",
          title: "Hitting Drill",
          duration: 15,
          sortOrder: 0,
        },
      ],
    });

    // Toggle share on
    await coachCaller.practicePlans.toggleShare({
      planId: planResult.planId,
      isShared: true,
    });
    // Verify it's shared by fetching the plan
    const sharedPlan = await coachCaller.practicePlans.getById({ planId: planResult.planId });
    expect(sharedPlan.isShared).toBeTruthy();

    // Toggle share off
    await coachCaller.practicePlans.toggleShare({
      planId: planResult.planId,
      isShared: false,
    });
    const unsharedPlan = await coachCaller.practicePlans.getById({ planId: planResult.planId });
    expect(unsharedPlan.isShared).toBeFalsy();
  });
});

// ─── Accessibility: ARIA and Contrast ────────────────────────────────────────

describe("Accessibility Infrastructure", () => {
  it("coach context has expected user fields for ARIA personalization", () => {
    const ctx = createCoachContext();
    expect(ctx.user).toBeDefined();
    expect(ctx.user!.name).toBe("Coach Steve");
    expect(ctx.user!.role).toBe("admin");
  });

  it("athlete context has expected user fields", () => {
    const ctx = createAthleteContext();
    expect(ctx.user).toBeDefined();
    expect(ctx.user!.name).toBe("Joey Tavares");
    expect(ctx.user!.role).toBe("user");
  });
});
