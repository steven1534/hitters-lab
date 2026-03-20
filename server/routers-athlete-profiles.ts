import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as profileDb from "./athleteProfiles";

/** Baseball positions for validation */
const POSITIONS = [
  "P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF",
  "RHP", "LHP", "DH", "IF", "OF", "UTL",
] as const;

export const athleteProfilesRouter = router({
  /** Get an athlete's full profile (coach or self) */
  get: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Coaches can view any profile; athletes can only view their own
      if (ctx.user.role !== "admin" && ctx.user.role !== "coach" && ctx.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return profileDb.getProfileWithUser(input.userId);
    }),

  /** Get own profile (for athlete portal) */
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    return profileDb.getProfileWithUser(ctx.user.id);
  }),

  /** Update an athlete's profile (coach or self) */
  update: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        birthDate: z.string().nullable().optional(), // ISO date string
        position: z.string().nullable().optional(),
        secondaryPosition: z.string().nullable().optional(),
        bats: z.enum(["L", "R", "S"]).nullable().optional(),
        throws: z.enum(["L", "R"]).nullable().optional(),
        teamName: z.string().nullable().optional(),
        focusAreas: z.array(z.string()).optional(),
        parentName: z.string().nullable().optional(),
        parentEmail: z.string().nullable().optional(),
        parentPhone: z.string().nullable().optional(),
        coachProfileNotes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Coaches can edit any profile; athletes can edit their own (limited fields)
      const isCoach = ctx.user.role === "admin" || ctx.user.role === "coach";
      const isSelf = ctx.user.id === input.userId;

      if (!isCoach && !isSelf) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const { userId, birthDate, ...rest } = input;

      // Athletes can only update certain fields on their own profile
      const data: Record<string, unknown> = {};

      if (isCoach) {
        // Coach can update everything
        Object.entries(rest).forEach(([key, value]) => {
          if (value !== undefined) {
            data[key] = value;
          }
        });
        if (birthDate !== undefined) {
          data.birthDate = birthDate ? new Date(birthDate) : null;
        }
      } else {
        // Athlete can update: parentName, parentEmail, parentPhone, position, bats, throws, teamName
        const allowedFields = ["parentName", "parentEmail", "parentPhone", "position", "secondaryPosition", "bats", "throws", "teamName"];
        Object.entries(rest).forEach(([key, value]) => {
          if (allowedFields.includes(key) && value !== undefined) {
            data[key] = value;
          }
        });
        if (birthDate !== undefined) {
          data.birthDate = birthDate ? new Date(birthDate) : null;
        }
      }

      return profileDb.upsertProfile(userId, data);
    }),

  /** Get parent email for an athlete (used by progress reports) */
  getParentEmail: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "coach") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
      }
      return profileDb.getParentEmail(input.userId);
    }),

  /** Get profiles for multiple athletes (for overview) */
  getBulk: protectedProcedure
    .input(z.object({ userIds: z.array(z.number()) }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "coach") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
      }
      return profileDb.getProfilesForAthletes(input.userIds);
    }),
});
