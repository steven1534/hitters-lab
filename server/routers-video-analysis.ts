/**
 * Video Analysis Router — tRPC procedures for the AI video analysis pipeline.
 *
 * Endpoints:
 *   analyzeVideo        — Trigger Gemini analysis on a submission (coach only)
 *   triggerAnalysis      — Auto-trigger after athlete uploads (creates pending record)
 *   getPendingReviews    — List submissions with AI feedback awaiting coach review
 *   getAnalysis          — Get a single analysis by ID
 *   getAnalysisBySubmission — Get analysis for a specific submission
 *   getAthleteAnalyses   — Athlete views their approved/sent feedback
 *   updateFeedback       — Coach edits the AI-generated feedback
 *   approveFeedback      — Coach approves feedback (marks ready to send)
 *   sendFeedback         — Send approved feedback via email to athlete
 *   retryAnalysis        — Retry a failed analysis
 */

import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { videoAnalysis } from "../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { analyzeAthleteVideo, formatAnalysisForCoachEdit } from "./videoAnalysisService";
import * as db from "./db";

// ── Helpers ──────────────────────────────────────────────────

async function requireDb() {
  const database = await getDb();
  if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return database;
}

function requireCoach(role: string) {
  if (role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
  }
}

// ── Router ───────────────────────────────────────────────────

