import { getDb } from "./db";
import { badges } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/** Badge definitions with milestone thresholds */
export const BADGE_DEFINITIONS = [
  // Completion milestones
  {
    type: "first_drill",
    name: "First Steps",
    description: "Completed your first drill",
    icon: "🎯",
    check: (stats: AthleteStats) => stats.completedDrills >= 1,
  },
  {
    type: "five_drills",
    name: "Dedicated Athlete",
    description: "Completed 5 drills",
    icon: "⚡",
    check: (stats: AthleteStats) => stats.completedDrills >= 5,
  },
  {
    type: "ten_drills",
    name: "Grinder",
    description: "Completed 10 drills",
    icon: "💪",
    check: (stats: AthleteStats) => stats.completedDrills >= 10,
  },
  {
    type: "twenty_five_drills",
    name: "Elite Performer",
    description: "Completed 25 drills",
    icon: "🏆",
    check: (stats: AthleteStats) => stats.completedDrills >= 25,
  },
  {
    type: "fifty_drills",
    name: "All-Star",
    description: "Completed 50 drills",
    icon: "⭐",
    check: (stats: AthleteStats) => stats.completedDrills >= 50,
  },
  // Streak milestones
  {
    type: "three_day_streak",
    name: "On a Roll",
    description: "3-day training streak",
    icon: "🔥",
    check: (stats: AthleteStats) => stats.streak >= 3,
  },
  {
    type: "seven_day_streak",
    name: "Consistency King",
    description: "7-day training streak",
    icon: "👑",
    check: (stats: AthleteStats) => stats.streak >= 7,
  },
  {
    type: "fourteen_day_streak",
    name: "Unstoppable",
    description: "14-day training streak",
    icon: "🚀",
    check: (stats: AthleteStats) => stats.streak >= 14,
  },
  // Submission milestones
  {
    type: "first_video",
    name: "Lights, Camera, Action",
    description: "Submitted your first video",
    icon: "🎬",
    check: (stats: AthleteStats) => stats.videoSubmissions >= 1,
  },
  {
    type: "five_videos",
    name: "Film Study Pro",
    description: "Submitted 5 videos for analysis",
    icon: "📹",
    check: (stats: AthleteStats) => stats.videoSubmissions >= 5,
  },
] as const;

export interface AthleteStats {
  completedDrills: number;
  streak: number;
  videoSubmissions: number;
  totalSubmissions: number;
}

/** Get all badges earned by a user */
export async function getUserBadges(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(badges)
      .where(eq(badges.userId, userId));
  } catch (error) {
    console.error("[BadgeService] Failed to get user badges:", error);
    return [];
  }
}

/** Check and award any new badges based on current stats */
export async function checkAndAwardBadges(
  userId: number,
  stats: AthleteStats
): Promise<Array<{ type: string; name: string; icon: string }>> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Get existing badges
    const existingBadges = await db
      .select({ badgeType: badges.badgeType })
      .from(badges)
      .where(eq(badges.userId, userId));

    const existingTypes = new Set(existingBadges.map((b) => b.badgeType));
    const newBadges: Array<{ type: string; name: string; icon: string }> = [];

    for (const def of BADGE_DEFINITIONS) {
      if (!existingTypes.has(def.type) && def.check(stats)) {
        // Award the badge
        await db.insert(badges).values({
          userId,
          badgeType: def.type,
          badgeName: def.name,
          badgeDescription: def.description,
          badgeIcon: def.icon,
        });
        newBadges.push({ type: def.type, name: def.name, icon: def.icon });
      }
    }

    return newBadges;
  } catch (error) {
    console.error("[BadgeService] Failed to check/award badges:", error);
    return [];
  }
}

/** Get the next badge milestone for a user */
export function getNextBadge(
  earnedTypes: Set<string>,
  stats: AthleteStats
): { name: string; icon: string; description: string; progress: number; target: number } | null {
  for (const def of BADGE_DEFINITIONS) {
    if (!earnedTypes.has(def.type) && !def.check(stats)) {
      // This is the next unearned badge
      // Calculate progress based on badge type
      let progress = 0;
      let target = 0;

      // Map badge types to their target thresholds
      const BADGE_TARGETS: Record<string, { stat: keyof AthleteStats; target: number }> = {
        first_drill: { stat: "completedDrills", target: 1 },
        five_drills: { stat: "completedDrills", target: 5 },
        ten_drills: { stat: "completedDrills", target: 10 },
        twenty_five_drills: { stat: "completedDrills", target: 25 },
        fifty_drills: { stat: "completedDrills", target: 50 },
        three_day_streak: { stat: "streak", target: 3 },
        seven_day_streak: { stat: "streak", target: 7 },
        fourteen_day_streak: { stat: "streak", target: 14 },
        first_video: { stat: "videoSubmissions", target: 1 },
        five_videos: { stat: "videoSubmissions", target: 5 },
      };

      const mapping = BADGE_TARGETS[def.type];
      if (mapping) {
        progress = stats[mapping.stat];
        target = mapping.target;
      }

      return {
        name: def.name,
        icon: def.icon,
        description: def.description,
        progress,
        target,
      };
    }
  }
  return null;
}
