import { getDb } from "./db";
import {
  sessionNotes,
  progressReports,
  InsertSessionNote,
  InsertProgressReport,
  users,
} from "../drizzle/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";

// ── Session Notes CRUD ──────────────────────────────────────

/** Get the next session number for a given athlete */
export async function getNextSessionNumber(athleteId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ maxNum: sql<number>`COALESCE(MAX(${sessionNotes.sessionNumber}), 0)` })
    .from(sessionNotes)
    .where(eq(sessionNotes.athleteId, athleteId));

  return (result[0]?.maxNum ?? 0) + 1;
}

/** Create a new session note */
export async function createSessionNote(data: InsertSessionNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(sessionNotes).values(data).returning({ id: sessionNotes.id });
  const insertId = result[0].id;
  return getSessionNoteById(insertId);
}

/** Get a single session note by ID */
export async function getSessionNoteById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(sessionNotes)
    .where(eq(sessionNotes.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Get all session notes for an athlete, ordered by session date desc */
export async function getSessionNotesForAthlete(athleteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(sessionNotes)
    .where(eq(sessionNotes.athleteId, athleteId))
    .orderBy(desc(sessionNotes.sessionDate));
}

/** Get session notes for an athlete with athlete name included */
export async function getSessionNotesWithAthleteName(athleteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const notes = await db
    .select()
    .from(sessionNotes)
    .where(eq(sessionNotes.athleteId, athleteId))
    .orderBy(desc(sessionNotes.sessionDate));

  const athlete = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, athleteId))
    .limit(1);

  return {
    notes,
    athleteName: athlete[0]?.name ?? "Unknown",
    athleteEmail: athlete[0]?.email ?? null,
  };
}

/** Update a session note */
export async function updateSessionNote(
  id: number,
  data: Partial<InsertSessionNote>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(sessionNotes).set(data).where(eq(sessionNotes.id, id));
  return getSessionNoteById(id);
}

/** Delete a session note */
export async function deleteSessionNote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(sessionNotes).where(eq(sessionNotes.id, id));
  return { success: true };
}

/** Get recent session notes for an athlete (for AI report context) */
export async function getRecentSessionNotes(
  athleteId: number,
  limit: number = 5
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(sessionNotes)
    .where(eq(sessionNotes.athleteId, athleteId))
    .orderBy(desc(sessionNotes.sessionDate))
    .limit(limit);
}

/** Get shared session notes for an athlete (athlete-facing, only shared notes) */
export async function getSharedSessionNotesForAthlete(athleteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(sessionNotes)
    .where(
      and(
        eq(sessionNotes.athleteId, athleteId),
        eq(sessionNotes.sharedWithAthlete, true)
      )
    )
    .orderBy(desc(sessionNotes.sessionDate));
}

/** Get all athletes who have session notes (for coach overview) */
export async function getAthletesWithSessions(coachId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      athleteId: sessionNotes.athleteId,
      athleteName: users.name,
      athleteEmail: users.email,
      totalSessions: sql<number>`COUNT(${sessionNotes.id})`,
      lastSessionDate: sql<string>`MAX(${sessionNotes.sessionDate})`,
    })
    .from(sessionNotes)
    .innerJoin(users, eq(sessionNotes.athleteId, users.id))
    .where(eq(sessionNotes.coachId, coachId))
    .groupBy(sessionNotes.athleteId, users.name, users.email)
    .orderBy(sql`MAX(${sessionNotes.sessionDate}) DESC`);

  return result;
}

// ── Progress Reports CRUD ───────────────────────────────────

/** Create a new progress report */
export async function createProgressReport(data: InsertProgressReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(progressReports).values(data).returning({ id: progressReports.id });
  const insertId = result[0].id;
  return getProgressReportById(insertId);
}

/** Get a single progress report by ID */
export async function getProgressReportById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(progressReports)
    .where(eq(progressReports.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Get all progress reports for an athlete */
export async function getProgressReportsForAthlete(athleteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(progressReports)
    .where(eq(progressReports.athleteId, athleteId))
    .orderBy(desc(progressReports.createdAt));
}

/** Update a progress report */
export async function updateProgressReport(
  id: number,
  data: Partial<InsertProgressReport>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(progressReports)
    .set(data)
    .where(eq(progressReports.id, id));
  return getProgressReportById(id);
}

/** Delete a progress report */
export async function deleteProgressReport(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(progressReports).where(eq(progressReports.id, id));
  return { success: true };
}
