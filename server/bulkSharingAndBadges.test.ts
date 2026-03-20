import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { sessionNotes, users, badges, drillAssignments } from "../drizzle/schema";
import { getDb } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { BADGE_DEFINITIONS, getNextBadge, type AthleteStats } from "./badgeService";

function createAdminContext(userId = 999999): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-bulk-admin",
      email: "bulkadmin@test.com",
      name: "Bulk Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
      get: () => "localhost",
    } as any,
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAthleteContext(userId: number): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `test-athlete-${userId}`,
      email: "athlete@test.com",
      name: "Test Athlete",
      loginMethod: "manus",
      role: "athlete",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
      get: () => "localhost",
    } as any,
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ─── Bulk Sharing Tests ────────────────────────────────────────────────────────

describe("Bulk Share/Hide All Session Notes", () => {
  let testUserId: number;
  const testOpenId = `test-bulk-athlete-${Date.now()}`;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test athlete
    const [userResult] = await db.insert(users).values({
      openId: testOpenId,
      name: "Bulk Test Athlete",
      email: "bulk-athlete@test.com",
      loginMethod: "manus",
      role: "athlete",
    });
    testUserId = userResult.insertId;

    // Create 3 session notes with mixed sharing states
    await db.insert(sessionNotes).values([
      {
        coachId: 999999,
        athleteId: testUserId,
        sessionNumber: 1,
        sessionLabel: "Session #1",
        sessionDate: new Date("2026-02-18"),
        skillsWorked: JSON.stringify(["Swing Mechanics"]),
        whatImproved: "Better bat path",
        whatNeedsWork: "Timing",
        sharedWithAthlete: true,
      },
      {
        coachId: 999999,
        athleteId: testUserId,
        sessionNumber: 2,
        sessionLabel: "Session #2",
        sessionDate: new Date("2026-02-19"),
        skillsWorked: JSON.stringify(["Pitch Recognition"]),
        whatImproved: "Eye tracking",
        whatNeedsWork: "Breaking balls",
        sharedWithAthlete: false,
      },
      {
        coachId: 999999,
        athleteId: testUserId,
        sessionNumber: 3,
        sessionLabel: "Session #3",
        sessionDate: new Date("2026-02-20"),
        skillsWorked: JSON.stringify(["Base Running"]),
        whatImproved: "Lead distance",
        whatNeedsWork: "Reads on pitcher",
        sharedWithAthlete: true,
      },
    ]);
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    await db.delete(sessionNotes).where(eq(sessionNotes.athleteId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should hide all notes for an athlete", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.sessionNotes.bulkToggleSharing({
      athleteId: testUserId,
      shared: false,
    });

    expect(result.total).toBe(3);
    expect(result.updated).toBe(2); // Only 2 were shared, 1 was already hidden

    // Verify athlete sees nothing
    const athleteCaller = appRouter.createCaller(createAthleteContext(testUserId));
    const notes = await athleteCaller.sessionNotes.getMyNotes();
    expect(notes).toHaveLength(0);
  });

  it("should share all notes for an athlete", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.sessionNotes.bulkToggleSharing({
      athleteId: testUserId,
      shared: true,
    });

    expect(result.total).toBe(3);
    expect(result.updated).toBe(1); // Only 1 was hidden, 2 were already shared

    // Verify athlete sees all 3
    const athleteCaller = appRouter.createCaller(createAthleteContext(testUserId));
    const notes = await athleteCaller.sessionNotes.getMyNotes();
    expect(notes).toHaveLength(3);
  });

  it("should return 0 updated when all notes already match target state", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    // First, share all
    await caller.sessionNotes.bulkToggleSharing({
      athleteId: testUserId,
      shared: true,
    });

    // Then try to share all again
    const result = await caller.sessionNotes.bulkToggleSharing({
      athleteId: testUserId,
      shared: true,
    });

    expect(result.updated).toBe(0);
    expect(result.total).toBe(3);
  });

  it("should reject non-coach users", async () => {
    const athleteCaller = appRouter.createCaller(createAthleteContext(testUserId));
    await expect(
      athleteCaller.sessionNotes.bulkToggleSharing({
        athleteId: testUserId,
        shared: false,
      })
    ).rejects.toThrow("Coach access required");
  });
});

// ─── Badge Service Unit Tests ──────────────────────────────────────────────────

