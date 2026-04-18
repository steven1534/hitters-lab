import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as sessionNotesDb from "./sessionNotes";

/** Skill categories available for session tracking */
export const SKILL_CATEGORIES = [
  "Swing Mechanics",
  "Pitch Recognition",
  "Plate Approach",
  "Bat Speed Development",
  "Exit Velocity",
  "Timing & Rhythm",
  "Game IQ / Situational Awareness",
  "Confidence / Mindset",
  "Contact Quality",
] as const;

const homeworkDrillSchema = z.object({
  drillId: z.string(),
  drillName: z.string(),
});

export const sessionNotesRouter = router({
  /** Get the next session number for an athlete */
  getNextSessionNumber: protectedProcedure
    .input(z.object({ athleteId: z.number() }))
    .query(async ({ input }) => {
      return sessionNotesDb.getNextSessionNumber(input.athleteId);
    }),

  /** Create a new session note */
  create: protectedProcedure
    .input(
      z.object({
        athleteId: z.number(),
        sessionDate: z.string(), // ISO date string
        duration: z.number().optional(),
        sessionLabel: z.string().optional(),
        skillsWorked: z.array(z.string()).min(1, "Select at least one skill"),
        whatImproved: z.string().min(1, "Required"),
        whatNeedsWork: z.string().min(1, "Required"),
        homeworkDrills: z.array(homeworkDrillSchema).optional(),
        overallRating: z.number().min(1).max(5).optional(),
        privateNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "coach") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
      }

      const sessionNumber = await sessionNotesDb.getNextSessionNumber(input.athleteId);

      return sessionNotesDb.createSessionNote({
        coachId: ctx.user.id,
        athleteId: input.athleteId,
        sessionNumber,
        sessionLabel: input.sessionLabel || null,
        sessionDate: new Date(input.sessionDate),
        duration: input.duration ?? null,
        skillsWorked: input.skillsWorked,
        whatImproved: input.whatImproved,
        whatNeedsWork: input.whatNeedsWork,
        homeworkDrills: input.homeworkDrills ?? [],
        overallRating: input.overallRating ?? null,
        privateNotes: input.privateNotes ?? null,
      });
    }),

  /** Get all session notes for an athlete */
  getForAthlete: protectedProcedure
    .input(z.object({ athleteId: z.number() }))
    .query(async ({ input }) => {
      return sessionNotesDb.getSessionNotesWithAthleteName(input.athleteId);
    }),

  /** Get a single session note */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const note = await sessionNotesDb.getSessionNoteById(input.id);
      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session note not found" });
      }
      return note;
    }),

  /** Update a session note */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        sessionDate: z.string().optional(),
        duration: z.number().optional(),
        sessionLabel: z.string().optional(),
        skillsWorked: z.array(z.string()).optional(),
        whatImproved: z.string().optional(),
        whatNeedsWork: z.string().optional(),
        homeworkDrills: z.array(homeworkDrillSchema).optional(),
        overallRating: z.number().min(1).max(5).optional(),
        privateNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "coach") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
      }

      const { id, sessionDate, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (sessionDate) {
        updateData.sessionDate = new Date(sessionDate);
      }

      return sessionNotesDb.updateSessionNote(id, updateData as any);
    }),

  /** Delete a session note */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "coach") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
      }
      return sessionNotesDb.deleteSessionNote(input.id);
    }),

  /** Get all athletes who have session notes */
  getAthletesWithSessions: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "coach") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
    }
    return sessionNotesDb.getAthletesWithSessions(ctx.user.id);
  }),

  /** Get recent session notes for AI report context */
  getRecent: protectedProcedure
    .input(z.object({ athleteId: z.number(), limit: z.number().default(5) }))
    .query(async ({ input }) => {
      return sessionNotesDb.getRecentSessionNotes(input.athleteId, input.limit);
    }),

  /** Toggle sharing visibility for a session note */
  toggleSharing: protectedProcedure
    .input(z.object({ id: z.number(), shared: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "coach") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
      }
      return sessionNotesDb.updateSessionNote(input.id, {
        sharedWithAthlete: input.shared,
      });
    }),

  /** Bulk toggle sharing for all notes of an athlete */
  bulkToggleSharing: protectedProcedure
    .input(z.object({ athleteId: z.number(), shared: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "coach") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
      }
      const notes = await sessionNotesDb.getSessionNotesForAthlete(input.athleteId);
      let updated = 0;
      for (const note of notes) {
        if (note.sharedWithAthlete !== input.shared) {
          await sessionNotesDb.updateSessionNote(note.id, {
            sharedWithAthlete: input.shared,
          });
          updated++;
        }
      }
      return { updated, total: notes.length };
    }),

  /** Get my own session notes (athlete-facing, only shared notes, excludes private fields) */
  getMyNotes: protectedProcedure.query(async ({ ctx }) => {
    const notes = await sessionNotesDb.getSharedSessionNotesForAthlete(ctx.user.id);
    // Strip coach-only fields
    return notes.map((n) => ({
      id: n.id,
      sessionNumber: n.sessionNumber,
      sessionLabel: n.sessionLabel,
      sessionDate: n.sessionDate,
      duration: n.duration,
      skillsWorked: n.skillsWorked,
      whatImproved: n.whatImproved,
      whatNeedsWork: n.whatNeedsWork,
      homeworkDrills: n.homeworkDrills,
      blastSessionId: n.blastSessionId,
      createdAt: n.createdAt,
    }));
  }),

  /** Get skill categories list */
  getSkillCategories: protectedProcedure.query(() => {
    return SKILL_CATEGORIES;
  }),
});
