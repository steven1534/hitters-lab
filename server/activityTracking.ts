import { eq, desc, and, gte, sql } from "drizzle-orm";
import { athleteActivity, coachAlertPreferences, notifications, users, InsertAthleteActivity } from "../drizzle/schema";
import { getDb } from "./db";
import { sendActivityAlertEmail } from "./email";
import { queueActivityAlert } from "./emailBatching";

// Activity types that can be tracked
export type ActivityType = 
  | "portal_login"
  | "drill_view"
  | "assignment_view"
  | "drill_start"
  | "drill_complete"
  | "video_submit"
  | "message_sent"
  | "profile_update";

// Map activity types to human-readable messages
const activityMessages: Record<ActivityType, (metadata?: any) => string> = {
  portal_login: () => "logged into their portal",
  drill_view: (m) => `viewed drill: ${m?.drillName || "Unknown"}`,
  assignment_view: () => "viewed their assignments",
  drill_start: (m) => `started working on: ${m?.drillName || "Unknown"}`,
  drill_complete: (m) => `completed drill: ${m?.drillName || "Unknown"}`,
  video_submit: (m) => `submitted a video for: ${m?.drillName || "Unknown"}`,
  message_sent: () => "sent you a message",
  profile_update: () => "updated their profile",
};

// Map activity types to notification titles
const activityTitles: Record<ActivityType, string> = {
  portal_login: "Athlete Login",
  drill_view: "Drill Viewed",
  assignment_view: "Assignments Viewed",
  drill_start: "Drill Started",
  drill_complete: "Drill Completed",
  video_submit: "Video Submitted",
  message_sent: "New Message",
  profile_update: "Profile Updated",
};

/**
 * Log an athlete activity and optionally notify the coach
 */
export async function logActivity(
  athleteId: number,
  activityType: ActivityType,
  options?: {
    relatedId?: string;
    relatedType?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Activity] Cannot log activity: database not available");
    return false;
  }

  try {
    // Get athlete info for notification and activity record
    const athlete = await db.select().from(users).where(eq(users.id, athleteId)).limit(1);
    if (athlete.length === 0) {
      console.warn("[Activity] Athlete not found:", athleteId);
      return true; // Activity logged, but no notification
    }

    const athleteName = athlete[0].name || athlete[0].email || `Athlete #${athleteId}`;

    // Insert activity record with athlete name
    await db.insert(athleteActivity).values({
      athleteId,
      athleteName, // Include athlete name for easy identification in database
      activityType,
      relatedId: options?.relatedId || null,
      relatedType: options?.relatedType || null,
      metadata: options?.metadata || null,
      ipAddress: options?.ipAddress || null,
      userAgent: options?.userAgent || null,
    });

    // Notifications are fire-and-forget — never block the caller for them.
    // Runs in background so the HTTP response returns immediately.
    setImmediate(async () => {
      try {
        const db2 = await getDb();
        if (!db2) return;
        // Find coach(es) to notify - get all users with admin or coach role
        const coaches = await db2.select().from(users).where(
          sql`${users.role} IN ('admin', 'coach')`
        );

        for (const coach of coaches) {
          const { shouldNotifyInApp, shouldNotifyEmail } = await shouldNotifyCoach(coach.id, activityType);
          const message = `${athleteName} ${activityMessages[activityType](options?.metadata)}`;
          const actionUrl = getActionUrl(activityType, options?.relatedId);

          if (shouldNotifyInApp) {
            await db2.insert(notifications).values({
              userId: coach.id,
              type: "system",
              title: activityTitles[activityType],
              message,
              relatedId: athleteId,
              relatedType: "athlete_activity",
              isRead: 0,
              actionUrl,
            });
          }

          if (shouldNotifyEmail && coach.email) {
            const baseUrl = process.env.VITE_APP_URL || "https://app.coachstevebaseball.com";
            await queueActivityAlert(
              coach.id,
              athleteId,
              athleteName,
              activityType,
              message,
              `${baseUrl}${actionUrl}`,
              options?.metadata
            );
          }
        }
      } catch (bgErr) {
        console.error("[Activity] Background notification failed:", bgErr);
      }
    });

    return true;
  } catch (error) {
    console.error("[Activity] Failed to log activity:", error);
    return false;
  }
}

/**
 * Check if coach should be notified for this activity type
 * Returns both in-app and email notification preferences
 */
