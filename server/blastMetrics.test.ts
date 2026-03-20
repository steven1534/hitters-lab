import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { blastPlayers, blastSessions, blastMetrics, sessionNotes, users } from "../drizzle/schema";
import { getDb } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Helper to create an admin context for tRPC calls
function createAdminContext(userId = 999999): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-blast-admin",
      email: "blastadmin@test.com",
      name: "Blast Admin",
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

function createNonAdminContext(): TrpcContext {
  return {
    user: {
      id: 999998,
      openId: "test-blast-user",
      email: "blastuser@test.com",
      name: "Blast User",
      loginMethod: "manus",
      role: "user",
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

describe("Blast Metrics - Add Player", () => {
  let createdPlayerIds: string[] = [];

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    for (const id of createdPlayerIds) {
      await db.delete(blastSessions).where(eq(blastSessions.playerId, id));
      await db.delete(blastPlayers).where(eq(blastPlayers.id, id));
    }
    createdPlayerIds = [];
  });

  it("should add a new player as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.blastMetrics.addPlayer({ fullName: "Test Player 1" });

    expect(result.id).toBeDefined();
    expect(result.fullName).toBe("Test Player 1");
    createdPlayerIds.push(result.id);
  });

  it("should reject non-admin users from adding players", async () => {
    const caller = appRouter.createCaller(createNonAdminContext());
    await expect(
      caller.blastMetrics.addPlayer({ fullName: "Unauthorized Player" })
    ).rejects.toThrow("Admin access required");
  });
});

describe("Blast Metrics - Add Session", () => {
  let testPlayerId: string;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    testPlayerId = `test-player-${Date.now()}`;
    await db.insert(blastPlayers).values({
      id: testPlayerId,
      fullName: "Test Session Player",
      userId: null,
    });
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    const sessions = await db
      .select({ id: blastSessions.id })
      .from(blastSessions)
      .where(eq(blastSessions.playerId, testPlayerId));
    for (const s of sessions) {
      await db.delete(sessionNotes).where(eq(sessionNotes.blastSessionId, s.id));
      await db.delete(blastMetrics).where(eq(blastMetrics.sessionId, s.id));
    }
    await db.delete(blastSessions).where(eq(blastSessions.playerId, testPlayerId));
    await db.delete(blastPlayers).where(eq(blastPlayers.id, testPlayerId));
  });

  it("should add a session with full metrics", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.blastMetrics.addSession({
      playerId: testPlayerId,
      sessionDate: "2026-02-20",
      sessionType: "Tee",
      metrics: {
        batSpeedMph: "65.5",
        onPlaneEfficiencyPercent: "85.0",
        attackAngleDeg: "10.5",
        exitVelocityMph: "88.0",
      },
    });

    expect(result.sessionId).toBeDefined();

    // Verify session was created
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [session] = await db
      .select()
      .from(blastSessions)
      .where(eq(blastSessions.id, result.sessionId));
    expect(session).toBeDefined();
    expect(session.playerId).toBe(testPlayerId);
    expect(session.sessionType).toBe("Tee");

    // Verify metrics were created
    const [metrics] = await db
      .select()
      .from(blastMetrics)
      .where(eq(blastMetrics.sessionId, result.sessionId));
    expect(metrics).toBeDefined();
    expect(metrics.batSpeedMph).toBe("65.5");
    expect(metrics.onPlaneEfficiencyPercent).toBe("85.0");
    expect(metrics.attackAngleDeg).toBe("10.5");
    expect(metrics.exitVelocityMph).toBe("88.0");
  });

  it("should add a session with partial metrics (only bat speed)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.blastMetrics.addSession({
      playerId: testPlayerId,
      sessionDate: "2026-02-21",
      sessionType: "Soft Toss",
      metrics: {
        batSpeedMph: "48.0",
      },
    });

    expect(result.sessionId).toBeDefined();

    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [metrics] = await db
      .select()
      .from(blastMetrics)
      .where(eq(blastMetrics.sessionId, result.sessionId));
    expect(metrics).toBeDefined();
    expect(metrics.batSpeedMph).toBe("48.0");
    expect(metrics.onPlaneEfficiencyPercent).toBeNull();
    expect(metrics.attackAngleDeg).toBeNull();
  });

  it("should add a session with empty metrics", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.blastMetrics.addSession({
      playerId: testPlayerId,
      sessionDate: "2026-02-22",
      sessionType: "Live BP",
      metrics: {},
    });

    expect(result.sessionId).toBeDefined();

    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [metrics] = await db
      .select()
      .from(blastMetrics)
      .where(eq(blastMetrics.sessionId, result.sessionId));
    expect(metrics).toBeDefined();
    expect(metrics.batSpeedMph).toBeNull();
    expect(metrics.onPlaneEfficiencyPercent).toBeNull();
    expect(metrics.exitVelocityMph).toBeNull();
  });

  it("should NOT auto-create session note when player has no userId", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.blastMetrics.addSession({
      playerId: testPlayerId,
      sessionDate: "2026-02-20",
      sessionType: "Tee",
      createSessionNote: true,
      metrics: { batSpeedMph: "60.0" },
    });

    expect(result.sessionId).toBeDefined();
    expect(result.linkedSessionNoteId).toBeNull();

    // Verify no session note was created
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const notes = await db
      .select()
      .from(sessionNotes)
      .where(eq(sessionNotes.blastSessionId, result.sessionId));
    expect(notes).toHaveLength(0);
  });

  it("should reject non-admin users from adding sessions", async () => {
    const caller = appRouter.createCaller(createNonAdminContext());
    await expect(
      caller.blastMetrics.addSession({
        playerId: testPlayerId,
        sessionDate: "2026-02-20",
        sessionType: "Tee",
        metrics: { batSpeedMph: "50.0" },
      })
    ).rejects.toThrow("Admin access required");
  });
});

