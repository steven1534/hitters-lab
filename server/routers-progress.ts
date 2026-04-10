import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { drillProgress, drillFavorites, drillSubmissions } from "../drizzle/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

export const progressRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDb(await getDb());
    const rows = await db
      .select()
      .from(drillProgress)
      .where(eq(drillProgress.userId, ctx.user.id))
      .orderBy(desc(drillProgress.completedAt));
    return rows;
  }),

  log: protectedProcedure
    .input(
      z.object({
        drillId: z.string(),
        notes: z.string().optional(),
        rating: z.number().min(1).max(5).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = requireDb(await getDb());
      const [row] = await db
        .insert(drillProgress)
        .values({
          userId: ctx.user.id,
          drillId: input.drillId,
          notes: input.notes ?? null,
          rating: input.rating ?? null,
        })
        .returning({ id: drillProgress.id });
      return { success: true as const, id: row.id };
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDb(await getDb());
    const userId = ctx.user.id;

    const [progressStats] = await db
      .select({
        totalSessions: sql<number>`count(*)`.as("totalSessions"),
        uniqueDrills: sql<number>`count(distinct ${drillProgress.drillId})`.as("uniqueDrills"),
      })
      .from(drillProgress)
      .where(eq(drillProgress.userId, userId));

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [weekStats] = await db
      .select({
        thisWeek: sql<number>`count(*)`.as("thisWeek"),
      })
      .from(drillProgress)
      .where(
        and(eq(drillProgress.userId, userId), gte(drillProgress.completedAt, weekAgo))
      );

    const [favCount] = await db
      .select({ count: sql<number>`count(*)`.as("count") })
      .from(drillFavorites)
      .where(eq(drillFavorites.userId, userId));

    let submissionsCount = 0;
    try {
      const [subCount] = await db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(drillSubmissions)
        .where(eq(drillSubmissions.userId, userId));
      submissionsCount = Number(subCount?.count ?? 0);
    } catch {
      // table may not exist yet
    }

    // Streak: count consecutive days ending today with at least one session
    const recentDays = await db
      .select({
        day: sql<string>`date(${drillProgress.completedAt})`.as("day"),
      })
      .from(drillProgress)
      .where(eq(drillProgress.userId, userId))
      .groupBy(sql`date(${drillProgress.completedAt})`)
      .orderBy(desc(sql`date(${drillProgress.completedAt})`));

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const row of recentDays) {
      const d = new Date(row.day);
      d.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - streak);
      if (d.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return {
      uniqueDrills: Number(progressStats?.uniqueDrills ?? 0),
      totalSessions: Number(progressStats?.totalSessions ?? 0),
      thisWeek: Number(weekStats?.thisWeek ?? 0),
      streak,
      favoritesCount: Number(favCount?.count ?? 0),
      submissionsCount,
    };
  }),
});
