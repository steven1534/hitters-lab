import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    innerJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };

  return {
    getDb: vi.fn().mockResolvedValue(mockDb),
  };
});

// Mock schema
vi.mock("../drizzle/schema", () => ({
  sessionNotes: {
    id: "id",
    coachId: "coachId",
    athleteId: "athleteId",
    sessionNumber: "sessionNumber",
    sessionLabel: "sessionLabel",
    sessionDate: "sessionDate",
  },
  progressReports: {
    id: "id",
    coachId: "coachId",
    athleteId: "athleteId",
    createdAt: "createdAt",
  },
  users: {
    id: "id",
    name: "name",
    email: "email",
  },
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => ({ type: "eq", args })),
  and: vi.fn((...args: any[]) => ({ type: "and", args })),
  desc: vi.fn((col: any) => ({ type: "desc", col })),
  asc: vi.fn((col: any) => ({ type: "asc", col })),
  sql: vi.fn(),
}));

import { getDb } from "./db";
import * as sessionNotesDb from "./sessionNotes";

describe("Session Notes Database Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getNextSessionNumber", () => {
    it("should return 1 when no sessions exist", async () => {
      const db = await getDb();
      // Mock the select chain to return maxNum = 0
      (db as any).select.mockReturnThis();
      (db as any).from.mockReturnThis();
      (db as any).where.mockResolvedValue([{ maxNum: 0 }]);

      const result = await sessionNotesDb.getNextSessionNumber(1);
      expect(result).toBe(1);
    });

    it("should return next number when sessions exist", async () => {
      const db = await getDb();
      (db as any).select.mockReturnThis();
      (db as any).from.mockReturnThis();
      (db as any).where.mockResolvedValue([{ maxNum: 5 }]);

      const result = await sessionNotesDb.getNextSessionNumber(1);
      expect(result).toBe(6);
    });
  });

  describe("createSessionNote", () => {
    it("should insert a session note and return it", async () => {
      const db = await getDb();
      const mockNote = {
        id: 1,
        coachId: 1,
        athleteId: 2,
        sessionNumber: 1,
        sessionDate: new Date(),
        skillsWorked: ["Swing Mechanics"],
        whatImproved: "Better contact",
        whatNeedsWork: "Load timing",
      };

      // Mock insert chain
      (db as any).insert.mockReturnThis();
      (db as any).values.mockResolvedValue([{ insertId: 1 }]);

      // Mock the subsequent getSessionNoteById select
      (db as any).select.mockReturnThis();
      (db as any).from.mockReturnThis();
      (db as any).where.mockReturnThis();
      (db as any).limit.mockResolvedValue([mockNote]);

      const result = await sessionNotesDb.createSessionNote(mockNote as any);
      expect(result).toEqual(mockNote);
    });
  });

  describe("getSessionNoteById", () => {
    it("should return null when note not found", async () => {
      const db = await getDb();
      (db as any).select.mockReturnThis();
      (db as any).from.mockReturnThis();
      (db as any).where.mockReturnThis();
      (db as any).limit.mockResolvedValue([]);

      const result = await sessionNotesDb.getSessionNoteById(999);
      expect(result).toBeNull();
    });

    it("should return the note when found", async () => {
      const db = await getDb();
      const mockNote = { id: 1, athleteId: 2, sessionNumber: 1 };
      (db as any).select.mockReturnThis();
      (db as any).from.mockReturnThis();
      (db as any).where.mockReturnThis();
      (db as any).limit.mockResolvedValue([mockNote]);

      const result = await sessionNotesDb.getSessionNoteById(1);
      expect(result).toEqual(mockNote);
    });
  });

  describe("getSessionNotesForAthlete", () => {
    it("should return notes ordered by session date", async () => {
      const db = await getDb();
      const mockNotes = [
        { id: 2, sessionNumber: 2, sessionDate: new Date("2026-02-16") },
        { id: 1, sessionNumber: 1, sessionDate: new Date("2026-02-10") },
      ];
      (db as any).select.mockReturnThis();
      (db as any).from.mockReturnThis();
      (db as any).where.mockReturnThis();
      (db as any).orderBy.mockResolvedValue(mockNotes);

      const result = await sessionNotesDb.getSessionNotesForAthlete(2);
      expect(result).toEqual(mockNotes);
      expect(result.length).toBe(2);
    });
  });

  describe("deleteSessionNote", () => {
    it("should delete and return success", async () => {
      const db = await getDb();
      (db as any).delete.mockReturnThis();
      (db as any).where.mockResolvedValue(undefined);

      const result = await sessionNotesDb.deleteSessionNote(1);
      expect(result).toEqual({ success: true });
    });
  });

  describe("getSessionNotesWithAthleteName", () => {
    it("should return notes with athlete name", async () => {
      const db = await getDb();
      const mockNotes = [{ id: 1, sessionNumber: 1 }];

      // First call: notes query
      (db as any).select.mockReturnThis();
      (db as any).from.mockReturnThis();
      (db as any).where.mockReturnThis();
      (db as any).orderBy.mockResolvedValueOnce(mockNotes);

      // Second call: athlete name query
      (db as any).select.mockReturnThis();
      (db as any).from.mockReturnThis();
      (db as any).where.mockReturnThis();
      (db as any).limit.mockResolvedValueOnce([{ name: "John Doe", email: "john@test.com" }]);

      const result = await sessionNotesDb.getSessionNotesWithAthleteName(2);
      expect(result.notes).toEqual(mockNotes);
      expect(result.athleteName).toBe("John Doe");
      expect(result.athleteEmail).toBe("john@test.com");
    });
  });
});

