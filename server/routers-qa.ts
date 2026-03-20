import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

export const qaRouter = router({
  // Create a new question
  createQuestion: protectedProcedure
    .input(z.object({
      drillId: z.string(),
      question: z.string().min(1, "Question cannot be empty"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
      }

      try {
        const result = await db.createDrillQuestion({
          athleteId: ctx.user.id,
          drillId: input.drillId,
          question: input.question,
        });

        return { success: !!result };
      } catch (error) {
        console.error('Error creating question:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create question' });
      }
    }),

  // Get all questions for a drill
  getDrillQuestions: protectedProcedure
    .input(z.object({
      drillId: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const questions = await db.getDrillQuestions(input.drillId);
        
        // Get answers for each question
        const questionsWithAnswers = await Promise.all(
          questions.map(async (q: any) => {
            const answers = await db.getAnswersByQuestion(q.id);
            return { ...q, answers };
          })
        );

        return questionsWithAnswers;
      } catch (error) {
        console.error('Error getting drill questions:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get questions' });
      }
    }),

  // Get all questions for an athlete
  getAthleteQuestions: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
      }

      try {
        const questions = await db.getAthleteQuestions(ctx.user.id);
        
        // Get answers for each question
        const questionsWithAnswers = await Promise.all(
          questions.map(async (q: any) => {
            const answers = await db.getAnswersByQuestion(q.id);
            return { ...q, answers };
          })
        );

        return questionsWithAnswers;
      } catch (error) {
        console.error('Error getting athlete questions:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get questions' });
      }
    }),

  // Get all questions (for coach dashboard)
  getAllQuestions: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Coach access required' });
      }

      try {
        const questions = await db.getAllQuestions();
        
        // Get answers and athlete info for each question
        const questionsWithDetails = await Promise.all(
          questions.map(async (q: any) => {
            const answers = await db.getAnswersByQuestion(q.id);
            const allUsers = await db.getAllUsers();
            const athlete = allUsers.find((u: any) => u.id === q.athleteId);
            return { ...q, answers, athleteName: athlete?.name || 'Unknown' };
          })
        );

        return questionsWithDetails;
      } catch (error) {
        console.error('Error getting all questions:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get questions' });
      }
    }),

  // Create an answer to a question
  createAnswer: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      answer: z.string().min(1, "Answer cannot be empty"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Coach access required' });
      }

      try {
        const result = await db.createDrillAnswer({
          questionId: input.questionId,
          coachId: ctx.user.id,
          answer: input.answer,
        });

        return { success: !!result };
      } catch (error) {
        console.error('Error creating answer:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create answer' });
      }
    }),

  // Get answers for a question
  getAnswers: protectedProcedure
    .input(z.object({
      questionId: z.number(),
    }))
    .query(async ({ input }) => {
      try {
        return await db.getAnswersByQuestion(input.questionId);
      } catch (error) {
        console.error('Error getting answers:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get answers' });
      }
    }),
});