describe("Badge Service", () => {
  it("should define at least 10 badge types", () => {
    expect(BADGE_DEFINITIONS.length).toBeGreaterThanOrEqual(10);
  });

  it("should award first_drill badge at 1 completion", () => {
    const def = BADGE_DEFINITIONS.find((b) => b.type === "first_drill");
    expect(def).toBeDefined();
    expect(def!.check({ completedDrills: 1, streak: 0, videoSubmissions: 0, totalSubmissions: 1 })).toBe(true);
    expect(def!.check({ completedDrills: 0, streak: 0, videoSubmissions: 0, totalSubmissions: 0 })).toBe(false);
  });

  it("should award five_drills badge at 5 completions", () => {
    const def = BADGE_DEFINITIONS.find((b) => b.type === "five_drills");
    expect(def).toBeDefined();
    expect(def!.check({ completedDrills: 5, streak: 0, videoSubmissions: 0, totalSubmissions: 5 })).toBe(true);
    expect(def!.check({ completedDrills: 4, streak: 0, videoSubmissions: 0, totalSubmissions: 4 })).toBe(false);
  });

  it("should award streak badges at correct thresholds", () => {
    const threeDay = BADGE_DEFINITIONS.find((b) => b.type === "three_day_streak");
    const sevenDay = BADGE_DEFINITIONS.find((b) => b.type === "seven_day_streak");
    const fourteenDay = BADGE_DEFINITIONS.find((b) => b.type === "fourteen_day_streak");

    const stats: AthleteStats = { completedDrills: 0, streak: 7, videoSubmissions: 0, totalSubmissions: 0 };
    expect(threeDay!.check(stats)).toBe(true);
    expect(sevenDay!.check(stats)).toBe(true);
    expect(fourteenDay!.check(stats)).toBe(false);
  });

  it("should award video badges at correct thresholds", () => {
    const firstVideo = BADGE_DEFINITIONS.find((b) => b.type === "first_video");
    const fiveVideos = BADGE_DEFINITIONS.find((b) => b.type === "five_videos");

    const stats: AthleteStats = { completedDrills: 0, streak: 0, videoSubmissions: 3, totalSubmissions: 0 };
    expect(firstVideo!.check(stats)).toBe(true);
    expect(fiveVideos!.check(stats)).toBe(false);
  });

  it("getNextBadge should return the first unearned badge", () => {
    // With 3 completions, streak 1, 0 videos: first_drill is earned,
    // five_drills is next drill badge (not yet met), but three_day_streak
    // also not met. The function iterates in order, so five_drills comes first.
    const earned = new Set<string>(["first_drill"]);
    const stats: AthleteStats = { completedDrills: 3, streak: 1, videoSubmissions: 0, totalSubmissions: 3 };

    const next = getNextBadge(earned, stats);
    expect(next).toBeDefined();
    expect(next!.name).toBe("Dedicated Athlete"); // five_drills is next in order
    expect(next!.progress).toBe(3);
    expect(next!.target).toBe(5);
  });

  it("getNextBadge should return null when all badges are earned", () => {
    const allTypes = new Set(BADGE_DEFINITIONS.map((b) => b.type));
    const stats: AthleteStats = { completedDrills: 100, streak: 30, videoSubmissions: 10, totalSubmissions: 100 };

    const next = getNextBadge(allTypes, stats);
    expect(next).toBeNull();
  });
});

// ─── Badge Integration Tests ───────────────────────────────────────────────────

describe("Badge Integration (getMyProgress)", () => {
  let testUserId: number;
  const testOpenId = `test-badge-athlete-${Date.now()}`;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test athlete
    const [userResult] = await db.insert(users).values({
      openId: testOpenId,
      name: "Badge Test Athlete",
      email: "badge-athlete@test.com",
      loginMethod: "manus",
      role: "athlete",
    });
    testUserId = userResult.insertId;
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    await db.delete(badges).where(eq(badges.userId, testUserId));
    await db.delete(drillAssignments).where(eq(drillAssignments.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should return stats, earned badges, and next badge for an athlete", async () => {
    const caller = appRouter.createCaller(createAthleteContext(testUserId));
    const progress = await caller.badges.getMyProgress();

    expect(progress).toHaveProperty("stats");
    expect(progress).toHaveProperty("earnedBadges");
    expect(progress).toHaveProperty("newBadges");
    expect(progress).toHaveProperty("nextBadge");
    expect(progress.stats).toHaveProperty("completedDrills");
    expect(progress.stats).toHaveProperty("streak");
    expect(progress.stats).toHaveProperty("videoSubmissions");
  });

  it("should award first_drill badge when athlete has 1 completed drill", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create a completed assignment
    await db.insert(drillAssignments).values({
      userId: testUserId,
      drillId: "test-drill-1",
      drillName: "Test Drill",
      status: "completed",
      completedAt: new Date(),
    });

    const caller = appRouter.createCaller(createAthleteContext(testUserId));
    const progress = await caller.badges.getMyProgress();

    expect(progress.stats.completedDrills).toBe(1);
    expect(progress.newBadges.length).toBeGreaterThanOrEqual(1);
    expect(progress.newBadges.some((b) => b.type === "first_drill")).toBe(true);
    expect(progress.earnedBadges.some((b) => b.badgeType === "first_drill")).toBe(true);
  });

  it("should not re-award badges on subsequent calls", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create a completed assignment
    await db.insert(drillAssignments).values({
      userId: testUserId,
      drillId: "test-drill-1",
      drillName: "Test Drill",
      status: "completed",
      completedAt: new Date(),
    });

    const caller = appRouter.createCaller(createAthleteContext(testUserId));

    // First call awards the badge
    const first = await caller.badges.getMyProgress();
    expect(first.newBadges.some((b) => b.type === "first_drill")).toBe(true);

    // Second call should not re-award
    const second = await caller.badges.getMyProgress();
    expect(second.newBadges.length).toBe(0);
    expect(second.earnedBadges.some((b) => b.badgeType === "first_drill")).toBe(true);
  });

  it("should return next badge info for an athlete with no completions", async () => {
    const caller = appRouter.createCaller(createAthleteContext(testUserId));
    const progress = await caller.badges.getMyProgress();

    expect(progress.nextBadge).toBeDefined();
    expect(progress.nextBadge!.name).toBe("First Steps");
    expect(progress.nextBadge!.progress).toBe(0);
    expect(progress.nextBadge!.target).toBe(1);
  });
});