describe("Blast Metrics - Add Session with Linked User (auto session note)", () => {
  let testPlayerId: string;
  let testUserId: number;
  const testOpenId = `test-linked-user-${Date.now()}`;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create a test user in the users table
    const [userResult] = await db.insert(users).values({
      openId: testOpenId,
      name: "Test Linked Athlete",
      email: "linked-athlete@test.com",
      loginMethod: "manus",
      role: "athlete",
    });
    testUserId = userResult.insertId;

    // Create a Blast player linked to that user
    testPlayerId = `test-linked-player-${Date.now()}`;
    await db.insert(blastPlayers).values({
      id: testPlayerId,
      fullName: "Test Linked Athlete",
      userId: testUserId,
    });
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    const sessions = await db
      .select({ id: blastSessions.id })
      .from(blastSessions)
      .where(eq(blastSessions.playerId, testPlayerId));
    for (const s of sessions) {
      await db.delete(sessionNotes).where(eq(sessionNotes.blastSessionId, s.id));
      await db.delete(blastMetrics).where(eq(blastMetrics.sessionId, s.id));
    }
    await db.delete(blastSessions).where(eq(blastSessions.playerId, testPlayerId));
    await db.delete(blastPlayers).where(eq(blastPlayers.id, testPlayerId));
    // Clean up session notes for this athlete
    await db.delete(sessionNotes).where(eq(sessionNotes.athleteId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should auto-create a linked session note when player has userId", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.blastMetrics.addSession({
      playerId: testPlayerId,
      sessionDate: "2026-02-20",
      sessionType: "Tee",
      createSessionNote: true,
      metrics: {
        batSpeedMph: "65.0",
        onPlaneEfficiencyPercent: "80.0",
        attackAngleDeg: "12.0",
      },
    });

    expect(result.sessionId).toBeDefined();
    expect(result.linkedSessionNoteId).toBeDefined();
    expect(result.linkedSessionNoteId).not.toBeNull();

    // Verify session note was created with correct data
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [note] = await db
      .select()
      .from(sessionNotes)
      .where(eq(sessionNotes.blastSessionId, result.sessionId));
    expect(note).toBeDefined();
    expect(note.athleteId).toBe(testUserId);
    expect(note.blastSessionId).toBe(result.sessionId);
    expect(note.sessionLabel).toContain("Blast");
    expect(note.sessionLabel).toContain("Tee");
    expect(note.whatImproved).toContain("Bat Speed: 65.0 mph");
    expect(note.whatImproved).toContain("OPE: 80.0%");
    expect(note.whatImproved).toContain("Attack Angle: 12.0");
  });

  it("should NOT create session note when createSessionNote is false", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.blastMetrics.addSession({
      playerId: testPlayerId,
      sessionDate: "2026-02-20",
      sessionType: "Soft Toss",
      createSessionNote: false,
      metrics: { batSpeedMph: "55.0" },
    });

    expect(result.sessionId).toBeDefined();
    expect(result.linkedSessionNoteId).toBeNull();

    // Verify no session note was created
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const notes = await db
      .select()
      .from(sessionNotes)
      .where(eq(sessionNotes.blastSessionId, result.sessionId));
    expect(notes).toHaveLength(0);
  });
});

