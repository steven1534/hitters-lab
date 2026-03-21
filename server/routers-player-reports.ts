import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { playerReports } from "../drizzle/schema";
import { eq, desc, asc } from "drizzle-orm";

async function requireAdmin(role: string) {
  if (role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
}

export const playerReportsRouter = router({
  /** List all reports for a specific athlete */
  listByAthlete: protectedProcedure
    .input(z.object({ athleteId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db
        .select()
        .from(playerReports)
        .where(eq(playerReports.athleteId, input.athleteId))
        .orderBy(desc(playerReports.reportDate));
    }),

  /** Get a single report */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [report] = await db
        .select()
        .from(playerReports)
        .where(eq(playerReports.id, input.id))
        .limit(1);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });
      return report;
    }),

  /** Create a new report */
  create: protectedProcedure
    .input(z.object({
      athleteId: z.number(),
      title: z.string().min(1),
      content: z.string(),
      reportDate: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(playerReports).values({
        athleteId: input.athleteId,
        title: input.title,
        content: input.content,
        reportDate: new Date(input.reportDate),
        createdBy: ctx.user.id,
      }).returning({ id: playerReports.id });
      return { id: result[0].id };
    }),

  /** Update an existing report */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      content: z.string().optional(),
      reportDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.content !== undefined) updates.content = input.content;
      if (input.reportDate !== undefined) updates.reportDate = new Date(input.reportDate);
      await db.update(playerReports).set(updates).where(eq(playerReports.id, input.id));
      return { success: true };
    }),

  /** Get all reports for the currently logged-in athlete (athlete self-view) */
  getMyReports: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db
        .select()
        .from(playerReports)
        .where(eq(playerReports.athleteId, ctx.user.id))
        .orderBy(desc(playerReports.reportDate));
    }),

  /** Delete a report */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(playerReports).where(eq(playerReports.id, input.id));
      return { success: true };
    }),
});
