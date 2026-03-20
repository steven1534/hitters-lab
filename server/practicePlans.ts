import { eq, desc, and } from "drizzle-orm";
import { practicePlans, practicePlanBlocks, users } from "../drizzle/schema";
import { getDb } from "./db";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlanBlockInput {
  sortOrder: number;
  blockType: "drill" | "warmup" | "cooldown" | "break" | "custom";
  drillId?: string | null;
  title: string;
  duration: number;
  sets?: number | null;
  reps?: number | null;
  notes?: string | null;
  coachingCues?: string | null;
  keyPoints?: string | null;
  equipment?: string | null;
  intensity?: "low" | "medium" | "high" | null;
  goal?: string | null;
}

export interface CreatePlanInput {
  coachId: number;
  athleteId?: number | null;
  inviteId?: number | null;
  title: string;
  sessionDate?: Date | null;
  duration: number;
  sessionNotes?: string | null;
  focusAreas?: string[] | null;
  status?: "draft" | "scheduled" | "completed" | "cancelled";
  isShared?: boolean;
  isTemplate?: boolean;
  blocks: PlanBlockInput[];
}

export interface UpdatePlanInput {
  title?: string;
  athleteId?: number | null;
  sessionDate?: Date | null;
  duration?: number;
  sessionNotes?: string | null;
  focusAreas?: string[] | null;
  status?: "draft" | "scheduled" | "completed" | "cancelled";
  isShared?: boolean;
  isTemplate?: boolean;
  blocks?: PlanBlockInput[];
}

// ─── Block Insert Helper ────────────────────────────────────────────────────

function mapBlockToInsert(b: PlanBlockInput, planId: number) {
  return {
    planId,
    sortOrder: b.sortOrder,
    blockType: b.blockType,
    drillId: b.drillId ?? null,
    title: b.title,
    duration: b.duration,
    sets: b.sets ?? null,
    reps: b.reps ?? null,
    notes: b.notes ?? null,
    coachingCues: b.coachingCues ?? null,
    keyPoints: b.keyPoints ?? null,
    equipment: b.equipment ?? null,
    intensity: b.intensity ?? null,
    goal: b.goal ?? null,
  };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Create a new practice plan with blocks */
export async function createPlan(input: CreatePlanInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [plan] = await db.insert(practicePlans).values({
    coachId: input.coachId,
    athleteId: input.athleteId ?? null,
    inviteId: input.inviteId ?? null,
    title: input.title,
    sessionDate: input.sessionDate ?? null,
    duration: input.duration,
    sessionNotes: input.sessionNotes ?? null,
    focusAreas: input.focusAreas ?? null,
    status: input.status ?? "draft",
    isShared: input.isShared ? 1 : 0,
    isTemplate: input.isTemplate ? 1 : 0,
  }).$returningId();

  if (input.blocks.length > 0) {
    await db.insert(practicePlanBlocks).values(
      input.blocks.map((b) => mapBlockToInsert(b, plan.id))
    );
  }

  return plan.id;
}

/** Get all plans for a coach (non-template) */
export async function getCoachPlans(coachId: number) {
  const db = await getDb();
  if (!db) return [];

  const plans = await db
    .select({
      id: practicePlans.id,
      coachId: practicePlans.coachId,
      athleteId: practicePlans.athleteId,
      title: practicePlans.title,
      sessionDate: practicePlans.sessionDate,
      duration: practicePlans.duration,
      sessionNotes: practicePlans.sessionNotes,
      focusAreas: practicePlans.focusAreas,
      status: practicePlans.status,
      isShared: practicePlans.isShared,
      isTemplate: practicePlans.isTemplate,
      createdAt: practicePlans.createdAt,
      updatedAt: practicePlans.updatedAt,
      athleteName: users.name,
      athleteEmail: users.email,
    })
    .from(practicePlans)
    .leftJoin(users, eq(practicePlans.athleteId, users.id))
    .where(and(eq(practicePlans.coachId, coachId), eq(practicePlans.isTemplate, 0)))
    .orderBy(desc(practicePlans.sessionDate));

  return plans;
}

/** Get all templates for a coach */
export async function getCoachTemplates(coachId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(practicePlans)
    .where(and(eq(practicePlans.coachId, coachId), eq(practicePlans.isTemplate, 1)))
    .orderBy(desc(practicePlans.updatedAt));
}

/** Get a single plan with its blocks */
export async function getPlanWithBlocks(planId: number) {
  const db = await getDb();
  if (!db) return null;

  const [plan] = await db
    .select({
      id: practicePlans.id,
      coachId: practicePlans.coachId,
      athleteId: practicePlans.athleteId,
      title: practicePlans.title,
      sessionDate: practicePlans.sessionDate,
      duration: practicePlans.duration,
      sessionNotes: practicePlans.sessionNotes,
      focusAreas: practicePlans.focusAreas,
      status: practicePlans.status,
      isShared: practicePlans.isShared,
      isTemplate: practicePlans.isTemplate,
      createdAt: practicePlans.createdAt,
      updatedAt: practicePlans.updatedAt,
      athleteName: users.name,
      athleteEmail: users.email,
    })
    .from(practicePlans)
    .leftJoin(users, eq(practicePlans.athleteId, users.id))
    .where(eq(practicePlans.id, planId));

  if (!plan) return null;

  const blocks = await db
    .select()
    .from(practicePlanBlocks)
    .where(eq(practicePlanBlocks.planId, planId))
    .orderBy(practicePlanBlocks.sortOrder);

  return { ...plan, blocks };
}

/** Update a practice plan and optionally replace blocks */
export async function updatePlan(planId: number, input: UpdatePlanInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.athleteId !== undefined) updateData.athleteId = input.athleteId;
  if (input.sessionDate !== undefined) updateData.sessionDate = input.sessionDate;
  if (input.duration !== undefined) updateData.duration = input.duration;
  if (input.sessionNotes !== undefined) updateData.sessionNotes = input.sessionNotes;
  if (input.focusAreas !== undefined) updateData.focusAreas = input.focusAreas;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.isShared !== undefined) updateData.isShared = input.isShared ? 1 : 0;
  if (input.isTemplate !== undefined) updateData.isTemplate = input.isTemplate ? 1 : 0;

  if (Object.keys(updateData).length > 0) {
    await db.update(practicePlans).set(updateData).where(eq(practicePlans.id, planId));
  }

  // Replace blocks if provided
  if (input.blocks !== undefined) {
    await db.delete(practicePlanBlocks).where(eq(practicePlanBlocks.planId, planId));
    if (input.blocks.length > 0) {
      await db.insert(practicePlanBlocks).values(
        input.blocks.map((b: PlanBlockInput) => mapBlockToInsert(b, planId))
      );
    }
  }
}