describe("Blast Metrics - Delete Session (with linked note cleanup)", () => {
  let testPlayerId: string;
  let testSessionId: string;
  let testUserId: number;
  const testOpenId = `test-del-linked-user-${Date.now()}`;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create a test user
    const [userResult] = await db.insert(users).values({
      openId: testOpenId,
      name: "Test Delete Linked",
      email: "del-linked@test.com",
      loginMethod: "manus",
      role: "athlete",
    });
    testUserId = userResult.insertId;

    testPlayerId = `test-del-player-${Date.now()}`;
    await db.insert(blastPlayers).values({
      id: testPlayerId,
      fullName: "Test Delete Player",
      userId: testUserId,
    });

    testSessionId = `test-del-session-${Date.now()}`;
    await db.insert(blastSessions).values({
      id: testSessionId,
      playerId: testPlayerId,
      sessionDate: new Date("2026-02-20"),
      sessionType: "Tee",
    });
    await db.insert(blastMetrics).values({
      sessionId: testSessionId,
      batSpeedMph: "55.0",
      onPlaneEfficiencyPercent: "70.0",
    });
    // Create a linked session note
    await db.insert(sessionNotes).values({
      coachId: 999999,
      athleteId: testUserId,
      sessionNumber: 1,
      sessionLabel: "Blast Tee Session",
      sessionDate: new Date("2026-02-20"),
      skillsWorked: JSON.stringify(["Swing Mechanics"]),
      whatImproved: "Bat Speed: 55.0 mph",
      whatNeedsWork: "See Blast Motion metrics",
      homeworkDrills: JSON.stringify([]),
      blastSessionId: testSessionId,
    });
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    await db.delete(sessionNotes).where(eq(sessionNotes.blastSessionId, testSessionId));
    await db.delete(blastMetrics).where(eq(blastMetrics.sessionId, testSessionId));
    await db.delete(blastSessions).where(eq(blastSessions.id, testSessionId));
    await db.delete(blastSessions).where(eq(blastSessions.playerId, testPlayerId));
    await db.delete(blastPlayers).where(eq(blastPlayers.id, testPlayerId));
    await db.delete(sessionNotes).where(eq(sessionNotes.athleteId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should delete session, metrics, AND linked session note", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.blastMetrics.deleteSession({ sessionId: testSessionId });

    expect(result.success).toBe(true);

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Session gone
    const sessions = await db
      .select()
      .from(blastSessions)
      .where(eq(blastSessions.id, testSessionId));
    expect(sessions).toHaveLength(0);

    // Metrics gone
    const metrics = await db
      .select()
      .from(blastMetrics)
      .where(eq(blastMetrics.sessionId, testSessionId));
    expect(metrics).toHaveLength(0);

    // Linked session note gone
    const notes = await db
      .select()
      .from(sessionNotes)
      .where(eq(sessionNotes.blastSessionId, testSessionId));
    expect(notes).toHaveLength(0);
  });

  it("should reject non-admin users from deleting sessions", async () => {
    const caller = appRouter.createCaller(createNonAdminContext());
    await expect(
      caller.blastMetrics.deleteSession({ sessionId: testSessionId })
    ).rejects.toThrow("Admin access required");
  });

  it("should handle deleting a non-existent session gracefully", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.blastMetrics.deleteSession({ sessionId: "non-existent-session-id" });
    expect(result.success).toBe(true);
  });
});

