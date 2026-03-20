import { eq, and, lte, desc } from "drizzle-orm";
import { pendingEmailAlerts, users, InsertPendingEmailAlert } from "../drizzle/schema";
import { getDb } from "./db";
import { sendActivityAlertEmail, ActivityAlertEmailData } from "./email";
import { ENV } from "./_core/env";
import { Resend } from "resend";

let _resendBatch: any = null;
function getResend() { if (!_resendBatch) { _resendBatch = new Resend(ENV.resendApiKey || "placeholder_not_configured"); } return _resendBatch; }

// Batch window in milliseconds (5 minutes)
const BATCH_WINDOW_MS = 5 * 60 * 1000;

/**
 * Queue an activity alert for batched sending
 * Instead of sending immediately, we queue it and wait for more activities
 */
export async function queueActivityAlert(
  coachId: number,
  athleteId: number,
  athleteName: string,
  activityType: string,
  activityMessage: string,
  actionUrl: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Create batch key for grouping (per coach-athlete pair)
    const batchKey = `coach_${coachId}_athlete_${athleteId}`;
    
    // Calculate when this batch should be sent (5 minutes from now)
    const scheduledSendAt = new Date(Date.now() + BATCH_WINDOW_MS);

    // Check if there's already a pending batch for this coach-athlete pair
    const existingBatch = await db.select()
      .from(pendingEmailAlerts)
      .where(
        and(
          eq(pendingEmailAlerts.batchKey, batchKey),
          eq(pendingEmailAlerts.isSent, 0)
        )
      )
      .limit(1);

    // If there's an existing batch, use its scheduledSendAt time
    // This ensures all activities in the window get batched together
    const sendTime = existingBatch.length > 0 
      ? existingBatch[0].scheduledSendAt 
      : scheduledSendAt;

    // Insert the new alert into the queue
    await db.insert(pendingEmailAlerts).values({
      coachId,
      athleteId,
      athleteName,
      activityType,
      activityMessage,
      actionUrl,
      metadata: metadata || null,
      batchKey,
      scheduledSendAt: sendTime,
      isSent: 0,
    });

    console.log(`[EmailBatch] Queued alert for ${batchKey}, scheduled for ${sendTime.toISOString()}`);
    return true;
  } catch (error) {
    console.error("[EmailBatch] Failed to queue alert:", error);
    return false;
  }
}

/**
 * Process and send all pending batched emails that are due
 * This should be called periodically (e.g., every minute)
 */
export async function processPendingBatches(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const now = new Date();
    
    // Get all unique batch keys that are due to be sent
    const pendingAlerts = await db.select()
      .from(pendingEmailAlerts)
      .where(
        and(
          eq(pendingEmailAlerts.isSent, 0),
          lte(pendingEmailAlerts.scheduledSendAt, now)
        )
      )
      .orderBy(desc(pendingEmailAlerts.createdAt));

    if (pendingAlerts.length === 0) {
      return 0;
    }

    // Group alerts by batch key
    const batchGroups = new Map<string, typeof pendingAlerts>();
    for (const alert of pendingAlerts) {
      const existing = batchGroups.get(alert.batchKey) || [];
      existing.push(alert);
      batchGroups.set(alert.batchKey, existing);
    }

    let sentCount = 0;

    // Process each batch
    for (const [batchKey, alerts] of Array.from(batchGroups.entries())) {
      const coachId = alerts[0].coachId;
      
      // Get coach info
      const coach = await db.select().from(users).where(eq(users.id, coachId)).limit(1);
      if (coach.length === 0 || !coach[0].email) {
        console.warn(`[EmailBatch] No email for coach ${coachId}, marking as sent`);
        await markBatchAsSent(db, alerts.map((a: typeof pendingAlerts[0]) => a.id));
        continue;
      }

      const coachEmail = coach[0].email;
      const coachName = coach[0].name || "Coach";

      if (alerts.length === 1) {
        // Single activity - send regular email
        const alert = alerts[0];
        const baseUrl = process.env.VITE_APP_URL || "https://coachstevemobilecoach.com";
        
        await sendActivityAlertEmail({
          coachEmail,
          coachName,
          athleteName: alert.athleteName || "Athlete",
          activityType: alert.activityType,
          activityMessage: alert.activityMessage,
          actionUrl: alert.actionUrl || `${baseUrl}/activity-feed`,
          timestamp: alert.createdAt,
          metadata: alert.metadata as Record<string, any> | undefined,
        });
      } else {
        // Multiple activities - send batched digest email
        await sendBatchedActivityEmail(coachEmail, coachName, alerts);
      }

      // Mark all alerts in this batch as sent
      await markBatchAsSent(db, alerts.map((a: typeof pendingAlerts[0]) => a.id));
      sentCount += alerts.length;
    }

    console.log(`[EmailBatch] Processed ${sentCount} alerts in ${batchGroups.size} batches`);
    return sentCount;
  } catch (error) {
    console.error("[EmailBatch] Failed to process pending batches:", error);
    return 0;
  }
}

