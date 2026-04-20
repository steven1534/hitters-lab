import { eq, and, asc, desc } from "drizzle-orm";
import {
  routines,
  routineDrills,
  drillAssignments,
  InsertRoutine,
  InsertRoutineDrill,
  InsertDrillAssignment,
  notifications,
} from "../drizzle/schema";
import { getDb } from "./db";

export interface RoutineDrillInput {
  drillId: string;
  drillName: string;
  order: number;
  repsOrDuration?: string | null;
  note?: string | null;
}

export interface RoutineInput {
  name: string;
  description?: string | null;
  durationMinutes?: number | null;
  equipment?: string[] | null;
  space?: string | null;
  skillFocus?: string | null;
  drills: RoutineDrillInput[];
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

export async function listRoutines() {
  const db = await requireDb();
  return await db.select().from(routines).orderBy(desc(routines.updatedAt));
}

/**
 * Return a single routine plus its ordered drills. The drillName isn't stored
 * on routineDrills — that comes from the static catalog on the client, matched
 * via drillId.
 */
export async function getRoutine(id: number) {
  const db = await requireDb();
  const routineRows = await db.select().from(routines).where(eq(routines.id, id)).limit(1);
  const routine = routineRows[0];
  if (!routine) return null;

  const drills = await db
    .select()
    .from(routineDrills)
    .where(eq(routineDrills.routineId, id))
    .orderBy(asc(routineDrills.order));

  return { ...routine, drills };
}

export async function createRoutine(input: RoutineInput, createdBy: number) {
  const db = await requireDb();

  const routineRow: InsertRoutine = {
    name: input.name,
    description: input.description ?? null,
    durationMinutes: input.durationMinutes ?? null,
    equipment: input.equipment ?? null,
    space: input.space ?? null,
    skillFocus: input.skillFocus ?? null,
    createdBy,
  };

  const inserted = await db.insert(routines).values(routineRow).returning({ id: routines.id });
  const routineId = inserted[0].id;

  if (input.drills.length > 0) {
    const drillRows: InsertRoutineDrill[] = input.drills.map((d) => ({
      routineId,
      drillId: d.drillId,
      order: d.order,
      repsOrDuration: d.repsOrDuration ?? null,
      note: d.note ?? null,
    }));
    await db.insert(routineDrills).values(drillRows);
  }

  return { id: routineId };
}

export async function updateRoutine(id: number, input: RoutineInput) {
  const db = await requireDb();

  await db
    .update(routines)
    .set({
      name: input.name,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes ?? null,
      equipment: input.equipment ?? null,
      space: input.space ?? null,
      skillFocus: input.skillFocus ?? null,
      updatedAt: new Date(),
    })
    .where(eq(routines.id, id));

  // Simplest consistent semantics: replace the drill list wholesale. The
  // builder UI always sends the full ordered set.
  await db.delete(routineDrills).where(eq(routineDrills.routineId, id));

  if (input.drills.length > 0) {
    const drillRows: InsertRoutineDrill[] = input.drills.map((d) => ({
      routineId: id,
      drillId: d.drillId,
      order: d.order,
      repsOrDuration: d.repsOrDuration ?? null,
      note: d.note ?? null,
    }));
    await db.insert(routineDrills).values(drillRows);
  }

  return { success: true };
}

export async function deleteRoutine(id: number) {
  const db = await requireDb();
  // Existing drillAssignments that pointed at this routine retain their
  // routineId value but no longer resolve to a parent — UI should treat them
  // as standalone assignments with a stale badge, or filter them out.
  await db.delete(routineDrills).where(eq(routineDrills.routineId, id));
  await db.delete(routines).where(eq(routines.id, id));
  return { success: true };
}

/**
 * Materialize a routine onto an athlete: inserts one drillAssignments row per
 * routineDrill, stamped with routineId + routineOrder so the athlete's My Plan
 * can group them back together as "Today's Session".
 *
 * Returns the number of assignments created. Intentionally does not dedupe —
 * assigning the same routine twice creates two copies so coaches can re-assign
 * a block week after week.
 */
export async function assignRoutineToAthlete(
  routineId: number,
  userId: number,
  coachNote?: string | null
) {
  const db = await requireDb();

  const routine = await getRoutine(routineId);
  if (!routine) throw new Error("Routine not found");
  if (routine.drills.length === 0) {
    throw new Error("Routine has no drills — add drills before assigning");
  }

  const rows: InsertDrillAssignment[] = routine.drills.map((d) => ({
    userId,
    drillId: d.drillId,
    // Stored drillName on drillAssignments is redundant with the static
    // catalog but the table requires it. We don't have the drill name on
    // routineDrills so fall back to drillId; the client already resolves
    // display names from the catalog.
    drillName: d.drillId,
    status: "assigned" as const,
    notes: d.note ?? coachNote ?? null,
    routineId,
    routineOrder: d.order,
  }));

  await db.insert(drillAssignments).values(rows);

  try {
    await db.insert(notifications).values({
      userId,
      type: "assignment",
      title: "New Routine Assigned",
      message: `Coach assigned you the routine: ${routine.name}`,
      isRead: 0,
    });
  } catch (err) {
    console.error("[Routines] Failed to create notification:", err);
  }

  return { count: rows.length, routineName: routine.name };
}