describe("Blast Metrics - Link/Unlink Player", () => {
  let testPlayerId: string;
  let testUserId: number;
  const testOpenId = `test-link-user-${Date.now()}`;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [userResult] = await db.insert(users).values({
      openId: testOpenId,
      name: "Test Link Athlete",
      email: "link-athlete@test.com",
      loginMethod: "manus",
      role: "athlete",
    });
    testUserId = userResult.insertId;

    testPlayerId = `test-link-player-${Date.now()}`;
    await db.insert(blastPlayers).values({
      id: testPlayerId,
      fullName: "Test Link Player",
      userId: null,
    });
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    await db.delete(blastPlayers).where(eq(blastPlayers.id, testPlayerId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should link a Blast player to a portal user", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.blastMetrics.linkPlayer({
      playerId: testPlayerId,
      userId: testUserId,
    });

    expect(result.success).toBe(true);

    // Verify the link
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [player] = await db
      .select()
      .from(blastPlayers)
      .where(eq(blastPlayers.id, testPlayerId));
    expect(player.userId).toBe(testUserId);
  });

  it("should unlink a Blast player from a portal user", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    // First link
    await db.update(blastPlayers).set({ userId: testUserId }).where(eq(blastPlayers.id, testPlayerId));

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.blastMetrics.unlinkPlayer({ playerId: testPlayerId });

    expect(result.success).toBe(true);

    const [player] = await db
      .select()
      .from(blastPlayers)
      .where(eq(blastPlayers.id, testPlayerId));
    expect(player.userId).toBeNull();
  });

  it("should reject non-admin users from linking players", async () => {
    const caller = appRouter.createCaller(createNonAdminContext());
    await expect(
      caller.blastMetrics.linkPlayer({ playerId: testPlayerId, userId: testUserId })
    ).rejects.toThrow("Admin access required");
  });

  it("should reject non-admin users from unlinking players", async () => {
    const caller = appRouter.createCaller(createNonAdminContext());
    await expect(
      caller.blastMetrics.unlinkPlayer({ playerId: testPlayerId })
    ).rejects.toThrow("Admin access required");
  });
});

describe("Blast Metrics - List Players", () => {
  let testPlayerId: string;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    testPlayerId = `test-list-player-${Date.now()}`;
    await db.insert(blastPlayers).values({
      id: testPlayerId,
      fullName: "Test List Player",
      userId: null,
    });
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    await db.delete(blastSessions).where(eq(blastSessions.playerId, testPlayerId));
    await db.delete(blastPlayers).where(eq(blastPlayers.id, testPlayerId));
  });

  it("should list players with session counts", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const players = await caller.blastMetrics.listPlayers();

    expect(Array.isArray(players)).toBe(true);
    const testPlayer = players.find((p: any) => p.id === testPlayerId);
    expect(testPlayer).toBeDefined();
    expect(testPlayer!.fullName).toBe("Test List Player");
    expect(testPlayer!.sessionCount).toBe(0);
  });

  it("should reject non-admin users from listing players", async () => {
    const caller = appRouter.createCaller(createNonAdminContext());
    await expect(caller.blastMetrics.listPlayers()).rejects.toThrow("Admin access required");
  });
});

