import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { weeklyChallenges, drillProgress } from "../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

export const challengesRouter = router({
  getCurrent: protectedProcedure.query(async () => {
    const db = requireDb(await getDb());
    const now = new Date();
    const rows = await db
      .select()
      .from(weeklyChallenges)
      .where(and(lte(weeklyChallenges.startsAt, now), gte(weeklyChallenges.endsAt, now)))
      .orderBy(desc(weeklyChallenges.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = requireDb(await getDb());
    return await db.select().from(weeklyChallenges).orderBy(desc(weeklyChallenges.createdAt)).limit(20);
  }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      targetCount: z.number().min(1).default(5),
      drillCategory: z.string().optional(),
      startsAt: z.string(),
      endsAt: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = requireDb(await getDb());
      const [row] = await db.insert(weeklyChallenges).values({
        title: input.title,
        description: input.description ?? null,
        targetCount: input.targetCount,
        drillCategory: input.drillCategory ?? null,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        createdByUserId: ctx.user.id,
      }).returning();
      return row;
    }),

  getMyProgress: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDb(await getDb());
    const now = new Date();
    const currentChallenge = await db
      .select()
      .from(weeklyChallenges)
      .where(and(lte(weeklyChallenges.startsAt, now), gte(weeklyChallenges.endsAt, now)))
      .orderBy(desc(weeklyChallenges.createdAt))
      .limit(1);

    if (currentChallenge.length === 0) return null;

    const challenge = currentChallenge[0];
    const [result] = await db
      .select({ count: sql<number>`count(*)`.as("count") })
      .from(drillProgress)
      .where(
        and(
          eq(drillProgress.userId, ctx.user.id),
          gte(drillProgress.completedAt, challenge.startsAt),
          lte(drillProgress.completedAt, challenge.endsAt),
        )
      );

    return {
      challenge,
      completed: Number(result?.count ?? 0),
    };
  }),
});
