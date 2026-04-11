import { Resend } from "resend";
import { ENV } from "./_core/env";

let _resendSvc: any = null;
function getResend() { if (!_resendSvc) { _resendSvc = new Resend(ENV.resendApiKey || "placeholder_not_configured"); } return _resendSvc; }

export async function sendStreakReminderEmail(
  athleteEmail: string,
  athleteName: string,
  streakDays: number
): Promise<boolean> {
  try {
    await getResend().emails.send({
      from: "Coach Steve's Hitter's Lab <coach@coachstevebaseball.com>",
      to: athleteEmail,
      subject: `🔥 Keep your ${streakDays}-day streak alive!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a8a;">Hey ${athleteName}! 🔥</h2>
          <p style="font-size: 16px; line-height: 1.6;">
            You're on a <strong>${streakDays}-day streak</strong>! That's amazing work!
          </p>
          <p style="font-size: 16px; line-height: 1.6;">
            Complete a drill today to keep your streak going and stay on track with your training goals.
          </p>
          <div style="margin: 30px 0;">
            <a href="${ENV.forgeApiUrl.replace("/api", "")}/athlete-portal" 
               style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View My Drills
            </a>
          </div>
          <p style="font-size: 14px; color: #666;">
            Keep up the great work!<br>
            Coach Steve's Hitter's Lab
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send streak reminder email:", error);
    return false;
  }
}