describe("Blast Metrics - getPlayerSessions with hasLinkedNote", () => {
  let testPlayerId: string;
  let testUserId: number;
  const testOpenId = `test-linked-note-${Date.now()}`;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [userResult] = await db.insert(users).values({
      openId: testOpenId,
      name: "Test Note Athlete",
      email: "note-athlete@test.com",
      loginMethod: "manus",
      role: "athlete",
    });
    testUserId = userResult.insertId;

    testPlayerId = `test-note-player-${Date.now()}`;
    await db.insert(blastPlayers).values({
      id: testPlayerId,
      fullName: "Test Note Player",
      userId: testUserId,
    });
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    const sessions = await db
      .select({ id: blastSessions.id })
      .from(blastSessions)
      .where(eq(blastSessions.playerId, testPlayerId));
    for (const s of sessions) {
      await db.delete(sessionNotes).where(eq(sessionNotes.blastSessionId, s.id));
      await db.delete(blastMetrics).where(eq(blastMetrics.sessionId, s.id));
    }
    await db.delete(blastSessions).where(eq(blastSessions.playerId, testPlayerId));
    await db.delete(blastPlayers).where(eq(blastPlayers.id, testPlayerId));
    await db.delete(sessionNotes).where(eq(sessionNotes.athleteId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should return hasLinkedNote=true for sessions with linked notes", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    // Add session with auto-create note
    const result = await caller.blastMetrics.addSession({
      playerId: testPlayerId,
      sessionDate: "2026-02-20",
      sessionType: "Tee",
      createSessionNote: true,
      metrics: { batSpeedMph: "60.0" },
    });

    expect(result.linkedSessionNoteId).not.toBeNull();

    // Fetch sessions and check hasLinkedNote
    const sessions = await caller.blastMetrics.getPlayerSessions({
      playerId: testPlayerId,
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0].hasLinkedNote).toBe(true);
  });

  it("should return hasLinkedNote=false for sessions without linked notes", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    // Add session WITHOUT creating note
    await caller.blastMetrics.addSession({
      playerId: testPlayerId,
      sessionDate: "2026-02-20",
      sessionType: "Tee",
      createSessionNote: false,
      metrics: { batSpeedMph: "60.0" },
    });

    const sessions = await caller.blastMetrics.getPlayerSessions({
      playerId: testPlayerId,
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0].hasLinkedNote).toBe(false);
  });
});

// ── New tests for Edit Session, CSV Import, Retroactive Notes, Athlete Dashboard ──

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

