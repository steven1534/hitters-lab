import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as routinesDb from "./routines";

const routineDrillInput = z.object({
  drillId: z.string(),
  drillName: z.string(),
  orderIndex: z.number(),
  durationSeconds: z.number().nullable().optional(),
  reps: z.number().nullable().optional(),
  sets: z.number().nullable().optional(),
  coachNotes: z.string().nullable().optional(),
});

export const routinesRouter = router({
  // ── Coach: list all routines ──────────────────────────────
  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const all = await routinesDb.getAllRoutines();
    const withDrills = await Promise.all(
      all.map(async (r) => ({
        ...r,
        drills: await routinesDb.getRoutineDrills(r.id),
        assignments: await routinesDb.getAssignmentsForRoutine(r.id),
      }))
    );
    return withDrills;
  }),

  // ── Coach: get single routine with drills ─────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const routine = await routinesDb.getRoutineById(input.id);
      if (!routine) throw new TRPCError({ code: "NOT_FOUND" });
      const drills = await routinesDb.getRoutineDrills(input.id);
      const assignments = await routinesDb.getAssignmentsForRoutine(input.id);
      return { ...routine, drills, assignments };
    }),

  // ── Coach: create routine ─────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        durationMinutes: z.number().optional(),
        equipment: z.string().optional(),
        location: z.string().optional(),
        routineType: z.string().optional(),
        drills: z.array(routineDrillInput).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { drills, ...routineData } = input;
      const id = await routinesDb.createRoutine({
        ...routineData,
        createdBy: ctx.user.id,
      });
      if (drills && drills.length > 0) {
        await routinesDb.setRoutineDrills(id, drills);
      }
      return { id };
    }),

  // ── Coach: update routine ─────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        durationMinutes: z.number().nullable().optional(),
        equipment: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        routineType: z.string().nullable().optional(),
        drills: z.array(routineDrillInput).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, drills, ...data } = input;
      await routinesDb.updateRoutine(id, data as any);
      if (drills !== undefined) {
        await routinesDb.setRoutineDrills(id, drills);
      }
      return { success: true };
    }),

  // ── Coach: delete routine ─────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await routinesDb.deleteRoutine(input.id);
      return { success: true };
    }),

  // ── Coach: assign routine to athlete ──────────────────────
  assign: protectedProcedure
    .input(z.object({ routineId: z.number(), userId: z.number(), frequency: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const id = await routinesDb.assignRoutine(input.routineId, input.userId, input.frequency);
      return { id };
    }),

  // ── Coach: unassign routine from athlete ──────────────────
  unassign: protectedProcedure
    .input(z.object({ routineId: z.number(), userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await routinesDb.unassignRoutine(input.routineId, input.userId);
      return { success: true };
    }),

  // ── Athlete: get my assigned routines with drills ─────────
  getMyRoutines: protectedProcedure.query(async ({ ctx }) => {
    const assignments = await routinesDb.getAssignmentsForUser(ctx.user.id);
    const result = await Promise.all(
      assignments.map(async (a) => {
        const routine = await routinesDb.getRoutineById(a.routineId);
        if (!routine) return null;
        const drills = await routinesDb.getRoutineDrills(a.routineId);
        return { ...a, routine, drills };
      })
    );
    return result.filter(Boolean);
  }),
});
