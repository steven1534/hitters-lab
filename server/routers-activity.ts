import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as activityTracking from "./activityTracking";

export const activityRouter = router({
  // Log an activity (called from athlete-facing pages)
  logActivity: protectedProcedure
    .input(z.object({
      activityType: z.enum([
        "portal_login",
        "drill_view",
        "assignment_view",
        "drill_start",
        "drill_complete",
        "video_submit",
        "message_sent",
        "profile_update",
      ]),
      relatedId: z.string().optional(),
      relatedType: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ipAddress = ctx.req.ip || (ctx.req.headers['x-forwarded-for'] as string) || undefined;
      const userAgent = ctx.req.headers['user-agent'] || undefined;
      
      const success = await activityTracking.logActivity(
        ctx.user.id,
        input.activityType as activityTracking.ActivityType,
        {
          relatedId: input.relatedId,
          relatedType: input.relatedType,
          metadata: input.metadata,
          ipAddress,
          userAgent,
        }
      );
      return { success };
    }),

  // Get recent activities (coach only)
  getRecentActivities: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'coach') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Coach access required' });
      }
      return await activityTracking.getRecentActivities(input?.limit || 50);
    }),

  // Get activity summary stats (coach only)
  getActivitySummary: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin' && ctx.user.role !== 'coach') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Coach access required' });
    }
    return await activityTracking.getActivitySummary();
  }),

  // Get activities for a specific athlete (coach only)
  getAthleteActivities: protectedProcedure
    .input(z.object({ athleteId: z.number(), limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'coach') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Coach access required' });
      }
      return await activityTracking.getAthleteActivities(input.athleteId, input.limit || 20);
    }),

  // Get inactive athletes (coach only)
  getInactiveAthletes: protectedProcedure
    .input(z.object({ days: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'coach') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Coach access required' });
      }
      return await activityTracking.getInactiveAthletes(input?.days || 3);
    }),

  // Get coach alert preferences
  getAlertPreferences: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin' && ctx.user.role !== 'coach') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Coach access required' });
    }
    return await activityTracking.getCoachAlertPreferences(ctx.user.id);
  }),

  // Update coach alert preferences
  updateAlertPreferences: protectedProcedure
    .input(z.object({
      alertOnPortalLogin: z.number().optional(),
      alertOnDrillView: z.number().optional(),
      alertOnAssignmentView: z.number().optional(),
      alertOnDrillStart: z.number().optional(),
      alertOnDrillComplete: z.number().optional(),
      alertOnVideoSubmit: z.number().optional(),
      alertOnMessageSent: z.number().optional(),
      alertOnInactivity: z.number().optional(),
      inactivityDays: z.number().optional(),
      inAppAlerts: z.number().optional(),
      emailDigest: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'coach') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Coach access required' });
      }
      const success = await activityTracking.updateCoachAlertPreferences(ctx.user.id, input);
      return { success };
    }),
});