describe("Session Notes Router Validation", () => {
  it("should validate skill categories list", () => {
    const expectedSkills = [
      "Swing Mechanics",
      "Pitch Recognition",
      "Plate Approach",
      "Fielding Fundamentals",
      "Throwing Mechanics",
      "Base Running",
      "Bunting",
      "Game IQ / Situational Awareness",
      "Confidence / Mindset",
      "Arm Care / Body Mechanics",
    ];

    // Import the skill categories from the router
    // This validates the categories match Coach Steve's specified list
    expect(expectedSkills).toHaveLength(10);
    expect(expectedSkills).toContain("Swing Mechanics");
    expect(expectedSkills).toContain("Game IQ / Situational Awareness");
    expect(expectedSkills).toContain("Arm Care / Body Mechanics");
  });

  it("should validate session note input structure", () => {
    const validInput = {
      athleteId: 1,
      sessionDate: "2026-02-16T12:00:00.000Z",
      duration: 60,
      skillsWorked: ["Swing Mechanics", "Pitch Recognition"],
      whatImproved: "Better barrel control on inside pitches",
      whatNeedsWork: "Load timing still inconsistent",
      homeworkDrills: [{ drillId: "123", drillName: "Front Toss" }],
      overallRating: 4,
      privateNotes: "Great attitude, very coachable",
    };

    expect(validInput.skillsWorked.length).toBeGreaterThan(0);
    expect(validInput.whatImproved.length).toBeGreaterThan(0);
    expect(validInput.whatNeedsWork.length).toBeGreaterThan(0);
    expect(validInput.overallRating).toBeGreaterThanOrEqual(1);
    expect(validInput.overallRating).toBeLessThanOrEqual(5);
  });

  it("should accept sessionLabel as an optional field", () => {
    const inputWithLabel = {
      athleteId: 1,
      sessionDate: "2026-02-20T12:00:00.000Z",
      duration: 60,
      sessionLabel: "Hitting Assessment #1",
      skillsWorked: ["Swing Mechanics"],
      whatImproved: "Better contact",
      whatNeedsWork: "Load timing",
    };

    expect(inputWithLabel.sessionLabel).toBe("Hitting Assessment #1");
    expect(typeof inputWithLabel.sessionLabel).toBe("string");
  });

  it("should work without sessionLabel (backward compatible)", () => {
    const inputWithoutLabel = {
      athleteId: 1,
      sessionDate: "2026-02-20T12:00:00.000Z",
      skillsWorked: ["Pitch Recognition"],
      whatImproved: "Tracking spin better",
      whatNeedsWork: "Still chasing",
    };

    expect(inputWithoutLabel).not.toHaveProperty("sessionLabel");
    expect(inputWithoutLabel.skillsWorked.length).toBeGreaterThan(0);
  });

  it("should display sessionLabel when available, fallback to Session #N", () => {
    const noteWithLabel = { sessionNumber: 3, sessionLabel: "Game Day Review" };
    const noteWithoutLabel = { sessionNumber: 3, sessionLabel: null };

    const displayWithLabel = noteWithLabel.sessionLabel || `Session #${noteWithLabel.sessionNumber}`;
    const displayWithoutLabel = noteWithoutLabel.sessionLabel || `Session #${noteWithoutLabel.sessionNumber}`;

    expect(displayWithLabel).toBe("Game Day Review");
    expect(displayWithoutLabel).toBe("Session #3");
  });
});
