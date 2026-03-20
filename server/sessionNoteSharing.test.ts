import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { sessionNotes, users } from "../drizzle/schema";
import { getDb } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(userId = 999999): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-sharing-admin",
      email: "sharingadmin@test.com",
      name: "Sharing Admin",
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

function createNonCoachContext(): TrpcContext {
  return {
    user: {
      id: 999998,
      openId: "test-sharing-user",
      email: "user@test.com",
      name: "Regular User",
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

describe("Session Note Sharing Toggle", () => {
  let testUserId: number;
  let testNoteId: number;
  const testOpenId = `test-sharing-athlete-${Date.now()}`;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create a test athlete user
    const [userResult] = await db.insert(users).values({
      openId: testOpenId,
      name: "Sharing Test Athlete",
      email: "sharing-athlete@test.com",
      loginMethod: "manus",
      role: "athlete",
    });
    testUserId = userResult.insertId;

    // Create a session note (shared by default)
    await db.insert(sessionNotes).values({
      coachId: 999999,
      athleteId: testUserId,
      sessionNumber: 1,
      sessionLabel: "Session #1",
      sessionDate: new Date("2026-02-20"),
      skillsWorked: JSON.stringify(["Swing Mechanics"]),
      whatImproved: "Better bat path",
      whatNeedsWork: "Timing on off-speed",
      privateNotes: "SECRET COACH NOTE",
      overallRating: 4,
      sharedWithAthlete: true,
    });

    const notes = await db
      .select()
      .from(sessionNotes)
      .where(eq(sessionNotes.athleteId, testUserId));
    testNoteId = notes[0].id;
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    await db.delete(sessionNotes).where(eq(sessionNotes.athleteId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should default sharedWithAthlete to true for new notes", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [note] = await db
      .select()
      .from(sessionNotes)
      .where(eq(sessionNotes.id, testNoteId));
    expect(note.sharedWithAthlete).toBe(true);
  });

  it("should toggle sharing off for a session note", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.sessionNotes.toggleSharing({
      id: testNoteId,
      shared: false,
    });

    expect(result).toBeDefined();
    expect(result!.sharedWithAthlete).toBe(false);
  });

  it("should toggle sharing back on", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    // First toggle off
    await caller.sessionNotes.toggleSharing({ id: testNoteId, shared: false });

    // Then toggle back on
    const result = await caller.sessionNotes.toggleSharing({
      id: testNoteId,
      shared: true,
    });

    expect(result).toBeDefined();
    expect(result!.sharedWithAthlete).toBe(true);
  });

  it("should reject non-coach users from toggling sharing", async () => {
    const caller = appRouter.createCaller(createNonCoachContext());
    await expect(
      caller.sessionNotes.toggleSharing({ id: testNoteId, shared: false })
    ).rejects.toThrow("Coach access required");
  });

  it("athlete getMyNotes should only return shared notes", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create a second note that is NOT shared
    await db.insert(sessionNotes).values({
      coachId: 999999,
      athleteId: testUserId,
      sessionNumber: 2,
      sessionLabel: "Session #2 (Hidden)",
      sessionDate: new Date("2026-02-21"),
      skillsWorked: JSON.stringify(["Pitch Recognition"]),
      whatImproved: "Better eye tracking",
      whatNeedsWork: "Breaking ball recognition",
      sharedWithAthlete: false,
    });

    const caller = appRouter.createCaller(createAthleteContext(testUserId));
    const notes = await caller.sessionNotes.getMyNotes();

    // Should only see the shared note, not the hidden one
    expect(notes).toHaveLength(1);
    expect(notes[0].sessionLabel).toBe("Session #1");
  });

  it("athlete getMyNotes should return all notes when all are shared", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create a second shared note
    await db.insert(sessionNotes).values({
      coachId: 999999,
      athleteId: testUserId,
      sessionNumber: 2,
      sessionLabel: "Session #2",
      sessionDate: new Date("2026-02-21"),
      skillsWorked: JSON.stringify(["Pitch Recognition"]),
      whatImproved: "Better eye tracking",
      whatNeedsWork: "Breaking ball recognition",
      sharedWithAthlete: true,
    });

    const caller = appRouter.createCaller(createAthleteContext(testUserId));
    const notes = await caller.sessionNotes.getMyNotes();

    expect(notes).toHaveLength(2);
  });

  it("athlete getMyNotes should return empty when all notes are hidden", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    // Hide the only note
    await caller.sessionNotes.toggleSharing({ id: testNoteId, shared: false });

    const athleteCaller = appRouter.createCaller(createAthleteContext(testUserId));
    const notes = await athleteCaller.sessionNotes.getMyNotes();

    expect(notes).toHaveLength(0);
  });

  it("athlete getMyNotes should not include private fields", async () => {
    const caller = appRouter.createCaller(createAthleteContext(testUserId));
    const notes = await caller.sessionNotes.getMyNotes();

    expect(notes).toHaveLength(1);
    expect((notes[0] as any).privateNotes).toBeUndefined();
    expect((notes[0] as any).overallRating).toBeUndefined();
    expect((notes[0] as any).coachId).toBeUndefined();
    expect((notes[0] as any).sharedWithAthlete).toBeUndefined();
  });

  it("coach getForAthlete should include sharedWithAthlete field", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const data = await caller.sessionNotes.getForAthlete({
      athleteId: testUserId,
    });

    expect(data.notes).toHaveLength(1);
    expect(data.notes[0].sharedWithAthlete).toBe(true);
  });
});
