import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { sendSubmissionNotificationToCoach, sendFeedbackNotificationToAthlete } from "./email";

export const submissionsRouter = router({
  // Drill submissions router for athlete feedback
  drillSubmissions: router({
    createSubmission: protectedProcedure
      .input(z.object({
        assignmentId: z.number(),
        drillId: z.string(),
        notes: z.string().optional(),
        videoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
        }
        const result = await db.createDrillSubmission({
          assignmentId: input.assignmentId,
          userId: ctx.user.id,
          drillId: input.drillId,
          notes: input.notes || null,
          videoUrl: input.videoUrl || null,
        });

        // Send email notification to coach
        try {
          const allUsers = await db.getAllUsers();
          const athlete = allUsers.find(u => u.id === ctx.user.id);
          if (athlete && athlete.email) {
            await sendSubmissionNotificationToCoach({
              coachEmail: process.env.OWNER_EMAIL || 'coach@example.com',
              coachName: process.env.OWNER_NAME || 'Coach',
              athleteName: athlete.name || 'Athlete',
              drillName: input.drillId,
              submissionNotes: input.notes || undefined,
              submissionUrl: `${process.env.VITE_FRONTEND_URL || 'https://app.example.com'}/submissions`,
            });
          }
        } catch (error) {
          console.error('Error sending submission notification:', error);
        }

        return { success: !!result };
      }),

    getSubmissionsByAssignment: protectedProcedure
      .input(z.object({ assignmentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSubmissionsByAssignment(input.assignmentId);
      }),

    getSubmissionsByUser: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
        }
        return await db.getSubmissionsByUser(ctx.user.id);
      }),

    getAllSubmissions: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await db.getAllSubmissions();
      }),

    updateSubmission: protectedProcedure
      .input(z.object({
        submissionId: z.number(),
        notes: z.string().optional(),
        videoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
        }
        const submissions = await db.getSubmissionsByUser(ctx.user.id);
        const submission = submissions.find(s => s.id === input.submissionId);
        if (!submission) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot update submission you do not own' });
        }
        const success = await db.updateDrillSubmission(input.submissionId, {
          notes: input.notes,
          videoUrl: input.videoUrl,
        });
        return { success };
      }),

    deleteSubmission: protectedProcedure
      .input(z.object({ submissionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
        }
        const submissions = await db.getSubmissionsByUser(ctx.user.id);
        const submission = submissions.find(s => s.id === input.submissionId);
        if (!submission) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot delete submission you do not own' });
        }
        const success = await db.deleteDrillSubmission(input.submissionId);
        return { success };
      }),
  }),

  // Coach feedback router
  coachFeedback: router({
    createFeedback: protectedProcedure
      .input(z.object({
        submissionId: z.number(),
        userId: z.number(),
        drillId: z.string(),
        feedback: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Coach access required' });
        }
        const result = await db.createCoachFeedback({
          submissionId: input.submissionId,
          coachId: ctx.user.id,
          userId: input.userId,
          drillId: input.drillId,
          feedback: input.feedback,
        });

        // Send email notification to athlete
        try {
          const allUsers = await db.getAllUsers();
          const athlete = allUsers.find(u => u.id === input.userId);
          if (athlete && athlete.email) {
            await sendFeedbackNotificationToAthlete({
              athleteEmail: athlete.email,
              athleteName: athlete.name || 'Athlete',
              coachName: ctx.user.name || 'Coach',
              drillName: input.drillId,
              feedback: input.feedback,
              feedbackUrl: `${process.env.VITE_FRONTEND_URL || 'https://app.example.com'}/athlete-portal`,
            });
          }
        } catch (error) {
          console.error('Error sending feedback notification:', error);
        }

        return { success: !!result };
      }),

    getFeedbackBySubmission: protectedProcedure
      .input(z.object({ submissionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getFeedbackBySubmission(input.submissionId);
      }),

    getFeedbackCountsBySubmissions: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await db.getFeedbackCountsBySubmissions();
      }),

    getFeedbackByDrill: protectedProcedure
      .input(z.object({ drillId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
        }
        return await db.getFeedbackByDrill(input.drillId, ctx.user.id);
      }),

    updateFeedback: protectedProcedure
      .input(z.object({
        feedbackId: z.number(),
        feedback: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Coach access required' });
        }
        const success = await db.updateCoachFeedback(input.feedbackId, input.feedback);
        return { success };
      }),

    deleteFeedback: protectedProcedure
      .input(z.object({ feedbackId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Coach access required' });
        }
        const success = await db.deleteCoachFeedback(input.feedbackId);
        return { success };
      }),
  }),
});


// Helper function to create notifications for submissions
export async function createSubmissionNotification(data: {
  userId: number;
  athleteName: string;
  drillName: string;
  submissionId: number;
}) {
  try {
    await db.createNotification({
      userId: data.userId,
      type: 'submission',
      title: `New Submission from ${data.athleteName}`,
      message: `${data.athleteName} submitted their work for ${data.drillName}`,
      relatedId: data.submissionId,
      relatedType: 'submission',
      actionUrl: `/submissions`,
    });
  } catch (error) {
    console.error('Error creating submission notification:', error);
  }
}

// Helper function to create notifications for feedback
export async function createFeedbackNotification(data: {
  userId: number;
  coachName: string;
  drillName: string;
  feedbackId: number;
}) {
  try {
    await db.createNotification({
      userId: data.userId,
      type: 'feedback',
      title: `Feedback from ${data.coachName}`,
      message: `${data.coachName} provided feedback on your ${data.drillName} submission`,
      relatedId: data.feedbackId,
      relatedType: 'feedback',
      actionUrl: `/athlete-portal`,
    });
  } catch (error) {
    console.error('Error creating feedback notification:', error);
  }
}