export const videoAnalysisRouter = router({
  /**
   * Submit a standalone swing video for AI analysis (no drill required).
   * Athletes can upload any hitting video from their portal.
   */
  submitSwing: protectedProcedure
    .input(z.object({
      videoUrl: z.string().min(1, "Video URL is required"),
      swingType: z.string().optional(),
      athleteNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await requireDb();

      const result = await database.insert(videoAnalysis).values({
        athleteId: ctx.user.id,
        videoUrl: input.videoUrl,
        swingType: input.swingType || null,
        athleteNotes: input.athleteNotes || null,
        isStandalone: 1,
        submissionId: null,
        drillId: null,
        status: "pending",
      });

      const insertId = result[0].insertId;
      return { id: insertId, status: "pending" as const };
    }),

  /**
   * Get all swing submissions for the current athlete (all statuses).
   * Athletes can see their pending/analyzing/failed swings too (not just approved).
   */
  getMySwings: protectedProcedure
    .query(async ({ ctx }) => {
      const database = await requireDb();

      const results = await database.select()
        .from(videoAnalysis)
        .where(
          and(
            eq(videoAnalysis.athleteId, ctx.user.id),
            eq(videoAnalysis.isStandalone, 1)
          )
        )
        .orderBy(desc(videoAnalysis.createdAt));

      return results;
    }),

  /**
   * Create a pending analysis record when an athlete submits a video.
   * Called automatically after video upload. Any authenticated user can trigger.
   */
  triggerAnalysis: protectedProcedure
    .input(z.object({
      submissionId: z.number(),
      drillId: z.string(),
      videoUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await requireDb();

      // Check if analysis already exists for this submission
      const existing = await database.select()
        .from(videoAnalysis)
        .where(eq(videoAnalysis.submissionId, input.submissionId))
        .limit(1);

      if (existing.length > 0) {
        return { id: existing[0].id, status: existing[0].status };
      }

      const result = await database.insert(videoAnalysis).values({
        submissionId: input.submissionId,
        athleteId: ctx.user.id,
        drillId: input.drillId,
        videoUrl: input.videoUrl,
        status: "pending",
      });

      const insertId = result[0].insertId;
      return { id: insertId, status: "pending" as const };
    }),

  /**
   * Run Gemini analysis on a pending submission. Coach only.
   * This is the main analysis trigger — processes the video through the LLM.
   */
  analyzeVideo: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireCoach(ctx.user.role);
      const database = await requireDb();

      // Get the analysis record
      const [record] = await database.select()
        .from(videoAnalysis)
        .where(eq(videoAnalysis.id, input.analysisId))
        .limit(1);

      if (!record) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis record not found" });
      }

      if (record.status !== "pending" && record.status !== "failed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot analyze: current status is "${record.status}"` });
      }

      // Mark as analyzing
      await database.update(videoAnalysis)
        .set({ status: "analyzing", coachId: ctx.user.id, updatedAt: new Date() })
        .where(eq(videoAnalysis.id, input.analysisId));

      try {
        // Get athlete info for context
        const allUsers = await db.getAllUsers();
        const athlete = allUsers.find(u => u.id === record.athleteId);

        // Get athlete profile for additional context
        let athleteAge: string | undefined;
        let athletePosition: string | undefined;
        try {
          const { athleteProfiles } = await import("../drizzle/schema");
          const [profile] = await database.select()
            .from(athleteProfiles)
            .where(eq(athleteProfiles.userId, record.athleteId))
            .limit(1);
          if (profile) {
            if (profile.birthDate) {
              const age = Math.floor((Date.now() - profile.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
              athleteAge = `${age} years old`;
            }
            athletePosition = profile.position || undefined;
          }
        } catch {
          // Profile lookup is optional
        }

        // Run Gemini analysis
        const aiFeedback = await analyzeAthleteVideo({
          videoUrl: record.videoUrl,
          drillName: record.drillId || "Swing Analysis",
          athleteName: athlete?.name || undefined,
          athleteAge,
          athletePosition,
        });

        // Generate editable text version
        const editableText = formatAnalysisForCoachEdit(aiFeedback);

        // Save results
        await database.update(videoAnalysis)
          .set({
            status: "analyzed",
            aiFeedback,
            coachEditedFeedback: editableText,
            analyzedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(videoAnalysis.id, input.analysisId));

        return { success: true, status: "analyzed" as const, aiFeedback };
      } catch (error) {
        // Mark as failed
        const errorMsg = error instanceof Error ? error.message : "Unknown analysis error";
        await database.update(videoAnalysis)
          .set({
            status: "failed",
            errorMessage: errorMsg,
            updatedAt: new Date(),
          })
          .where(eq(videoAnalysis.id, input.analysisId));

        console.error("[VideoAnalysis] Gemini analysis failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Analysis failed: ${errorMsg}`,
        });
      }
    }),

  /**
   * Get all analyses pending coach review. Coach only.
   */
  getPendingReviews: protectedProcedure
    .query(async ({ ctx }) => {
      requireCoach(ctx.user.role);
      const database = await requireDb();

      const results = await database.select()
        .from(videoAnalysis)
        .where(
          inArray(videoAnalysis.status, ["pending", "analyzed", "reviewed"])
        )
        .orderBy(desc(videoAnalysis.createdAt));

      // Enrich with athlete names
      const allUsers = await db.getAllUsers();
      return results.map(r => ({
        ...r,
        athleteName: allUsers.find(u => u.id === r.athleteId)?.name || "Unknown Athlete",
      }));
    }),

  /**
   * Get all analyses (coach view with all statuses). Coach only.
   */
  getAllAnalyses: protectedProcedure
    .query(async ({ ctx }) => {
      requireCoach(ctx.user.role);
      const database = await requireDb();

      const results = await database.select()
        .from(videoAnalysis)
        .orderBy(desc(videoAnalysis.createdAt));

      const allUsers = await db.getAllUsers();
      return results.map(r => ({
        ...r,
        athleteName: allUsers.find(u => u.id === r.athleteId)?.name || "Unknown Athlete",
      }));
    }),

  /**
   * Get a single analysis by ID.
   */
  getAnalysis: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ ctx, input }) => {
      const database = await requireDb();

      const [record] = await database.select()
        .from(videoAnalysis)
        .where(eq(videoAnalysis.id, input.analysisId))
        .limit(1);

      if (!record) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      // Athletes can only see approved/sent analyses for their own submissions
      if (ctx.user.role !== "admin") {
        if (record.athleteId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (record.status !== "approved" && record.status !== "sent") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Feedback not yet available" });
        }
      }

      const allUsers = await db.getAllUsers();
      return {
        ...record,
        athleteName: allUsers.find(u => u.id === record.athleteId)?.name || "Unknown Athlete",
      };
    }),

  /**
   * Get analysis for a specific submission.
   */
  getAnalysisBySubmission: protectedProcedure
    .input(z.object({ submissionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const database = await requireDb();

      const [record] = await database.select()
        .from(videoAnalysis)
        .where(eq(videoAnalysis.submissionId, input.submissionId))
        .limit(1);

      if (!record) return null;

      // Athletes can only see approved/sent analyses
      if (ctx.user.role !== "admin") {
        if (record.athleteId !== ctx.user.id) return null;
        if (record.status !== "approved" && record.status !== "sent") return null;
      }

      return record;
    }),

  /**
   * Get all approved/sent analyses for the current athlete.
   */
  getAthleteAnalyses: protectedProcedure
    .query(async ({ ctx }) => {
      const database = await requireDb();

      const results = await database.select()
        .from(videoAnalysis)
        .where(
          and(
            eq(videoAnalysis.athleteId, ctx.user.id),
            inArray(videoAnalysis.status, ["approved", "sent"])
          )
        )
        .orderBy(desc(videoAnalysis.createdAt));

      return results;
    }),

  /**
   * Get ALL analyses for the current athlete (all statuses, both standalone and drill-specific).
   * Used by the athlete feedback hub to show a unified view of all submissions.
   */
  getMyAllAnalyses: protectedProcedure
    .query(async ({ ctx }) => {
      const database = await requireDb();

      const results = await database.select()
        .from(videoAnalysis)
        .where(eq(videoAnalysis.athleteId, ctx.user.id))
        .orderBy(desc(videoAnalysis.createdAt));

      return results;
    }),

  /**
   * Coach edits the AI-generated feedback. Coach only.
   */
  updateFeedback: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
      coachEditedFeedback: z.string(),
      coachNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireCoach(ctx.user.role);
      const database = await requireDb();

      const [record] = await database.select()
        .from(videoAnalysis)
        .where(eq(videoAnalysis.id, input.analysisId))
        .limit(1);

      if (!record) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      if (!["analyzed", "reviewed"].includes(record.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot edit feedback in "${record.status}" status` });
      }

      await database.update(videoAnalysis)
        .set({
          coachEditedFeedback: input.coachEditedFeedback,
          coachNotes: input.coachNotes ?? record.coachNotes,
          status: "reviewed",
          reviewedAt: new Date(),
          coachId: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(videoAnalysis.id, input.analysisId));

      return { success: true };
    }),

  /**
   * Coach approves feedback — marks it ready to send. Coach only.
   */
  approveFeedback: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireCoach(ctx.user.role);
      const database = await requireDb();

      const [record] = await database.select()
        .from(videoAnalysis)
        .where(eq(videoAnalysis.id, input.analysisId))
        .limit(1);

      if (!record) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      if (!["analyzed", "reviewed"].includes(record.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot approve feedback in "${record.status}" status` });
      }

      await database.update(videoAnalysis)
        .set({
          status: "approved",
          approvedAt: new Date(),
          coachId: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(videoAnalysis.id, input.analysisId));

      return { success: true };
    }),

  /**
   * Send approved feedback to athlete via email. Coach only.
   */
  sendFeedback: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
      recipientEmail: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireCoach(ctx.user.role);
      const database = await requireDb();

      const [record] = await database.select()
        .from(videoAnalysis)
        .where(eq(videoAnalysis.id, input.analysisId))
        .limit(1);

      if (!record) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      if (record.status !== "approved" && record.status !== "reviewed" && record.status !== "analyzed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot send feedback in "${record.status}" status` });
      }

      // Determine recipient email
      const allUsers = await db.getAllUsers();
      const athlete = allUsers.find(u => u.id === record.athleteId);
      let email = input.recipientEmail || athlete?.email;

      // Try athlete profile for parent email as fallback
      if (!email) {
        try {
          const { athleteProfiles } = await import("../drizzle/schema");
          const [profile] = await database.select()
            .from(athleteProfiles)
            .where(eq(athleteProfiles.userId, record.athleteId))
            .limit(1);
          if (profile?.parentEmail) email = profile.parentEmail;
        } catch {
          // Optional
        }
      }

      if (!email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No email address found for athlete. Please provide one." });
      }

      // Send the email
      try {
        const { sendVideoAnalysisFeedbackEmail } = await import("./email");
        await sendVideoAnalysisFeedbackEmail({
          athleteEmail: email,
          athleteName: athlete?.name || "Athlete",
          coachName: ctx.user.name || "Coach",
          feedback: record.coachEditedFeedback || "Feedback is available in your portal.",
          drillName: record.drillId || "Swing Analysis",
          portalUrl: `${process.env.VITE_FRONTEND_URL || ""}/athlete-portal`,
        });
      } catch (error) {
        console.error("[VideoAnalysis] Failed to send feedback email:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send email" });
      }

      // Update record
      await database.update(videoAnalysis)
        .set({
          status: "sent",
          sentAt: new Date(),
          sentToEmail: email,
          updatedAt: new Date(),
        })
        .where(eq(videoAnalysis.id, input.analysisId));

      // Create in-app notification for athlete
      try {
        await db.createNotification({
          userId: record.athleteId,
          type: "feedback",
          title: "Video Feedback Ready",
          message: `Coach has reviewed your video submission${record.drillId ? ` for ${record.drillId}` : ""} and provided feedback.`,
          relatedId: record.id,
          relatedType: "videoAnalysis",
          actionUrl: "/athlete-portal",
        });
      } catch {
        // Non-critical
      }

      return { success: true, sentTo: email };
    }),

  /**
   * Retry a failed analysis. Coach only.
   */
  retryAnalysis: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireCoach(ctx.user.role);
      const database = await requireDb();

      const [record] = await database.select()
        .from(videoAnalysis)
        .where(eq(videoAnalysis.id, input.analysisId))
        .limit(1);

      if (!record) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      if (record.status !== "failed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only retry failed analyses" });
      }

      // Reset to pending
      await database.update(videoAnalysis)
        .set({
          status: "pending",
          errorMessage: null,
          aiFeedback: null,
          coachEditedFeedback: null,
          updatedAt: new Date(),
        })
        .where(eq(videoAnalysis.id, input.analysisId));

      return { success: true };
    }),
});
