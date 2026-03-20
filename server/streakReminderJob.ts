import { getDb } from "./db";
import { users, drillAssignments } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendStreakReminderEmail } from "./emailService";
import { calculateStreak } from "./drillAssignments";

/**
 * Check all active athletes and send streak reminder emails
 * to those who have a streak >= 3 days and haven't completed a drill today
 */
export async function runStreakReminderJob() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available for streak reminder job");
    return;
  }

  try {
    // Get all active athletes
    const athletes = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "athlete"), eq(users.isActiveClient, 1)));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const athlete of athletes) {
      // Calculate current streak
      const streak = await calculateStreak(athlete.id);

      // Only send reminder if streak is 3+ days
      if (streak < 3) continue;

      // Check if athlete has completed a drill today
      const completedToday = await db
        .select()
        .from(drillAssignments)
        .where(
          and(
            eq(drillAssignments.userId, athlete.id),
            eq(drillAssignments.status, "completed"),
            sql`DATE(${drillAssignments.completedAt}) = DATE(${today.toISOString()})`
          )
        )
        .limit(1);

      // If no drill completed today, send reminder
      if (completedToday.length === 0) {
        if (athlete.email && athlete.name) {
          await sendStreakReminderEmail(athlete.email, athlete.name, streak);
        }
        console.log(`Sent streak reminder to ${athlete.email} (${streak}-day streak)`);
      }
    }

    console.log("Streak reminder job completed successfully");
  } catch (error) {
    console.error("Error running streak reminder job:", error);
  }
}
