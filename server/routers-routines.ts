import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as routinesDb from "./routines";

const routineDrillInput = z.object({
  drillId: z.string().min(1).max(255),
  drillName: z.string().min(1).max(255),
  order: z.number().int().min(0),
  repsOrDuration: z.string().max(64).nullable().optional(),
  note: z.string().nullable().optional(),
});

const routineInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  durationMinutes: z.number().int().min(0).max(600).nullable().optional(),
  equipment: z.array(z.string()).nullable().optional(),
  space: z.string().max(64).nullable().optional(),
  skillFocus: z.string().max(255).nullable().optional(),
  drills: z.array(routineDrillInput),
});

function requireCoach(role: string) {
  if (role !== "admin" && role !== "coach") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
  }
}

export const routinesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    requireCoach(ctx.user.role);
    return routinesDb.listRoutines();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      // Coaches can view any routine. Athletes can view a routine they've been
      // assigned (checked at the query layer via their drillAssignments) — for
      // now, allow any signed-in user to read routine definitions since they
      // contain no sensitive info.
      void ctx;
      const routine = await routinesDb.getRoutine(input.id);
      if (!routine) throw new TRPCError({ code: "NOT_FOUND", message: "Routine not found" });
      return routine;
    }),

  create: protectedProcedure
    .input(routineInput)
    .mutation(async ({ ctx, input }) => {
      requireCoach(ctx.user.role);
      return routinesDb.createRoutine(input, ctx.user.id);
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number() }).and(routineInput))
    .mutation(async ({ ctx, input }) => {
      requireCoach(ctx.user.role);
      const { id, ...rest } = input;
      return routinesDb.updateRoutine(id, rest);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireCoach(ctx.user.role);
      return routinesDb.deleteRoutine(input.id);
    }),

  assignToAthlete: protectedProcedure
    .input(z.object({
      routineId: z.number(),
      userId: z.number(),
      note: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireCoach(ctx.user.role);
      return routinesDb.assignRoutineToAthlete(input.routineId, input.userId, input.note ?? null);
    }),
});
