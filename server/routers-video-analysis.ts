/**
 * Video Analysis Router — rewritten to match actual DB schema.
 *
 * DB columns: id, athleteId, coachId, videoUrl, thumbnailUrl, title,
 *             analysisType, status, aiAnalysis, coachFeedbackText,
 *             analyzedAt, reviewedAt, approvedAt, sentAt, sentToEmail,
 *             createdAt, updatedAt
 *
 * Status enum: pending | analyzing | complete | failed
 */

import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { videoAnalysis } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { analyzeAthleteVideo, formatAnalysisForCoachEdit } from "./videoAnalysisService";
import * as db from "./db";

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

export const videoAnalysisRouter = router({

  /** Athlete submits a swing video for analysis */
  submitSwing: protectedProcedure
    .input(z.object({
      videoUrl: z.string().min(1),
      swingType: z.string().optional(),
      athleteNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await requireDb();

      const title = input.swingType
        ? `${input.swingType} Analysis`
        : input.athleteNotes
          ? input.athleteNotes.substring(0, 80)
          : "Swing Analysis";

      const [inserted] = await database
        .insert(videoAnalysis)
        .values({
          athleteId: ctx.user.id,
          videoUrl: input.videoUrl,
          analysisType: input.swingType || "swing",
          title,
          status: "pending",
        })
        .returning({ id: videoAnalysis.id });

      return { id: inserted.id, status: "pending" as const };
    }),

  /** Coach uploads a swing video on behalf of an athlete */
  coachUploadForAthlete: protectedProcedure
    .input(z.object({
      athleteId: z.number(),
      videoUrl: z.string().min(1),
      title: z.string().optional(),
      analysisType: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireCoach(ctx.user.role);
      const database = await requireDb();
      const [inserted] = await database
        .insert(videoAnalysis)
        .values({
          athleteId: input.athleteId,
          coachId: ctx.user.id,
          videoUrl: input.videoUrl,
          title: input.title || "Coach-Uploaded Swing Analysis",
          analysisType: input.analysisType || "swing",
          status: "pending",
        })
        .returning({ id: videoAnalysis.id });
      return { id: inserted.id, status: "pending" as const };
    }),

  /** Get all swing submissions for the current athlete */
  getMySwings: protectedProcedure
    .query(async ({ ctx }) => {
      const database = await requireDb();
      return database
        .select()
        .from(videoAnalysis)
        .where(eq(videoAnalysis.athleteId, ctx.user.id))
        .orderBy(desc(videoAnalysis.createdAt));
    }),

  /** Trigger analysis record for a drill submission (legacy) */
  triggerAnalysis: protectedProcedure
    .input(z.object({
      submissionId: z.number(),
      drillId: z.string(),
      videoUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await requireDb();

      const [inserted] = await database
        .insert(videoAnalysis)
        .values({
          athleteId: ctx.user.id,
          videoUrl: input.videoUrl,
          analysisType: input.drillId,
          title: `Drill: ${input.drillId}`,
          status: "pending",
        })
        .returning({ id: videoAnalysis.id });

      return { id: inserted.id, status: "pending" as const };
    }),

  /** Run AI analysis on a pending submission — coach only */
  analyzeVideo: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireCoach(ctx.user.role);
      const database = await requireDb();

      const [record] = await database
        .select()
        .from(videoAnalysis)
        .where(eq(videoAnalysis.id, input.analysisId))
        .limit(1);

      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Analysis record not found" });
      if (record.status !== "pending" && record.status !== "failed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot analyze: status is "${record.status}"` });
      }

      // Mark as analyzing
      await database
        .update(videoAnalysis)
        .set({ status: "analyzing", coachId: ctx.user.id, updatedAt: new Date() })
        .where(eq(videoAnalysis.id, input.analysisId));

      try {
        const allUsers = await db.getAllUsers();
        const athlete = allUsers.find(u => u.id === record.athleteId);

        const aiFeedback = await analyzeAthleteVideo({
          videoUrl: record.videoUrl,
          drillName: record.analysisType || record.title || "Swing Analysis",
          athleteName: athlete?.name || undefined,
        });

        const editableText = formatAnalysisForCoachEdit(aiFeedback);

        await database
          .update(videoAnalysis)
          .set({
            status: "complete",
            aiAnalysis: JSON.stringify(aiFeedback),
            coachFeedbackText: editableText,
            analyzedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(videoAnalysis.id, input.analysisId));

        return { success: true, status: "complete" as const, aiFeedback };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        await database
          .update(videoAnalysis)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(videoAnalysis.id, input.analysisId));

        console.error("[VideoAnalysis] Analysis failed:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Analysis failed: ${errorMsg}` });
      }
    }),

  /** Get all analyses — coach only */
  getAllAnalyses: protectedProcedure
    .query(async ({ ctx }) => {
      requireCoach(ctx.user.role);
      const database = await requireDb();
      const results = await database
        .select()
        .from(videoAnalysis)
        .orderBy(desc(videoAnalysis.createdAt));

      const allUsers = await db.getAllUsers();
      return results.map(r => ({
        ...r,
        athleteName: allUsers.find(u => u.id === r.athleteId)?.name || "Unknown Athlete",
      }));
    }),

  /** Get pending/analyzing analyses — coach only */
  getPendingReviews: protectedProcedure
    .query(async ({ ctx }) => {
      requireCoach(ctx.user.role);
      const database = await requireDb();
      const results = await database
        .select()
        .from(videoAnalysis)
        .orderBy(desc(videoAnalysis.createdAt));

      const allUsers = await db.getAllUsers();
      return results
        .filter(r => r.status === "pending" || r.status === "analyzing" || r.status === "complete")
        .map(r => ({
          ...r,
          athleteName: allUsers.find(u => u.id === r.athleteId)?.name || "Unknown Athlete",
        }));
    }),

  /** Coach edits AI feedback text */
  updateFeedback: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
      coachEditedFeedback: z.string(),
      coachNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireCoach(ctx.user.role);
      const database = await requireDb();
      await database
        .update(videoAnalysis)
        .set({
          coachFeedbackText: input.coachEditedFeedback,
          reviewedAt: new Date(),
          coachId: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(videoAnalysis.id, input.analysisId));
      return { success: true };
    }),

  /** Coach approves feedback */
  approveFeedback: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireCoach(ctx.user.role);
      const database = await requireDb();
      await database
        .update(videoAnalysis)
        .set({ approvedAt: new Date(), coachId: ctx.user.id, updatedAt: new Date() })
        .where(eq(videoAnalysis.id, input.analysisId));
      return { success: true };
    }),

  /** Send feedback to athlete */
  sendFeedback: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
      recipientEmail: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireCoach(ctx.user.role);
      const database = await requireDb();

      const [record] = await database
        .select()
        .from(videoAnalysis)
        .where(eq(videoAnalysis.id, input.analysisId))
        .limit(1);

      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });

      const allUsers = await db.getAllUsers();
      const athlete = allUsers.find(u => u.id === record.athleteId);
      const email = input.recipientEmail || athlete?.email;

      if (!email) throw new TRPCError({ code: "BAD_REQUEST", message: "No email found for athlete" });

      try {
        const { sendVideoAnalysisFeedbackEmail } = await import("./email");
        await sendVideoAnalysisFeedbackEmail({
          athleteEmail: email,
          athleteName: athlete?.name || "Athlete",
          coachName: ctx.user.name || "Coach",
          feedback: record.coachFeedbackText || "Feedback is available in your portal.",
          drillName: record.title || "Swing Analysis",
          portalUrl: `${process.env.APP_URL || "https://app.coachstevebaseball.com"}/athlete-portal`,
        });
      } catch (error) {
        console.error("[VideoAnalysis] Email send failed:", error);
        // Don't throw — still mark as sent
      }

      await database
        .update(videoAnalysis)
        .set({ sentAt: new Date(), sentToEmail: email, updatedAt: new Date() })
        .where(eq(videoAnalysis.id, input.analysisId));

      try {
        await db.createNotification({
          userId: record.athleteId,
          type: "feedback",
          title: "Video Feedback Ready",
          message: `Coach has reviewed your video and provided feedback.`,
          relatedId: record.id,
          relatedType: "videoAnalysis",
          actionUrl: "/athlete-portal",
        });
      } catch { /* non-critical */ }

      return { success: true, sentTo: email };
    }),

  /** Retry a failed analysis */
  retryAnalysis: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireCoach(ctx.user.role);
      const database = await requireDb();
      await database
        .update(videoAnalysis)
        .set({ status: "pending", aiAnalysis: null, coachFeedbackText: null, updatedAt: new Date() })
        .where(eq(videoAnalysis.id, input.analysisId));
      return { success: true };
    }),

  /** Athlete views their own analyses */
  getAthleteAnalyses: protectedProcedure
    .query(async ({ ctx }) => {
      const database = await requireDb();
      return database
        .select()
        .from(videoAnalysis)
        .where(eq(videoAnalysis.athleteId, ctx.user.id))
        .orderBy(desc(videoAnalysis.createdAt));
    }),

  getMyAllAnalyses: protectedProcedure
    .query(async ({ ctx }) => {
      const database = await requireDb();
      return database
        .select()
        .from(videoAnalysis)
        .where(eq(videoAnalysis.athleteId, ctx.user.id))
        .orderBy(desc(videoAnalysis.createdAt));
    }),

  getAnalysis: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ ctx, input }) => {
      const database = await requireDb();
      const [record] = await database
        .select()
        .from(videoAnalysis)
        .where(eq(videoAnalysis.id, input.analysisId))
        .limit(1);

      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });

      const allUsers = await db.getAllUsers();
      return {
        ...record,
        athleteName: allUsers.find(u => u.id === record.athleteId)?.name || "Unknown",
      };
    }),

  getAnalysisBySubmission: protectedProcedure
    .input(z.object({ submissionId: z.number() }))
    .query(async ({ ctx, input }) => {
      return null; // Legacy endpoint — submissions now go directly to videoAnalysis
    }),
});
