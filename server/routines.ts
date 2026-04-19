import { eq, and, asc } from "drizzle-orm";
import { routines, routineDrills, routineAssignments } from "../drizzle/schema";
import type { InsertRoutine, InsertRoutineDrill } from "../drizzle/schema";
import { getDb } from "./db";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("[Routines] Database not available");
  return d;
}

// ── Routines CRUD ─────────────────────────────────────────────

export async function createRoutine(data: InsertRoutine) {
  const d = await db();
  const [row] = await d.insert(routines).values(data).returning({ id: routines.id });
  return row.id;
}

export async function updateRoutine(id: number, data: Partial<InsertRoutine>) {
  const d = await db();
  await d.update(routines).set({ ...data, updatedAt: new Date() }).where(eq(routines.id, id));
}

export async function deleteRoutine(id: number) {
  const d = await db();
  await d.delete(routineDrills).where(eq(routineDrills.routineId, id));
  await d.delete(routineAssignments).where(eq(routineAssignments.routineId, id));
  await d.delete(routines).where(eq(routines.id, id));
}

export async function getAllRoutines() {
  const d = await db();
  return d.select().from(routines).orderBy(asc(routines.name));
}

export async function getRoutineById(id: number) {
  const d = await db();
  const [row] = await d.select().from(routines).where(eq(routines.id, id));
  return row ?? null;
}

// ── Routine Drills ────────────────────────────────────────────

export async function setRoutineDrills(routineId: number, drillsList: Omit<InsertRoutineDrill, "routineId">[]) {
  const d = await db();
  await d.delete(routineDrills).where(eq(routineDrills.routineId, routineId));
  if (drillsList.length === 0) return;
  await d.insert(routineDrills).values(
    drillsList.map((dr, i) => ({ ...dr, routineId, orderIndex: dr.orderIndex ?? i }))
  );
}

export async function getRoutineDrills(routineId: number) {
  const d = await db();
  return d.select().from(routineDrills)
    .where(eq(routineDrills.routineId, routineId))
    .orderBy(asc(routineDrills.orderIndex));
}

// ── Routine Assignments ───────────────────────────────────────

export async function assignRoutine(routineId: number, userId: number, frequency?: string) {
  const d = await db();
  const [row] = await d.insert(routineAssignments)
    .values({ routineId, userId, frequency })
    .returning({ id: routineAssignments.id });
  return row.id;
}

export async function unassignRoutine(routineId: number, userId: number) {
  const d = await db();
  await d.delete(routineAssignments).where(
    and(eq(routineAssignments.routineId, routineId), eq(routineAssignments.userId, userId))
  );
}

export async function getAssignmentsForUser(userId: number) {
  const d = await db();
  return d.select().from(routineAssignments)
    .where(eq(routineAssignments.userId, userId))
    .orderBy(asc(routineAssignments.assignedAt));
}

export async function getAssignmentsForRoutine(routineId: number) {
  const d = await db();
  return d.select().from(routineAssignments)
    .where(eq(routineAssignments.routineId, routineId));
}

export async function updateAssignmentStatus(id: number, status: "active" | "paused" | "completed") {
  const d = await db();
  const completedAt = status === "completed" ? new Date() : null;
  await d.update(routineAssignments)
    .set({ status, completedAt })
    .where(eq(routineAssignments.id, id));
}