async function shouldNotifyCoach(coachId: number, activityType: ActivityType): Promise<{ shouldNotifyInApp: boolean; shouldNotifyEmail: boolean }> {
  const db = await getDb();
  if (!db) return { shouldNotifyInApp: false, shouldNotifyEmail: false };

  try {
    const prefs = await db.select().from(coachAlertPreferences).where(eq(coachAlertPreferences.coachId, coachId)).limit(1);
    
    // If no preferences set, default to notifying for all activities (in-app and email)
    if (prefs.length === 0) {
      return { shouldNotifyInApp: true, shouldNotifyEmail: true };
    }

    const pref = prefs[0];
    
    // Check specific activity type preference
    let activityEnabled = false;
    switch (activityType) {
      case "portal_login": activityEnabled = !!pref.alertOnPortalLogin; break;
      case "drill_view": activityEnabled = !!pref.alertOnDrillView; break;
      case "assignment_view": activityEnabled = !!pref.alertOnAssignmentView; break;
      case "drill_start": activityEnabled = !!pref.alertOnDrillStart; break;
      case "drill_complete": activityEnabled = !!pref.alertOnDrillComplete; break;
      case "video_submit": activityEnabled = !!pref.alertOnVideoSubmit; break;
      case "message_sent": activityEnabled = !!pref.alertOnMessageSent; break;
      default: activityEnabled = true;
    }

    return {
      shouldNotifyInApp: activityEnabled && !!pref.inAppAlerts,
      shouldNotifyEmail: activityEnabled && !!pref.emailAlerts,
    };
  } catch (error) {
    console.error("[Activity] Failed to check coach preferences:", error);
    return { shouldNotifyInApp: true, shouldNotifyEmail: true }; // Default to notifying if error
  }
}

/**
 * Get action URL for notification based on activity type
 */
function getActionUrl(activityType: ActivityType, relatedId?: string): string {
  switch (activityType) {
    case "drill_view":
    case "drill_start":
    case "drill_complete":
      return relatedId ? `/drill/${relatedId}` : "/coach-dashboard";
    case "video_submit":
      return "/submissions";
    case "message_sent":
      return "/coach-messaging";
    default:
      return "/coach-dashboard";
  }
}

/**
 * Get recent activities for coach dashboard
 */
export async function getRecentActivities(limit: number = 50): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const activities = await db
      .select({
        id: athleteActivity.id,
        athleteId: athleteActivity.athleteId,
        athleteName: users.name,
        athleteEmail: users.email,
        activityType: athleteActivity.activityType,
        relatedId: athleteActivity.relatedId,
        relatedType: athleteActivity.relatedType,
        metadata: athleteActivity.metadata,
        createdAt: athleteActivity.createdAt,
      })
      .from(athleteActivity)
      .leftJoin(users, eq(athleteActivity.athleteId, users.id))
      .orderBy(desc(athleteActivity.createdAt))
      .limit(limit);

    return activities;
  } catch (error) {
    console.error("[Activity] Failed to get recent activities:", error);
    return [];
  }
}

/**
 * Get activities for a specific athlete
 */
export async function getAthleteActivities(athleteId: number, limit: number = 20): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const activities = await db
      .select()
      .from(athleteActivity)
      .where(eq(athleteActivity.athleteId, athleteId))
      .orderBy(desc(athleteActivity.createdAt))
      .limit(limit);

    return activities;
  } catch (error) {
    console.error("[Activity] Failed to get athlete activities:", error);
    return [];
  }
}

/**
 * Get activity summary stats for coach dashboard
 */