describe("Blast Metrics - Update Session", () => {
  let testPlayerId: string;
  let testSessionId: string;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    testPlayerId = `test-update-player-${Date.now()}`;
    await db.insert(blastPlayers).values({
      id: testPlayerId,
      fullName: "Update Test Player",
      userId: null,
    });

    // Create a session with metrics
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.blastMetrics.addSession({
      playerId: testPlayerId,
      sessionDate: "2026-02-20",
      sessionType: "Tee",
      metrics: {
        batSpeedMph: "60.0",
        onPlaneEfficiencyPercent: "70.0",
        attackAngleDeg: "11.0",
      },
    });
    testSessionId = result.sessionId;
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    const sessions = await db
      .select({ id: blastSessions.id })
      .from(blastSessions)
      .where(eq(blastSessions.playerId, testPlayerId));
    for (const s of sessions) {
      await db.delete(sessionNotes).where(eq(sessionNotes.blastSessionId, s.id));
      await db.delete(blastMetrics).where(eq(blastMetrics.sessionId, s.id));
    }
    await db.delete(blastSessions).where(eq(blastSessions.playerId, testPlayerId));
    await db.delete(blastPlayers).where(eq(blastPlayers.id, testPlayerId));
  });

  it("should update session date and type", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.blastMetrics.updateSession({
      sessionId: testSessionId,
      sessionDate: "2026-02-25",
      sessionType: "Live BP",
      metrics: {
        batSpeedMph: "60.0",
        onPlaneEfficiencyPercent: "70.0",
        attackAngleDeg: "11.0",
      },
    });

    expect(result.success).toBe(true);

    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [session] = await db
      .select()
      .from(blastSessions)
      .where(eq(blastSessions.id, testSessionId));
    expect(session.sessionType).toBe("Live BP");
  });

  it("should update metrics values", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.blastMetrics.updateSession({
      sessionId: testSessionId,
      sessionDate: "2026-02-20",
      sessionType: "Tee",
      metrics: {
        batSpeedMph: "72.5",
        onPlaneEfficiencyPercent: "85.0",
        attackAngleDeg: "14.0",
        exitVelocityMph: "92.0",
      },
    });

    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [metrics] = await db
      .select()
      .from(blastMetrics)
      .where(eq(blastMetrics.sessionId, testSessionId));
    expect(metrics.batSpeedMph).toBe("72.5");
    expect(metrics.onPlaneEfficiencyPercent).toBe("85.0");
    expect(metrics.attackAngleDeg).toBe("14.0");
    expect(metrics.exitVelocityMph).toBe("92.0");
  });

  it("should reject non-admin users from updating sessions", async () => {
    const caller = appRouter.createCaller(createNonAdminContext());
    await expect(
      caller.blastMetrics.updateSession({
        sessionId: testSessionId,
        sessionDate: "2026-02-20",
        sessionType: "Tee",
        metrics: { batSpeedMph: "70.0" },
      })
    ).rejects.toThrow("Admin access required");
  });
});

describe("Blast Metrics - Bulk Import Sessions", () => {
  let testPlayerId: string;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    testPlayerId = `test-import-player-${Date.now()}`;
    await db.insert(blastPlayers).values({
      id: testPlayerId,
      fullName: "Import Test Player",
      userId: null,
    });
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    const sessions = await db
      .select({ id: blastSessions.id })
      .from(blastSessions)
      .where(eq(blastSessions.playerId, testPlayerId));
    for (const s of sessions) {
      await db.delete(sessionNotes).where(eq(sessionNotes.blastSessionId, s.id));
      await db.delete(blastMetrics).where(eq(blastMetrics.sessionId, s.id));
    }
    await db.delete(blastSessions).where(eq(blastSessions.playerId, testPlayerId));
    await db.delete(blastPlayers).where(eq(blastPlayers.id, testPlayerId));
  });

  it("should import multiple sessions at once", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.blastMetrics.bulkImportSessions({
      playerId: testPlayerId,
      sessions: [
        {
          sessionDate: "2026-01-15",
          sessionType: "Tee",
          metrics: { batSpeedMph: "55.0", onPlaneEfficiencyPercent: "70.0" },
        },
        {
          sessionDate: "2026-01-20",
          sessionType: "Soft Toss",
          metrics: { batSpeedMph: "58.0", onPlaneEfficiencyPercent: "72.0" },
        },
        {
          sessionDate: "2026-01-25",
          sessionType: "Live BP",
          metrics: { batSpeedMph: "62.0", onPlaneEfficiencyPercent: "75.0" },
        },
      ],
    });

    expect(result.imported).toBe(3);
    expect(result.errors).toHaveLength(0);

    // Verify sessions exist
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const sessions = await db
      .select()
      .from(blastSessions)
      .where(eq(blastSessions.playerId, testPlayerId));
    expect(sessions).toHaveLength(3);
  });

  it("should reject non-admin users from bulk importing", async () => {
    const caller = appRouter.createCaller(createNonAdminContext());
    await expect(
      caller.blastMetrics.bulkImportSessions({
        playerId: testPlayerId,
        sessions: [
          {
            sessionDate: "2026-01-15",
            sessionType: "Tee",
            metrics: { batSpeedMph: "55.0" },
          },
        ],
      })
    ).rejects.toThrow("Admin access required");
  });
});

