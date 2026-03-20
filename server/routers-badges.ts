import { router, protectedProcedure } from "./_core/trpc";
import * as badgeService from "./badgeService";
import * as drillAssignmentDb from "./drillAssignments";
import { getDb } from "./db";
import { drillSubmissions } from "../drizzle/schema";
import { eq, and, isNotNull } from "drizzle-orm";

export const badgesRouter = router({
  /** Get all badges earned by the current user */
  getMyBadges: protectedProcedure.query(async ({ ctx }) => {
    return badgeService.getUserBadges(ctx.user.id);
  }),

  /** Get current stats + next badge for the athlete dashboard */
  getMyProgress: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const userId = ctx.user.id;

    // Get completed drills count
    const assignments = await drillAssignmentDb.getUserAssignments(userId);
    const completedDrills = assignments.filter(
      (a: any) => a.status === "completed"
    ).length;

    // Get streak
    const streak = await drillAssignmentDb.calculateStreak(userId);

    // Get video submissions count
    let videoSubmissions = 0;
    if (db) {
      try {
        const videos = await db
          .select()
          .from(drillSubmissions)
          .where(
            and(
              eq(drillSubmissions.userId, userId),
              isNotNull(drillSubmissions.videoUrl)
            )
          );
        videoSubmissions = videos.length;
      } catch {
        // ignore
      }
    }

    const totalSubmissions = completedDrills;

    const stats: badgeService.AthleteStats = {
      completedDrills,
      streak,
      videoSubmissions,
      totalSubmissions,
    };

    // Check and award any new badges
    const newBadges = await badgeService.checkAndAwardBadges(userId, stats);

    // Get all earned badges
    const earnedBadges = await badgeService.getUserBadges(userId);
    const earnedTypes = new Set(earnedBadges.map((b) => b.badgeType));

    // Get next badge
    const nextBadge = badgeService.getNextBadge(earnedTypes, stats);

    return {
      stats,
      earnedBadges,
      newBadges,
      nextBadge,
    };
  }),
});
