import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as practicePlanDb from "./practicePlans";

const blockSchema = z.object({
  sortOrder: z.number(),
  blockType: z.enum(["drill", "warmup", "cooldown", "break", "custom"]),
  drillId: z.string().nullable().optional(),
  title: z.string(),
  duration: z.number().min(1),
  sets: z.number().nullable().optional(),
  reps: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  coachingCues: z.string().nullable().optional(),
  keyPoints: z.string().nullable().optional(),
  equipment: z.string().nullable().optional(),
  intensity: z.enum(["low", "medium", "high"]).nullable().optional(),
  goal: z.string().nullable().optional(),
});

export const practicePlansRouter = router({
  /** Create a new practice plan */
  create: protectedProcedure
    .input(
      z.object({
        athleteId: z.number().nullable().optional(),
        title: z.string().min(1),
        sessionDate: z.string().nullable().optional(), // ISO string
        duration: z.number().min(1),
        sessionNotes: z.string().nullable().optional(),
        focusAreas: z.array(z.string()).nullable().optional(),
        status: z.enum(["draft", "scheduled", "completed", "cancelled"]).optional(),
        isShared: z.boolean().optional(),
        isTemplate: z.boolean().optional(),
        blocks: z.array(blockSchema),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
      }
      const planId = await practicePlanDb.createPlan({
        coachId: ctx.user.id,
        athleteId: input.athleteId ?? null,
        title: input.title,
        sessionDate: input.sessionDate ? new Date(input.sessionDate) : null,
        duration: input.duration,
        sessionNotes: input.sessionNotes ?? null,
        focusAreas: input.focusAreas ?? null,
        status: input.status ?? "draft",
        isShared: input.isShared ?? false,
        isTemplate: input.isTemplate ?? false,
        blocks: input.blocks,
      });
      return { success: true, planId };
    }),

  /** Get all plans for the coach */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
    }
    return await practicePlanDb.getCoachPlans(ctx.user.id);
  }),

  /** Get all templates */
  getTemplates: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
    }
    return await practicePlanDb.getCoachTemplates(ctx.user.id);
  }),

  /** Get a single plan with blocks */
  getById: protectedProcedure
    .input(z.object({ planId: z.number() }))
    .query(async ({ ctx, input }) => {
      const plan = await practicePlanDb.getPlanWithBlocks(input.planId);
      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }
      // Coach can see any plan they created
      if (ctx.user.role === "admin" && plan.coachId === ctx.user.id) {
        return plan;
      }
      // Athlete can see shared plans assigned to them
      if (plan.athleteId === ctx.user.id && plan.isShared) {
        return plan;
      }
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
    }),

  /** Update a plan */
  update: protectedProcedure
    .input(
      z.object({
        planId: z.number(),
        title: z.string().min(1).optional(),
        athleteId: z.number().nullable().optional(),
        sessionDate: z.string().nullable().optional(),
        duration: z.number().min(1).optional(),
        sessionNotes: z.string().nullable().optional(),
        focusAreas: z.array(z.string()).nullable().optional(),
        status: z.enum(["draft", "scheduled", "completed", "cancelled"]).optional(),
        isShared: z.boolean().optional(),
        isTemplate: z.boolean().optional(),
        blocks: z.array(blockSchema).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
      }
      const { planId, ...updateData } = input;
      await practicePlanDb.updatePlan(planId, {
        ...updateData,
        sessionDate: updateData.sessionDate ? new Date(updateData.sessionDate) : updateData.sessionDate === null ? null : undefined,
      });
      return { success: true };
    }),

  /** Delete a plan */
  delete: protectedProcedure
    .input(z.object({ planId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
      }
      await practicePlanDb.deletePlan(input.planId);
      return { success: true };
    }),

  /** Duplicate a plan */
  duplicate: protectedProcedure
    .input(
      z.object({
        planId: z.number(),
        title: z.string().optional(),
        athleteId: z.number().nullable().optional(),
        isTemplate: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
      }
      const newPlanId = await practicePlanDb.duplicatePlan(input.planId, ctx.user.id, {
        title: input.title,
        athleteId: input.athleteId,
        isTemplate: input.isTemplate,
      });
      if (!newPlanId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Original plan not found" });
      }
      return { success: true, planId: newPlanId };
    }),

  /** Toggle share with athlete */
  toggleShare: protectedProcedure
    .input(z.object({ planId: z.number(), isShared: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
      }
      await practicePlanDb.toggleSharePlan(input.planId, input.isShared);
      
      // Send email notification when sharing a plan with an athlete
      if (input.isShared) {
        try {
          const plan = await practicePlanDb.getPlanWithBlocks(input.planId);
          if (plan && plan.athleteId) {
            const { getUserById } = await import('./db');
            const athlete = await getUserById(plan.athleteId);
            if (athlete?.email) {
              const { sendPracticePlanShareEmail } = await import('./email');
              await sendPracticePlanShareEmail({
                athleteEmail: athlete.email,
                athleteName: athlete.name || 'Athlete',
                planTitle: plan.title,
                sessionDate: plan.sessionDate ? new Date(plan.sessionDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : undefined,
                focusAreas: (Array.isArray(plan.focusAreas) ? plan.focusAreas : []) as string[],
                totalDuration: plan.duration,
                blockCount: plan.blocks?.length || 0,
                coachName: ctx.user.name || 'Coach',
                portalUrl: `${ctx.req.protocol}://${ctx.req.get('host')}/athlete-portal`,
              });
            }
          }
        } catch (emailError) {
          console.warn('[PracticePlans] Failed to send share notification email:', emailError);
          // Don't fail the share operation if email fails
        }
      }
      return { success: true };
    }),

  /** Get shared plans for the current athlete */
  getMySharedPlans: protectedProcedure.query(async ({ ctx }) => {
    return await practicePlanDb.getSharedPlansForAthlete(ctx.user.id);
  }),
});