describe("Blast Metrics - Retroactive Session Notes", () => {
  let testPlayerId: string;
  let testUserId: number;
  const testOpenId = `test-retro-${Date.now()}`;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create a test user
    const [userResult] = await db.insert(users).values({
      openId: testOpenId,
      name: "Retro Test Athlete",
      email: "retro-athlete@test.com",
      loginMethod: "manus",
      role: "athlete",
    });
    testUserId = userResult.insertId;

    // Create a Blast player linked to that user
    testPlayerId = `test-retro-player-${Date.now()}`;
    await db.insert(blastPlayers).values({
      id: testPlayerId,
      fullName: "Retro Test Athlete",
      userId: testUserId,
    });

    // Add sessions WITHOUT creating notes (simulating pre-link sessions)
    const caller = appRouter.createCaller(createAdminContext());
    await caller.blastMetrics.addSession({
      playerId: testPlayerId,
      sessionDate: "2026-01-10",
      sessionType: "Tee",
      createSessionNote: false,
      metrics: { batSpeedMph: "55.0", onPlaneEfficiencyPercent: "70.0" },
    });
    await caller.blastMetrics.addSession({
      playerId: testPlayerId,
      sessionDate: "2026-01-15",
      sessionType: "Soft Toss",
      createSessionNote: false,
      metrics: { batSpeedMph: "58.0", onPlaneEfficiencyPercent: "72.0" },
    });
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    const sessions = await db
      .select({ id: blastSessions.id })
      .from(blastSessions)
      .where(eq(blastSessions.playerId, testPlayerId));
    for (const s of sessions) {
      await db.delete(sessionNotes).where(eq(sessionNotes.blastSessionId, s.id));
      await db.delete(blastMetrics).where(eq(blastMetrics.sessionId, s.id));
    }
    await db.delete(blastSessions).where(eq(blastSessions.playerId, testPlayerId));
    await db.delete(blastPlayers).where(eq(blastPlayers.id, testPlayerId));
    await db.delete(sessionNotes).where(eq(sessionNotes.athleteId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should create session notes for all unlinked Blast sessions", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.blastMetrics.createRetroactiveNotes({
      playerId: testPlayerId,
    });

    expect(result.notesCreated).toBe(2);
    expect(result.alreadyLinked).toBe(0);

    // Verify session notes were created
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const notes = await db
      .select()
      .from(sessionNotes)
      .where(eq(sessionNotes.athleteId, testUserId));
    expect(notes.length).toBe(2);
    // Each note should have a blastSessionId
    notes.forEach((n) => {
      expect(n.blastSessionId).toBeDefined();
      expect(n.blastSessionId).not.toBeNull();
    });
  });

  it("should skip sessions that already have linked notes", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    // First call creates notes
    const first = await caller.blastMetrics.createRetroactiveNotes({
      playerId: testPlayerId,
    });
    expect(first.notesCreated).toBe(2);

    // Second call should skip all
    const second = await caller.blastMetrics.createRetroactiveNotes({
      playerId: testPlayerId,
    });
    expect(second.notesCreated).toBe(0);
    expect(second.alreadyLinked).toBe(2);
  });

  it("should reject non-admin users from creating retroactive notes", async () => {
    const caller = appRouter.createCaller(createNonAdminContext());
    await expect(
      caller.blastMetrics.createRetroactiveNotes({ playerId: testPlayerId })
    ).rejects.toThrow("Admin access required");
  });
});