export async function getActivitySummary(): Promise<{
  activeAthletesToday: number;
  drillsViewedToday: number;
  drillsCompletedToday: number;
  videosSubmittedToday: number;
  messagesReceivedToday: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      activeAthletesToday: 0,
      drillsViewedToday: 0,
      drillsCompletedToday: 0,
      videosSubmittedToday: 0,
      messagesReceivedToday: 0,
    };
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get unique athletes who logged in today
    const activeAthletes = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${athleteActivity.athleteId})` })
      .from(athleteActivity)
      .where(
        and(
          eq(athleteActivity.activityType, "portal_login"),
          gte(athleteActivity.createdAt, today)
        )
      );

    // Get drills viewed today
    const drillsViewed = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(athleteActivity)
      .where(
        and(
          eq(athleteActivity.activityType, "drill_view"),
          gte(athleteActivity.createdAt, today)
        )
      );

    // Get drills completed today
    const drillsCompleted = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(athleteActivity)
      .where(
        and(
          eq(athleteActivity.activityType, "drill_complete"),
          gte(athleteActivity.createdAt, today)
        )
      );

    // Get videos submitted today
    const videosSubmitted = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(athleteActivity)
      .where(
        and(
          eq(athleteActivity.activityType, "video_submit"),
          gte(athleteActivity.createdAt, today)
        )
      );

    // Get messages received today
    const messagesReceived = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(athleteActivity)
      .where(
        and(
          eq(athleteActivity.activityType, "message_sent"),
          gte(athleteActivity.createdAt, today)
        )
      );

    return {
      activeAthletesToday: Number(activeAthletes[0]?.count) || 0,
      drillsViewedToday: Number(drillsViewed[0]?.count) || 0,
      drillsCompletedToday: Number(drillsCompleted[0]?.count) || 0,
      videosSubmittedToday: Number(videosSubmitted[0]?.count) || 0,
      messagesReceivedToday: Number(messagesReceived[0]?.count) || 0,
    };
  } catch (error) {
    console.error("[Activity] Failed to get activity summary:", error);
    return {
      activeAthletesToday: 0,
      drillsViewedToday: 0,
      drillsCompletedToday: 0,
      videosSubmittedToday: 0,
      messagesReceivedToday: 0,
    };
  }
}

/**
 * Get last activity timestamp for each athlete
 */
export async function getAthletesLastSeen(): Promise<Map<number, Date>> {
  const db = await getDb();
  if (!db) return new Map();

  try {
    const lastSeen = await db
      .select({
        athleteId: athleteActivity.athleteId,
        lastActivity: sql<Date>`MAX(${athleteActivity.createdAt})`,
      })
      .from(athleteActivity)
      .groupBy(athleteActivity.athleteId);

    const map = new Map<number, Date>();
    for (const row of lastSeen) {
      map.set(row.athleteId, row.lastActivity);
    }
    return map;
  } catch (error) {
    console.error("[Activity] Failed to get athletes last seen:", error);
    return new Map();
  }
}

/**
 * Get or create coach alert preferences
 */
export async function getCoachAlertPreferences(coachId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const prefs = await db.select().from(coachAlertPreferences).where(eq(coachAlertPreferences.coachId, coachId)).limit(1);
    
    if (prefs.length === 0) {
      // Create default preferences
      await db.insert(coachAlertPreferences).values({ coachId });
      const newPrefs = await db.select().from(coachAlertPreferences).where(eq(coachAlertPreferences.coachId, coachId)).limit(1);
      return newPrefs[0] || null;
    }
    
    return prefs[0];
  } catch (error) {
    console.error("[Activity] Failed to get coach alert preferences:", error);
    return null;
  }
}

/**
 * Update coach alert preferences
 */
export async function updateCoachAlertPreferences(
  coachId: number,
  updates: Partial<{
    alertOnPortalLogin: number;
    alertOnDrillView: number;
    alertOnAssignmentView: number;
    alertOnDrillStart: number;
    alertOnDrillComplete: number;
    alertOnVideoSubmit: number;
    alertOnMessageSent: number;
    alertOnInactivity: number;
    inactivityDays: number;
    inAppAlerts: number;
    emailAlerts: number;
    emailDigest: number;
  }>
) {
  const db = await getDb();
  if (!db) return false;

  try {
    // Ensure preferences exist
    await getCoachAlertPreferences(coachId);
    
    await db.update(coachAlertPreferences)
      .set(updates)
      .where(eq(coachAlertPreferences.coachId, coachId));
    
    return true;
  } catch (error) {
    console.error("[Activity] Failed to update coach alert preferences:", error);
    return false;
  }
}

/**
 * Get inactive athletes (haven't logged in for X days)
 */
export async function getInactiveAthletes(days: number = 3): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get all athletes
    const athletes = await db.select().from(users).where(eq(users.role, "athlete"));
    
    // Get last activity for each athlete
    const lastSeenMap = await getAthletesLastSeen();
    
    // Filter to inactive athletes
    const inactive = athletes.filter(athlete => {
      const lastSeen = lastSeenMap.get(athlete.id);
      if (!lastSeen) return true; // Never logged in
      return lastSeen < cutoffDate;
    });

    return inactive.map(athlete => ({
      ...athlete,
      lastSeen: lastSeenMap.get(athlete.id) || null,
      daysSinceLastActivity: lastSeenMap.get(athlete.id) 
        ? Math.floor((Date.now() - lastSeenMap.get(athlete.id)!.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));
  } catch (error) {
    console.error("[Activity] Failed to get inactive athletes:", error);
    return [];
  }
}