/** Delete a plan and its blocks */
export async function deletePlan(planId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(practicePlanBlocks).where(eq(practicePlanBlocks.planId, planId));
  await db.delete(practicePlans).where(eq(practicePlans.id, planId));
}

/** Duplicate a plan (for template usage or copy) */
export async function duplicatePlan(
  planId: number,
  coachId: number,
  overrides?: { title?: string; athleteId?: number | null; isTemplate?: boolean }
) {
  const original = await getPlanWithBlocks(planId);
  if (!original) return null;

  const newPlanId = await createPlan({
    coachId,
    athleteId: overrides?.athleteId ?? original.athleteId,
    title: overrides?.title ?? `${original.title} (Copy)`,
    sessionDate: null,
    duration: original.duration,
    sessionNotes: original.sessionNotes,
    focusAreas: original.focusAreas as string[] | null,
    status: "draft",
    isShared: false,
    isTemplate: overrides?.isTemplate ?? false,
    blocks: original.blocks.map((b: typeof practicePlanBlocks.$inferSelect) => ({
      sortOrder: b.sortOrder,
      blockType: b.blockType,
      drillId: b.drillId,
      title: b.title,
      duration: b.duration,
      sets: b.sets,
      reps: b.reps,
      notes: b.notes,
      coachingCues: b.coachingCues,
      keyPoints: b.keyPoints,
      equipment: b.equipment,
      intensity: b.intensity,
      goal: b.goal,
    })),
  });

  return newPlanId;
}

/** Get plans shared with a specific athlete */
export async function getSharedPlansForAthlete(athleteId: number) {
  const db = await getDb();
  if (!db) return [];

  const plans = await db
    .select()
    .from(practicePlans)
    .where(and(eq(practicePlans.athleteId, athleteId), eq(practicePlans.isShared, 1)))
    .orderBy(desc(practicePlans.sessionDate));

  // Fetch blocks for each plan
  const plansWithBlocks = await Promise.all(
    plans.map(async (plan: typeof practicePlans.$inferSelect) => {
      const innerDb = await getDb();
      if (!innerDb) return { ...plan, blocks: [] };
      const blocks = await innerDb
        .select()
        .from(practicePlanBlocks)
        .where(eq(practicePlanBlocks.planId, plan.id))
        .orderBy(practicePlanBlocks.sortOrder);
      return { ...plan, blocks };
    })
  );

  return plansWithBlocks;
}

/** Toggle share status */
export async function toggleSharePlan(planId: number, isShared: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(practicePlans).set({ isShared: isShared ? 1 : 0 }).where(eq(practicePlans.id, planId));
}