describe("Blast Metrics - Athlete getMyBlastData", () => {
  let testPlayerId: string;
  let testUserId: number;
  const testOpenId = `test-athlete-blast-${Date.now()}`;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [userResult] = await db.insert(users).values({
      openId: testOpenId,
      name: "My Blast Athlete",
      email: "my-blast@test.com",
      loginMethod: "manus",
      role: "athlete",
    });
    testUserId = userResult.insertId;

    testPlayerId = `test-myblast-player-${Date.now()}`;
    await db.insert(blastPlayers).values({
      id: testPlayerId,
      fullName: "My Blast Athlete",
      userId: testUserId,
    });

    // Add a session
    const caller = appRouter.createCaller(createAdminContext());
    await caller.blastMetrics.addSession({
      playerId: testPlayerId,
      sessionDate: "2026-02-20",
      sessionType: "Tee",
      metrics: { batSpeedMph: "65.0", onPlaneEfficiencyPercent: "80.0" },
    });
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    const sessions = await db
      .select({ id: blastSessions.id })
      .from(blastSessions)
      .where(eq(blastSessions.playerId, testPlayerId));
    for (const s of sessions) {
      await db.delete(sessionNotes).where(eq(sessionNotes.blastSessionId, s.id));
      await db.delete(blastMetrics).where(eq(blastMetrics.sessionId, s.id));
    }
    await db.delete(blastSessions).where(eq(blastSessions.playerId, testPlayerId));
    await db.delete(blastPlayers).where(eq(blastPlayers.id, testPlayerId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should return the athlete's own Blast data", async () => {
    const caller = appRouter.createCaller(createAthleteContext(testUserId));
    const data = await caller.blastMetrics.getMyBlastData();

    expect(data.player).toBeDefined();
    expect(data.player!.fullName).toBe("My Blast Athlete");
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].batSpeedMph).toBe("65.0");
    expect(data.sessions[0].onPlaneEfficiencyPercent).toBe("80.0");
  });

  it("should return empty data for athlete with no Blast player", async () => {
    // Use a different userId that has no linked Blast player
    const caller = appRouter.createCaller(createAthleteContext(999997));
    const data = await caller.blastMetrics.getMyBlastData();

    expect(data.player).toBeNull();
    expect(data.sessions).toHaveLength(0);
  });
});

describe("Session Notes - Athlete getMyNotes", () => {
  let testUserId: number;
  const testOpenId = `test-athlete-notes-${Date.now()}`;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [userResult] = await db.insert(users).values({
      openId: testOpenId,
      name: "My Notes Athlete",
      email: "my-notes@test.com",
      loginMethod: "manus",
      role: "athlete",
    });
    testUserId = userResult.insertId;

    // Create a session note for this athlete (as coach)
    await db.insert(sessionNotes).values({
      coachId: 999999,
      athleteId: testUserId,
      sessionNumber: 1,
      sessionLabel: "Session #1",
      sessionDate: new Date("2026-02-20"),
      skillsWorked: JSON.stringify(["Swing Mechanics"]),
      whatImproved: "Better bat path",
      whatNeedsWork: "Timing on off-speed",
      privateNotes: "SECRET COACH NOTE - should not be visible",
      overallRating: 4,
    });
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    await db.delete(sessionNotes).where(eq(sessionNotes.athleteId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should return the athlete's own session notes without private fields", async () => {
    const caller = appRouter.createCaller(createAthleteContext(testUserId));
    const notes = await caller.sessionNotes.getMyNotes();

    expect(notes).toHaveLength(1);
    expect(notes[0].sessionLabel).toBe("Session #1");
    expect(notes[0].whatImproved).toBe("Better bat path");
    expect(notes[0].whatNeedsWork).toBe("Timing on off-speed");
    // Private fields should NOT be present
    expect((notes[0] as any).privateNotes).toBeUndefined();
    expect((notes[0] as any).overallRating).toBeUndefined();
    expect((notes[0] as any).coachId).toBeUndefined();
  });

  it("should return empty for athlete with no notes", async () => {
    const caller = appRouter.createCaller(createAthleteContext(999996));
    const notes = await caller.sessionNotes.getMyNotes();
    expect(notes).toHaveLength(0);
  });
});
