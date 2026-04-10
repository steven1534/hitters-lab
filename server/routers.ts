import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import * as drillAssignmentDb from "./drillAssignments";
import * as drillPageLayoutDb from "./drillPageLayouts";
import * as drillPageTemplateDb from "./drillPageTemplates";
import * as inviteDb from "./invites";
import { drillGeneratorRouter } from "./routers-drill-generator";
import { submissionsRouter } from "./routers-submissions";
import { videoUploadRouter } from "./routers-video-upload";
import { notificationsRouter } from "./routers-notifications";
import { qaRouter } from "./routers-qa";
import { imageUploadRouter } from "./routers-image-upload";
import { activityRouter } from "./routers-activity";
import { favoritesRouter } from "./routers-favorites";
import { practicePlansRouter } from "./routers-practice-plans";
import { sessionNotesRouter } from "./routers-session-notes";
import { progressReportsRouter } from "./routers-progress-reports";
import { athleteProfilesRouter } from "./routers-athlete-profiles";
import { videoAnalysisRouter } from "./routers-video-analysis";
import { blastMetricsRouter } from "./routers-blast-metrics";
import { playerReportsRouter } from "./routers-player-reports";
import { badgesRouter } from "./routers-badges";
import { siteContentRouter } from "./routers-site-content";
import { progressRouter } from "./routers-progress";
// drillCustomizations import removed — superseded by drillCatalogOverrides
import * as drillCatalogOverridesDb from "./drillCatalogOverrides";
import * as drillStatCardsDb from "./drillStatCards";
import { storagePut } from "./storage";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  siteContent: siteContentRouter,
  notifications: notificationsRouter,
  imageUpload: imageUploadRouter,
  activity: activityRouter,
  favorites: favoritesRouter,
  practicePlans: practicePlansRouter,
  sessionNotes: sessionNotesRouter,
  progressReports: progressReportsRouter,
  athleteProfiles: athleteProfilesRouter,
  badges: badgesRouter,
  progress: progressRouter,
  auth: router({
    me: publicProcedure.query(async (opts) => {
      if (!opts.ctx.user) return null;
      // Fetch full user record from database to include role
      const fullUser = await db.getUserById(opts.ctx.user.id);
      return fullUser || opts.ctx.user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(COOKIE_NAME + "_real", { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),

    // ── Impersonation (admin only) ──────────────────────────
    impersonate: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const target = await db.getUserById(input.userId);
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        const { createSessionToken } = await import("./_core/auth");
        const cookieOptions = getSessionCookieOptions(ctx.req);
        const longOptions = { ...cookieOptions, maxAge: 1000 * 60 * 60 * 24 * 365 };
        // Save the real admin session in a separate cookie
        const { parse: parseCookies } = await import("cookie");
        const cookies = parseCookies(ctx.req.headers.cookie ?? "");
        const currentToken = cookies[COOKIE_NAME] ?? "";
        ctx.res.cookie(COOKIE_NAME + "_real", currentToken, longOptions);
        // Set the impersonation session
        const impersonateToken = await createSessionToken(target.id, target.email!);
        ctx.res.cookie(COOKIE_NAME, impersonateToken, longOptions);
        return { success: true, user: { id: target.id, email: target.email, name: target.name, role: target.role } };
      }),

    stopImpersonating: protectedProcedure.mutation(async ({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      const longOptions = { ...cookieOptions, maxAge: 1000 * 60 * 60 * 24 * 365 };
      const { parse: parseCookies } = await import("cookie");
      const cookies = parseCookies(ctx.req.headers.cookie ?? "");
      const realToken = cookies[COOKIE_NAME + "_real"];
      if (!realToken) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Not currently impersonating" });
      }
      // Restore real admin session
      ctx.res.cookie(COOKIE_NAME, realToken, longOptions);
      ctx.res.clearCookie(COOKIE_NAME + "_real", { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),

    isImpersonating: publicProcedure.query(async ({ ctx }) => {
      const { parse: parseCookies } = await import("cookie");
      const cookies = parseCookies(ctx.req.headers.cookie ?? "");
      const realToken = cookies[COOKIE_NAME + "_real"];
      if (!realToken) return { impersonating: false, realUser: null };
      const { verifySessionToken } = await import("./_core/auth");
      const session = await verifySessionToken(realToken);
      if (!session) return { impersonating: false, realUser: null };
      const realUser = await db.getUserById(session.userId);
      if (!realUser || realUser.role !== "admin") return { impersonating: false, realUser: null };
      return { impersonating: true, realUser: { id: realUser.id, email: realUser.email, name: realUser.name, role: realUser.role } };
    }),
  }),

  // Admin router for managing client access
  admin: router({
    getAllUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      return await db.getAllUsers();
    }),
    toggleClientAccess: protectedProcedure
      .input(z.object({ userId: z.number(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const success = await db.toggleClientAccess(input.userId, input.isActive);
        
        // Auto-send welcome email when activating a user
        if (success && input.isActive) {
          const user = await db.getUserById(input.userId);
          if (user && user.email && !user.sentWelcomeEmail) {
            const { sendWelcomeEmail: sendEmail } = await import('./email');
            const emailResult = await sendEmail({
              athleteEmail: user.email,
              athleteName: user.name || 'Athlete',
              portalUrl: 'https://app.coachstevebaseball.com/athlete-portal',
            });
            if (emailResult.success) {
              await db.markWelcomeEmailSent(input.userId);
            }
          }
        }
        
        return { success };
      }),
    convertToAthlete: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        await db.convertUserToAthlete(input.userId);
        return { success: true };
      }),
    updateUserRole: protectedProcedure
      .input(z.object({ userId: z.number(), role: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        await db.updateUserRole(input.userId, input.role as any);
        return { success: true };
      }),
    sendWelcomeEmail: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }
        if (!user.email) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'User email not found' });
        }
        const { sendWelcomeEmail: sendEmail } = await import('./email');
        const result = await sendEmail({
          athleteEmail: user.email,
          athleteName: user.name || 'Athlete',
          portalUrl: 'https://app.coachstevebaseball.com/athlete-portal',
        });
        if (result.success) {
          await db.markWelcomeEmailSent(input.userId);
        }
        return result;
      }),
    bulkImportDescriptions: protectedProcedure
      .input(z.object({ drillsData: z.array(z.object({ drillName: z.string(), description: z.string() })) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await db.bulkImportDrillDescriptions(input.drillsData);
      }),
    bulkImportGoals: protectedProcedure
      .input(z.object({ goalsData: z.array(z.object({ drillName: z.string(), goal: z.string() })) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await db.bulkImportDrillGoals(input.goalsData);
      }),
    triggerStreakReminders: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const { runStreakReminderJob } = await import('./streakReminderJob');
        await runStreakReminderJob();
        return { success: true };
      }),
  }),

  // Drill assignment router for coach dashboard
  drillAssignments: router({
    assignDrill: protectedProcedure
      .input(z.object({
        userId: z.number().nullable().optional(),
        inviteId: z.number().optional(),
        drillId: z.string(),
        drillName: z.string(),
        notes: z.string().optional(),
        difficulty: z.string().optional(),
        duration: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        // Must have either userId or inviteId
        if (!input.userId && !input.inviteId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Must provide either userId or inviteId' });
        }
        await drillAssignmentDb.assignDrill(
          input.userId || null,
          input.drillId,
          input.drillName,
          input.notes,
          ctx.user.name || 'Coach',
          { difficulty: input.difficulty || 'Unknown', duration: input.duration || 'Unknown' },
          input.inviteId
        );
        return { success: true };
      }),
    
    unassignDrill: protectedProcedure
      .input(z.object({ assignmentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        await drillAssignmentDb.unassignDrill(input.assignmentId);
        return { success: true };
      }),

    sendFollowUpReminder: protectedProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        // Get athlete info
        const athlete = await db.getUserById(input.userId);
        if (!athlete) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Athlete not found' });
        }
        // Get incomplete assignments for this athlete
        const assignments = await drillAssignmentDb.getUserAssignments(input.userId);
        const incompleteDrills = assignments.filter((a: any) => a.status !== 'completed');
        if (incompleteDrills.length === 0) {
          return { success: false, message: 'No incomplete drills to remind about' };
        }
        const { sendDrillFollowUpReminder } = await import('./email');
        const result = await sendDrillFollowUpReminder({
          athleteEmail: athlete.email || '',
          athleteName: athlete.name || 'Athlete',
          drills: incompleteDrills.map((d: any) => ({
            name: d.drillName || d.drill_name || 'Drill',
            assignedDate: new Date(d.assignedAt || d.assigned_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: d.status || 'assigned',
          })),
          coachName: ctx.user.name || 'Coach',
          portalUrl: `${ctx.req.protocol}://${ctx.req.get('host')}/athlete-portal`,
        });
        return { success: result.success, error: result.error };
      }),
    
    updateStatus: protectedProcedure
      .input(z.object({ assignmentId: z.number(), status: z.enum(["assigned", "in-progress", "completed"]), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        // Allow admins to update any assignment
        if (ctx.user.role === 'admin') {
          await drillAssignmentDb.updateAssignmentStatus(input.assignmentId, input.status, input.notes);
          return { success: true };
        }
        
        // Allow athletes to update their own assignments
        const assignment = await drillAssignmentDb.getAssignmentById(input.assignmentId);
        if (!assignment) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Assignment not found' });
        }
        if (assignment.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only update your own assignments' });
        }
        
        await drillAssignmentDb.updateAssignmentStatus(input.assignmentId, input.status, input.notes);
        return { success: true };
      }),

    getAssignedDrills: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'athlete') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Athlete access required' });
      }
      return await drillAssignmentDb.getUserAssignments(ctx.user.id);
    }),

    getAllAssignments: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      return await drillAssignmentDb.getAllAssignments();
    }),

    getAthleteAssignmentOverview: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      return await drillAssignmentDb.getAthleteAssignmentOverview();
    }),

    getUserAssignments: protectedProcedure.query(async ({ ctx }) => {
      return await drillAssignmentDb.getUserAssignments(ctx.user.id);
    }),

    getStreak: protectedProcedure.query(async ({ ctx }) => {
      return await drillAssignmentDb.calculateStreak(ctx.user.id);
    }),

    getAthleteProgress: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await drillAssignmentDb.getAthleteProgressStats(input.userId);
      }),

    // Coach notes for athlete progress tracking
    getCoachNotes: protectedProcedure
      .input(z.object({ athleteId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await drillAssignmentDb.getCoachNotes(input.athleteId);
      }),

    addCoachNote: protectedProcedure
      .input(z.object({
        athleteId: z.number(),
        note: z.string(),
        meetingDate: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await drillAssignmentDb.addCoachNote({
          athleteId: input.athleteId,
          coachId: ctx.user.id,
          note: input.note,
          meetingDate: input.meetingDate,
        });
      }),

    updateCoachNote: protectedProcedure
      .input(z.object({
        noteId: z.number(),
        note: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await drillAssignmentDb.updateCoachNote(input.noteId, input.note);
      }),

    deleteCoachNote: protectedProcedure
      .input(z.object({ noteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await drillAssignmentDb.deleteCoachNote(input.noteId);
      }),

    // Weekly goals for athlete drill targets
    getWeeklyGoals: protectedProcedure
      .input(z.object({ athleteId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await drillAssignmentDb.getWeeklyGoals(input.athleteId);
      }),

    getCurrentWeekGoal: protectedProcedure
      .input(z.object({ athleteId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await drillAssignmentDb.getCurrentWeekGoal(input.athleteId);
      }),

    createWeeklyGoal: protectedProcedure
      .input(z.object({
        athleteId: z.number(),
        weekStartDate: z.date(),
        weekEndDate: z.date(),
        targetDrillCount: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await drillAssignmentDb.createWeeklyGoal({
          athleteId: input.athleteId,
          coachId: ctx.user.id,
          weekStartDate: input.weekStartDate,
          weekEndDate: input.weekEndDate,
          targetDrillCount: input.targetDrillCount,
          notes: input.notes,
        });
      }),

    updateWeeklyGoal: protectedProcedure
      .input(z.object({
        goalId: z.number(),
        targetDrillCount: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await drillAssignmentDb.updateWeeklyGoal(input.goalId, {
          targetDrillCount: input.targetDrillCount,
          notes: input.notes,
        });
      }),

    deleteWeeklyGoal: protectedProcedure
      .input(z.object({ goalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await drillAssignmentDb.deleteWeeklyGoal(input.goalId);
      }),
  }),

  // Submissions router
  submissions: submissionsRouter,

  // Video upload router
  videoUpload: videoUploadRouter,

  // AI Video Analysis router
  videoAnalysis: videoAnalysisRouter,
  blastMetrics: blastMetricsRouter,
  playerReports: playerReportsRouter,

  // Q&A router
  qa: qaRouter,

  // Drill generator router
  drillGenerator: drillGeneratorRouter,

  // Drill details router
  drillDetails: router({
    getDrillDetail: publicProcedure
      .input(z.object({ drillId: z.string() }))
      .query(async ({ input }) => {
        return await db.getDrillDetail(input.drillId);
      }),
    saveDrillInstructions: protectedProcedure
      .input(z.object({
        drillId: z.string(),
        skillSet: z.string().optional(),
        difficulty: z.string().optional(),
        athletes: z.string().optional(),
        time: z.string().optional(),
        equipment: z.string().optional(),
        goal: z.string().optional(),
        description: z.array(z.string()).optional(),
        commonMistakes: z.array(z.string()).optional(),
        progressions: z.array(z.string()).optional(),
        instructions: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        await db.saveDrillDetail(input.drillId, input as any, ctx.user.id);
        return { success: true };
      }),
    bulkUpdateGoals: protectedProcedure
      .input(z.object({ goals: z.record(z.string(), z.string()) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const results: Array<{ drillName: string; success: boolean; error?: string }> = [];
        for (const [drillName, goal] of Object.entries(input.goals)) {
          try {
            await db.updateDrillGoal(drillName, goal as string);
            results.push({ drillName, success: true });
          } catch (error) {
            results.push({ drillName, success: false, error: String(error) });
          }
        }
        return { results };
      }),
    bulkUpdateInstructions: protectedProcedure
      .input(z.object({ instructions: z.record(z.string(), z.string()) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const results: Array<{ drillName: string; success: boolean; error?: string }> = [];
        for (const [drillName, instruction] of Object.entries(input.instructions)) {
          try {
            await db.updateDrillInstructions(drillName, instruction as string);
            results.push({ drillName, success: true });
          } catch (error) {
            results.push({ drillName, success: false, error: String(error) });
          }
        }
        return { results };
      }),
    createNewDrill: protectedProcedure
      .input(z.object({
        name: z.string(),
        difficulty: z.string(),
        category: z.string(),
        duration: z.string(),
        goal: z.string().optional(),
        instructions: z.string().optional(),
        videoUrl: z.string().optional(),
        purpose: z.string().optional(),
        bestFor: z.string().optional(),
        equipment: z.string().optional(),
        athletes: z.string().optional(),
        description: z.array(z.string()).optional(),
        drillType: z.string().optional(),
        drillTypeRaw: z.string().optional(),
        skillSet: z.string().optional(),
        ageLevel: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        problem: z.array(z.string()).optional(),
        goalTags: z.array(z.string()).optional(),
        whatThisFixes: z.array(z.string()).optional(),
        whatToFeel: z.array(z.string()).optional(),
        commonMistakes: z.array(z.string()).optional(),
        coachCue: z.string().optional(),
        watchFor: z.string().optional(),
        nextSteps: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'coach') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Coach access required' });
        }
        const result = await db.createNewDrill(input, ctx.user.id);
        return result;
      }),
    getCustomDrills: publicProcedure
      .query(async () => {
        return await db.getCustomDrills();
      }),
    bulkImportCustomDrills: protectedProcedure
      .input(z.object({
        drills: z.array(z.object({
          drillId: z.string(),
          name: z.string(),
          difficulty: z.string(),
          category: z.string(),
          duration: z.string(),
          videoUrl: z.string().optional(),
        }))
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await db.bulkImportCustomDrills(input.drills, ctx.user.id);
      }),
    // Drill page layout procedures
    savePageLayout: protectedProcedure
      .input(z.object({
        drillId: z.string(),
        blocks: z.array(z.any()),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await drillPageLayoutDb.saveDrillPageLayout(input.drillId, input.blocks, ctx.user.id);
      }),
    getPageLayout: publicProcedure
      .input(z.object({ drillId: z.string() }))
      .query(async ({ input }) => {
        return await drillPageLayoutDb.getDrillPageLayout(input.drillId);
      }),
    // Drill page template procedures
    createTemplate: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        blocks: z.array(z.any()),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'coach') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Coach or admin access required' });
        }
        return await drillPageTemplateDb.createTemplate({
          ...input,
          createdBy: ctx.user.id,
        });
      }),
    getTemplates: protectedProcedure
      .query(async ({ ctx }) => {
        return await drillPageTemplateDb.getTemplates(ctx.user.id);
      }),
    deleteTemplate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'coach') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Coach or admin access required' });
        }
        return await drillPageTemplateDb.deleteTemplate(input.id, ctx.user.id);
      }),
    deletePageLayout: protectedProcedure
      .input(z.object({ drillId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await drillPageLayoutDb.deleteDrillPageLayout(input.drillId);
      }),
    getStatCards: publicProcedure
      .input(z.object({ drillId: z.string() }))
      .query(async ({ input }) => {
        return await drillStatCardsDb.getStatCards(input.drillId);
      }),
    saveStatCards: protectedProcedure
      .input(z.object({
        drillId: z.string(),
        cards: z.array(z.object({
          label: z.string(),
          value: z.string(),
          icon: z.string().optional(),
          position: z.number(),
          isVisible: z.number(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'coach') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Coach or admin access required' });
        }
        return await drillStatCardsDb.upsertStatCards(input.drillId, input.cards);
      }),
  }),

  // Videos router
  videos: router({
    getVideo: publicProcedure
      .input(z.object({ drillId: z.string() }))
      .query(async ({ input }) => {
        return await db.getDrillVideo(input.drillId);
      }),
    saveVideo: protectedProcedure
      .input(z.object({ drillId: z.string(), videoUrl: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        await db.saveOrUpdateDrillVideo(input.drillId, input.videoUrl, ctx.user.id);
        return { success: true };
      }),
    getAllVideos: publicProcedure.query(async () => {
      return await db.getAllDrillVideos();
    }),
    deleteVideo: protectedProcedure
      .input(z.object({ drillId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        await db.deleteDrillVideo(input.drillId);
        return { success: true };
      }),
  }),

  // Invite management router
  invites: router({
    createInvite: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await inviteDb.createInvite(input.email, ctx.user.id);
      }),
    
    getAllInvites: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      return await inviteDb.getAllInvites();
    }),
    
    getInviteByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const invite = await inviteDb.getInviteByToken(input.token);
        if (!invite) {
          return { valid: false, email: null, expiresAt: null };
        }
        return { valid: inviteDb.isInviteValid(invite), ...invite };
      }),
    
    acceptInvite: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return await inviteDb.acceptInvite(input.token, ctx.user.id);
      }),
    
    resendInvite: protectedProcedure
      .input(z.object({ inviteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await inviteDb.resendInvite(input.inviteId);
      }),
    
    revokeInvite: protectedProcedure
      .input(z.object({ inviteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        await inviteDb.revokeInvite(input.inviteId);
        return { success: true };
      }),
    
    deleteInvite: protectedProcedure
      .input(z.object({ inviteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        await inviteDb.deleteInvite(input.inviteId);
        return { success: true };
      }),
    
    verifyEmail: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const user = await inviteDb.verifyEmailWithToken(input.token);
          return { success: true, userId: user.id };
        } catch (error) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error instanceof Error ? error.message : 'Email verification failed' });
        }
      }),
    
    sendExpirationReminders: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const expiringInvites = await inviteDb.getExpiringInvites();
        let sent = 0;
        for (const invite of expiringInvites) {
          try {
            await inviteDb.sendExpirationReminder(invite.id);
            sent++;
          } catch (error) {
            console.error('Error sending expiration reminder:', error);
          }
        }
        return { success: true, remindersSent: sent };
      }),
  }),

  // DEPRECATED: drillCustomizations superseded by drillCatalogOverrides + Manus data.
  // Kept as empty stubs so old clients don't crash during rollout.
  drillCustomizations: router({
    get: publicProcedure
      .input(z.object({ drillId: z.string() }))
      .query(async () => null),
    getAll: publicProcedure.query(async () => []),
    save: protectedProcedure
      .input(z.object({ drillId: z.string(), thumbnailUrl: z.string().nullable().optional(), briefDescription: z.string().nullable().optional(), difficulty: z.string().nullable().optional(), category: z.string().nullable().optional() }))
      .mutation(async () => ({ success: true })),
    uploadThumbnail: protectedProcedure
      .input(z.object({ drillId: z.string(), imageBase64: z.string(), mimeType: z.string() }))
      .mutation(async () => ({ url: '' })),
    delete: protectedProcedure
      .input(z.object({ drillId: z.string() }))
      .mutation(async () => ({ success: true })),
  }),

  /** Phase 1 — catalog field overrides (same drillId as static drills.ts / custom drills) */
  drillCatalog: router({
    getAll: publicProcedure.query(async () => {
      return await drillCatalogOverridesDb.getAllCatalogOverrides();
    }),
    get: publicProcedure
      .input(z.object({ drillId: z.string() }))
      .query(async ({ input }) => {
        return await drillCatalogOverridesDb.getCatalogOverride(input.drillId);
      }),
    upsert: protectedProcedure
      .input(
        z.object({
          drillId: z.string(),
          name: z.string().nullable(),
          difficulty: z.string().nullable(),
          categories: z.array(z.string()).nullable(),
          duration: z.string().nullable(),
          tags: z.array(z.string()).nullable(),
          externalUrl: z.string().nullable(),
          hiddenFromDirectory: z.number().int().min(0).max(1),
          purpose: z.string().nullable().optional(),
          bestFor: z.string().nullable().optional(),
          equipment: z.string().nullable().optional(),
          coachCue: z.string().nullable().optional(),
          watchFor: z.string().nullable().optional(),
          whatThisFixes: z.array(z.string()).nullable().optional(),
          whatToFeel: z.array(z.string()).nullable().optional(),
          commonMistakes: z.array(z.string()).nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "coach") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
        }
        return await drillCatalogOverridesDb.upsertCatalogOverride(
          input.drillId,
          {
            name: input.name,
            difficulty: input.difficulty,
            categories: input.categories,
            duration: input.duration,
            tags: input.tags,
            externalUrl: input.externalUrl,
            hiddenFromDirectory: input.hiddenFromDirectory,
            purpose: input.purpose ?? null,
            bestFor: input.bestFor ?? null,
            equipment: input.equipment ?? null,
            coachCue: input.coachCue ?? null,
            watchFor: input.watchFor ?? null,
            whatThisFixes: input.whatThisFixes ?? null,
            whatToFeel: input.whatToFeel ?? null,
            commonMistakes: input.commonMistakes ?? null,
          },
          ctx.user.id
        );
      }),
    delete: protectedProcedure
      .input(z.object({ drillId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        await drillCatalogOverridesDb.deleteCatalogOverride(input.drillId);
        return { success: true as const };
      }),
  }),

  // Parent Management router
  parentManagement: router({
    // Link a child account to parent
    linkChild: protectedProcedure
      .input(z.object({ childUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.linkChildToParent(input.childUserId, ctx.user.id);
        if (!success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to link child account' });
        }
        return { success: true };
      }),

    // Get all children managed by current user
    getMyChildren: protectedProcedure.query(async ({ ctx }) => {
      return await db.getChildrenByParent(ctx.user.id);
    }),

    // Get drill assignments for a child (parent can view)
    getChildAssignments: protectedProcedure
      .input(z.object({ childUserId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify parent-child relationship
        const isParent = await db.isParentOf(ctx.user.id, input.childUserId);
        if (!isParent) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to view this child\'s assignments' });
        }
        return await drillAssignmentDb.getUserAssignments(input.childUserId);
      }),

    // Mark drill complete on behalf of child
    markChildDrillComplete: protectedProcedure
      .input(z.object({ 
        childUserId: z.number(),
        assignmentId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify parent-child relationship
        const isParent = await db.isParentOf(ctx.user.id, input.childUserId);
        if (!isParent) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to manage this child\'s drills' });
        }
        
        // Mark assignment as completed
        const success = await drillAssignmentDb.updateAssignmentStatus(input.assignmentId, 'completed');
        if (!success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to mark drill complete' });
        }
        return { success: true };
      }),

    // Update drill status on behalf of child
    updateChildDrillStatus: protectedProcedure
      .input(z.object({ 
        childUserId: z.number(),
        assignmentId: z.number(),
        status: z.enum(['assigned', 'in-progress', 'completed']),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify parent-child relationship
        const isParent = await db.isParentOf(ctx.user.id, input.childUserId);
        if (!isParent) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to manage this child\'s drills' });
        }
        
        const success = await drillAssignmentDb.updateAssignmentStatus(input.assignmentId, input.status);
        if (!success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update drill status' });
        }
        return { success: true };
      }),

    // Get child's progress data (for parent view)
    getChildProgress: protectedProcedure
      .input(z.object({ childUserId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify parent-child relationship
        const isParent = await db.isParentOf(ctx.user.id, input.childUserId);
        if (!isParent) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to view this child\'s progress' });
        }
        return await drillAssignmentDb.getAthleteProgressStats(input.childUserId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