async function markBatchAsSent(db: any, alertIds: number[]): Promise<void> {
  for (const id of alertIds) {
    await db.update(pendingEmailAlerts)
      .set({ isSent: 1 })
      .where(eq(pendingEmailAlerts.id, id));
  }
}

/**
 * Send a batched email containing multiple activities
 */
async function sendBatchedActivityEmail(
  coachEmail: string,
  coachName: string,
  alerts: any[]
): Promise<boolean> {
  if (!ENV.resendApiKey) {
    console.warn("[EmailBatch] Resend API key not configured");
    return false;
  }

  try {
    const athleteName = alerts[0].athleteName || "Athlete";
    const activityCount = alerts.length;
    
    // Format activities for the email
    const activitiesHtml = alerts.map(alert => {
      const icon = getActivityIcon(alert.activityType);
      const formattedTime = new Date(alert.createdAt).toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/New_York'
      });
      
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 18px; margin-right: 8px;">${icon}</span>
            ${alert.activityMessage}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; white-space: nowrap;">
            ${formattedTime} EST
          </td>
        </tr>
      `;
    }).join('');

    const baseUrl = process.env.VITE_APP_URL || "https://coachstevemobilecoach.com";
    
    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #3b82f6; color: white; padding: 25px; border-radius: 8px 8px 0 0; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
      .header .icon { font-size: 32px; margin-bottom: 10px; }
      .content { background: #f9fafb; padding: 25px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
      .activity-table { width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .activity-table th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
      .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 15px 0; }
      .footer { text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="icon">📊</div>
        <h1>Activity Summary</h1>
      </div>
      <div class="content">
        <p>Hi ${coachName},</p>
        <p><strong>${athleteName}</strong> has been active! Here's a summary of their recent activities:</p>
        
        <table class="activity-table">
          <thead>
            <tr>
              <th>Activity</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            ${activitiesHtml}
          </tbody>
        </table>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="${baseUrl}/activity-feed" class="cta-button">View Activity Feed</a>
        </div>
        
        <div class="footer">
          <p>You're receiving this because you have instant email alerts enabled.</p>
          <p>Activities are batched to reduce email volume.</p>
        </div>
      </div>
    </div>
  </body>
</html>
    `;

    const result = await getResend().emails.send({
      from: "coach@coachstevemobilecoach.com",
      to: coachEmail,
      subject: `📊 ${athleteName} - ${activityCount} new activities`,
      html: emailHtml,
    });

    if (result.error) {
      console.error("[EmailBatch] Failed to send batched email:", result.error);
      return false;
    }

    console.log(`[EmailBatch] Batched email sent to ${coachEmail} with ${activityCount} activities`);
    return true;
  } catch (error) {
    console.error("[EmailBatch] Error sending batched email:", error);
    return false;
  }
}

function getActivityIcon(activityType: string): string {
  const icons: Record<string, string> = {
    portal_login: "👋",
    drill_view: "👁️",
    assignment_view: "📋",
    drill_start: "▶️",
    drill_complete: "✅",
    video_submit: "🎥",
    message_sent: "💬",
    profile_update: "👤",
  };
  return icons[activityType] || "📢";
}

/**
 * Start the batch processing interval
 * Checks every minute for pending batches to send
 */
let batchProcessorInterval: NodeJS.Timeout | null = null;

export function startBatchProcessor(): void {
  if (batchProcessorInterval) {
    console.log("[EmailBatch] Batch processor already running");
    return;
  }

  // Process every minute
  batchProcessorInterval = setInterval(async () => {
    await processPendingBatches();
  }, 60 * 1000);

  console.log("[EmailBatch] Batch processor started (checking every 60 seconds)");
  
  // Also process immediately on startup
  processPendingBatches();
}

export function stopBatchProcessor(): void {
  if (batchProcessorInterval) {
    clearInterval(batchProcessorInterval);
    batchProcessorInterval = null;
    console.log("[EmailBatch] Batch processor stopped");
  }
}
