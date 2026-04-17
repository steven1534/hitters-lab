import { Resend } from "resend";
import { ENV } from "./_core/env";

// Lazy-initialize so missing key doesn't crash the server on startup
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(ENV.resendApiKey || "placeholder_not_configured");
  }
  return _resend;
}

export interface DrillAssignmentEmailData {
  athleteEmail: string;
  athleteName: string;
  drillName: string;
  drillDifficulty: string;
  drillDuration: string;
  coachNotes?: string;
  coachName?: string;
  portalUrl: string;
}

export async function sendDrillAssignmentEmail(data: DrillAssignmentEmailData): Promise<{ success: boolean; error?: string }> {
  if (!ENV.resendApiKey) {
    console.warn("[Email] Resend API key not configured, skipping email");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const emailHtml = generateDrillAssignmentEmailHtml(data);

    const result = await getResend().emails.send({
      from: "coach@coachstevebaseball.com",
      to: data.athleteEmail,
      subject: `New Drill Assignment: ${data.drillName}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error("[Email] Failed to send drill assignment email:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("[Email] Drill assignment email sent successfully to", data.athleteEmail);
    return { success: true };
  } catch (error) {
    console.error("[Email] Error sending drill assignment email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function generateDrillAssignmentEmailHtml(data: DrillAssignmentEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
          .drill-card { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626; }
          .drill-name { font-size: 20px; font-weight: bold; color: #1e3a8a; margin: 0 0 10px 0; }
          .drill-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
          .detail-item { font-size: 14px; }
          .detail-label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
          .detail-value { color: #333; margin-top: 4px; }
          .notes-section { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          .notes-label { font-weight: bold; color: #92400e; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; }
          .notes-text { color: #78350f; }
          .cta-button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
          .coach-name { color: #666; font-size: 14px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 New Drill Assignment</h1>
            <p>Hi ${data.athleteName}!</p>
          </div>
          
          <div class="content">
            <p>Your coach has assigned you a new drill. Check out the details below and log in to the athlete portal to get started!</p>
            
            <div class="drill-card">
              <div class="drill-name">${data.drillName}</div>
              
              <div class="drill-details">
                <div class="detail-item">
                  <div class="detail-label">Difficulty</div>
                  <div class="detail-value">${data.drillDifficulty}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Duration</div>
                  <div class="detail-value">${data.drillDuration}</div>
                </div>
              </div>
              
              ${data.coachNotes ? `
                <div class="notes-section">
                  <div class="notes-label">Coach Notes</div>
                  <div class="notes-text">${data.coachNotes}</div>
                </div>
              ` : ''}
            </div>
            
            <div style="text-align: center;">
              <a href="${data.portalUrl}" class="cta-button">View in Athlete Portal</a>
            </div>
            
            ${data.coachName ? `
              <div class="coach-name">
                <strong>Coach:</strong> ${data.coachName}
              </div>
            ` : ''}
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              Log in to your athlete portal to track your progress and update the status of your drills. Good luck! 💪
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated email from Coach Steve's Hitters Lab. Please don't reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}


export interface SubmissionNotificationData {
  coachEmail: string;
  coachName: string;
  athleteName: string;
  drillName: string;
  submissionNotes?: string;
  submissionUrl: string;
}

export interface FeedbackNotificationData {
  athleteEmail: string;
  athleteName: string;
  coachName: string;
  drillName: string;
  feedback: string;
  feedbackUrl: string;
}

/**
 * Send email notification to coach when athlete submits drill work
 */
export async function sendSubmissionNotificationToCoach(data: SubmissionNotificationData): Promise<{ success: boolean; error?: string }> {
  if (!ENV.resendApiKey) {
    console.warn("[Email] Resend API key not configured, skipping submission notification");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
      .submission-card { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626; }
      .athlete-name { font-size: 18px; font-weight: bold; color: #1e3a8a; }
      .drill-name { color: #666; font-size: 14px; margin-top: 5px; }
      .notes-section { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b; }
      .notes-label { font-weight: bold; color: #92400e; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; }
      .notes-text { color: #78350f; }
      .cta-button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
      .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🎯 New Drill Submission</h1>
      </div>
      <div class="content">
        <p>Hi ${data.coachName},</p>
        
        <p><strong>${data.athleteName}</strong> just submitted their work for the <strong>${data.drillName}</strong> drill!</p>
        
        <div class="submission-card">
          <div class="athlete-name">${data.athleteName}</div>
          <div class="drill-name">Drill: ${data.drillName}</div>
          ${data.submissionNotes ? `
          <div class="notes-section">
            <div class="notes-label">Athlete's Notes:</div>
            <div class="notes-text">${data.submissionNotes}</div>
          </div>
          ` : ''}
        </div>
        
        <p>Review the submission and provide feedback to keep your athlete engaged and motivated.</p>
        
        <div style="text-align: center;">
          <a href="${data.submissionUrl}" class="cta-button">View Submission</a>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from Coach Steve's Hitters Lab.</p>
        </div>
      </div>
    </div>
  </body>
</html>
    `;

    const result = await getResend().emails.send({
      from: "coach@coachstevebaseball.com",
      to: data.coachEmail,
      subject: `New Submission: ${data.athleteName} - ${data.drillName}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error("[Email] Failed to send submission notification:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("[Email] Submission notification sent to", data.coachEmail);
    return { success: true };
  } catch (error) {
    console.error("[Email] Error sending submission notification:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Send email notification to athlete when coach provides feedback
 */
export async function sendFeedbackNotificationToAthlete(data: FeedbackNotificationData): Promise<{ success: boolean; error?: string }> {
  if (!ENV.resendApiKey) {
    console.warn("[Email] Resend API key not configured, skipping feedback notification");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
      .feedback-card { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
      .coach-name { font-size: 16px; font-weight: bold; color: #1e3a8a; }
      .drill-name { color: #666; font-size: 14px; margin-top: 5px; }
      .feedback-section { background: #ecfdf5; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #10b981; }
      .feedback-label { font-weight: bold; color: #065f46; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; }
      .feedback-text { color: #047857; }
      .cta-button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
      .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>💬 Coach Feedback Received</h1>
      </div>
      <div class="content">
        <p>Hi ${data.athleteName},</p>
        
        <p><strong>${data.coachName}</strong> provided feedback on your <strong>${data.drillName}</strong> submission!</p>
        
        <div class="feedback-card">
          <div class="coach-name">${data.coachName}</div>
          <div class="drill-name">Drill: ${data.drillName}</div>
          <div class="feedback-section">
            <div class="feedback-label">Feedback:</div>
            <div class="feedback-text">${data.feedback}</div>
          </div>
        </div>
        
        <p>Keep up the great work! Review the feedback and continue improving your performance.</p>
        
        <div style="text-align: center;">
          <a href="${data.feedbackUrl}" class="cta-button">View Feedback</a>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from Coach Steve's Hitters Lab.</p>
        </div>
      </div>
    </div>
  </body>
</html>
    `;

    const result = await getResend().emails.send({
      from: "coach@coachstevebaseball.com",
      to: data.athleteEmail,
      subject: `Feedback from ${data.coachName}: ${data.drillName}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error("[Email] Failed to send feedback notification:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("[Email] Feedback notification sent to", data.athleteEmail);
    return { success: true };
  } catch (error) {
    console.error("[Email] Error sending feedback notification:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export interface InviteEmailData {
  toEmail: string;
  inviteLink: string;
  inviteType: "coach" | "athlete";
  expiresAt: Date;
}

export async function sendInviteEmail(data: InviteEmailData): Promise<{ success: boolean; error?: string }> {
  if (!ENV.resendApiKey) {
    console.warn("[Email] Resend API key not configured, skipping invite email");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const emailHtml = generateInviteEmailHtml(data);
    const subject = data.inviteType === "coach" 
      ? "You're Invited to Coach Steve's Hitters Lab"
      : "Join Your Team on Coach Steve's Hitters Lab";

    const result = await getResend().emails.send({
      from: "coach@coachstevebaseball.com",
      to: data.toEmail,
      subject: subject,
      html: emailHtml,
    });

    if (result.error) {
      console.error("[Email] Failed to send invite email:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("[Email] Invite email sent successfully to", data.toEmail);
    return { success: true };
  } catch (error) {
    console.error("[Email] Error sending invite email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function generateInviteEmailHtml(data: InviteEmailData): string {
  const roleText = data.inviteType === "coach" ? "Coach" : "Athlete";
  const expiresDate = new Date(data.expiresAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
          .cta-button { display: inline-block; background: #dc2626; color: white; padding: 14px 35px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 25px 0; font-size: 16px; }
          .features-list { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #1e3a8a; }
          .features-list ul { margin: 10px 0; padding-left: 20px; }
          .features-list li { margin: 8px 0; }
          .expires-box { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .expires-label { font-weight: bold; color: #92400e; font-size: 12px; text-transform: uppercase; }
          .expires-date { color: #78350f; font-size: 14px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚾ Coach Steve's Hitters Lab</h1>
            <p>You're Invited!</p>
          </div>
          
          <div class="content">
            <p>Hi there!</p>
            <p>You've been invited to join Coach Steve's Hitters Lab as an <strong>${roleText}</strong>.</p>
            
            <div class="features-list">
              <strong>What you'll get access to:</strong>
              <ul>
                ${data.inviteType === "coach" ? `
                  <li>200+ professional baseball drills</li>
                  <li>Assign drills to your athletes</li>
                  <li>Track athlete progress and completion</li>
                  <li>Provide feedback and notes</li>
                  <li>Customize drill content</li>
                ` : `
                  <li>View drills assigned by your coach</li>
                  <li>Track your progress</li>
                  <li>Add personal notes</li>
                  <li>Earn achievement badges</li>
                  <li>Receive coach feedback</li>
                `}
              </ul>
            </div>
            
            <div style="text-align: center;">
              <a href="${data.inviteLink}" class="cta-button">Accept Invitation</a>
            </div>
            
            <div class="expires-box">
              <div class="expires-label">⏰ Invitation Expires</div>
              <div class="expires-date">${expiresDate}</div>
            </div>
            
            <p>If you have any questions or didn't expect this invitation, please contact your coach or team administrator.</p>
            
            <p>Best regards,<br><strong>Coach Steve</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2026 Coach Steve's Hitters Lab. All rights reserved.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}


export interface EmailVerificationData {
  toEmail: string;
  verificationLink: string;
  athleteName: string;
}

export async function sendEmailVerificationEmail(data: EmailVerificationData): Promise<{ success: boolean; error?: string }> {
  if (!ENV.resendApiKey) {
    console.warn("[Email] Resend API key not configured, skipping email verification");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const emailHtml = generateEmailVerificationHtml(data);

    const result = await getResend().emails.send({
      from: "coach@coachstevebaseball.com",
      to: data.toEmail,
      subject: "Verify Your Email - Coach Steve's Hitters Lab",
      html: emailHtml,
    });

    if (result.error) {
      console.error("[Email] Failed to send email verification:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("[Email] Email verification sent to", data.toEmail);
    return { success: true };
  } catch (error) {
    console.error("[Email] Error sending email verification:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function generateEmailVerificationHtml(data: EmailVerificationData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
          .cta-button { display: inline-block; background: #dc2626; color: white; padding: 14px 35px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 25px 0; font-size: 16px; }
          .info-box { background: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #1e3a8a; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚾ Coach Steve's Hitters Lab</h1>
            <p>Verify Your Email</p>
          </div>
          
          <div class="content">
            <p>Hi ${data.athleteName},</p>
            <p>Thank you for accepting your invitation! To complete your account setup, please verify your email address by clicking the button below.</p>
            
            <div style="text-align: center;">
              <a href="${data.verificationLink}" class="cta-button">Verify Email Address</a>
            </div>
            
            <div class="info-box">
              <p><strong>Why verify?</strong> Verifying your email ensures you receive important notifications about drill assignments, coach feedback, and other updates.</p>
            </div>
            
            <p>This verification link will expire in 24 hours. If it expires, you can request a new one from your account settings.</p>
            
            <p>If you didn't create this account, please ignore this email.</p>
            
            <p>Best regards,<br><strong>Coach Steve</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2026 Coach Steve's Hitters Lab. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export interface InviteExpirationReminderData {
  toEmail: string;
  athleteName: string;
  inviteLink: string;
  expiresAt: Date;
}

export async function sendInviteExpirationReminderEmail(data: InviteExpirationReminderData): Promise<{ success: boolean; error?: string }> {
  if (!ENV.resendApiKey) {
    console.warn("[Email] Resend API key not configured, skipping expiration reminder");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const emailHtml = generateInviteExpirationReminderHtml(data);

    const result = await getResend().emails.send({
      from: "coach@coachstevebaseball.com",
      to: data.toEmail,
      subject: "Your Invitation Expires Soon - Coach Steve's Hitters Lab",
      html: emailHtml,
    });

    if (result.error) {
      console.error("[Email] Failed to send expiration reminder:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("[Email] Expiration reminder sent to", data.toEmail);
    return { success: true };
  } catch (error) {
    console.error("[Email] Error sending expiration reminder:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function generateInviteExpirationReminderHtml(data: InviteExpirationReminderData): string {
  const expiresDate = new Date(data.expiresAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
          .cta-button { display: inline-block; background: #dc2626; color: white; padding: 14px 35px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 25px 0; font-size: 16px; }
          .warning-box { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .warning-label { font-weight: bold; color: #92400e; font-size: 12px; text-transform: uppercase; }
          .warning-text { color: #78350f; margin-top: 5px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚾ Coach Steve's Hitters Lab</h1>
            <p>Invitation Expiring Soon</p>
          </div>
          
          <div class="content">
            <p>Hi ${data.athleteName},</p>
            <p>Your invitation to join Coach Steve's Hitters Lab is expiring soon. Don't miss out—accept your invitation now to get started!</p>
            
            <div class="warning-box">
              <div class="warning-label">⏰ Expires On</div>
              <div class="warning-text">${expiresDate}</div>
            </div>
            
            <div style="text-align: center;">
              <a href="${data.inviteLink}" class="cta-button">Accept Invitation Now</a>
            </div>
            
            <p>Once you accept, you'll have access to:</p>
            <ul>
              <li>200+ professional baseball drills</li>
              <li>Personalized drill assignments from your coach</li>
              <li>Progress tracking and achievement badges</li>
              <li>Coach feedback and guidance</li>
            </ul>
            
            <p>If you have any questions, please reach out to your coach.</p>
            
            <p>Best regards,<br><strong>Coach Steve</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2026 Coach Steve's Hitters Lab. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}


export interface WelcomeEmailData {
  athleteEmail: string;
  athleteName: string;
  portalUrl: string;
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<{ success: boolean; error?: string }> {
  if (!ENV.resendApiKey) {
    console.warn("[Email] Resend API key not configured, skipping welcome email");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const emailHtml = generateWelcomeEmailHtml(data);

    const result = await getResend().emails.send({
      from: "coach@coachstevebaseball.com",
      to: data.athleteEmail,
      subject: "Welcome to Coach Steve's Hitters Lab! 🎉",
      html: emailHtml,
    });

    if (result.error) {
      console.error("[Email] Failed to send welcome email:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("[Email] Welcome email sent successfully to", data.athleteEmail);
    return { success: true };
  } catch (error) {
    console.error("[Email] Error sending welcome email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function generateWelcomeEmailHtml(data: WelcomeEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 32px; font-weight: bold; }
          .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.95; }
          .content { background: #f9fafb; padding: 40px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
          .welcome-section { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .welcome-section h2 { color: #065f46; margin-top: 0; }
          .features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .feature-item { background: #ecfdf5; padding: 15px; border-radius: 6px; text-align: center; }
          .feature-icon { font-size: 24px; margin-bottom: 8px; }
          .feature-text { font-size: 14px; color: #047857; font-weight: 500; }
          .cta-button { display: inline-block; background: #10b981; color: white; padding: 14px 35px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 25px auto; font-size: 16px; text-align: center; }
          .button-container { text-align: center; }
          .next-steps { background: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
          .next-steps h3 { color: #065f46; margin-top: 0; }
          .next-steps ol { margin: 10px 0; padding-left: 20px; }
          .next-steps li { margin: 8px 0; color: #047857; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
          .contact-info { background: #eff6ff; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #3b82f6; }
          .contact-info p { margin: 5px 0; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Coach Steve's Hitters Lab!</h1>
            <p>Your account is now active and ready to go</p>
          </div>
          
          <div class="content">
            <p>Hi ${data.athleteName},</p>
            
            <p>Welcome to Coach Steve's Hitters Lab! Your account has been activated and you now have full access to all the drills and training materials.</p>
            
            <div class="welcome-section">
              <h2>What You Can Do Now</h2>
              <div class="features-grid">
                <div class="feature-item">
                  <div class="feature-icon">📚</div>
                  <div class="feature-text">View Assigned Drills</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">✅</div>
                  <div class="feature-text">Track Progress</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">📝</div>
                  <div class="feature-text">Add Personal Notes</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">💬</div>
                  <div class="feature-text">Receive Feedback</div>
                </div>
              </div>
            </div>
            
            <div class="button-container">
              <a href="${data.portalUrl}" class="cta-button">Go to Your Athlete Portal</a>
            </div>
            
            <div class="next-steps">
              <h3>🚀 Getting Started</h3>
              <ol>
                <li>Log in to your athlete portal using your account credentials</li>
                <li>Check the "Assigned Drills" section to see what your coach has assigned</li>
                <li>Review each drill's details, video, and instructions</li>
                <li>Complete the drills and track your progress</li>
                <li>Receive feedback from your coach on your submissions</li>
              </ol>
            </div>
            
            <div class="contact-info">
              <p><strong>Need Help?</strong></p>
              <p>If you have any questions or need assistance, please reach out to your coach or contact our support team.</p>
            </div>
            
            <p>We're excited to have you on board! Let's work together to improve your baseball skills.</p>
            
            <p>Best regards,<br><strong>Coach Steve</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2026 Coach Steve's Hitters Lab. All rights reserved.</p>
            <p>This is an automated welcome message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}


// ============================================
// Instant Activity Email Alerts for Coach
// ============================================

export interface ActivityAlertEmailData {
  coachEmail: string;
  coachName: string;
  athleteName: string;
  activityType: string;
  activityMessage: string;
  actionUrl: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Send instant email alert to coach when athlete performs an activity
 */
export async function sendActivityAlertEmail(data: ActivityAlertEmailData): Promise<{ success: boolean; error?: string }> {
  if (!ENV.resendApiKey) {
    console.warn("[Email] Resend API key not configured, skipping activity alert");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const activityIcon = getActivityIcon(data.activityType);
    const activityColor = getActivityColor(data.activityType);
    const formattedTime = data.timestamp.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    }) + ' EST';

    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: ${activityColor}; color: white; padding: 25px; border-radius: 8px 8px 0 0; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
      .header .icon { font-size: 32px; margin-bottom: 10px; }
      .content { background: #f9fafb; padding: 25px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
      .activity-card { background: white; padding: 20px; border-radius: 6px; margin: 15px 0; border-left: 4px solid ${activityColor}; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .athlete-name { font-size: 18px; font-weight: bold; color: #1e3a8a; margin-bottom: 5px; }
      .activity-message { color: #4b5563; font-size: 16px; margin: 10px 0; }
      .timestamp { color: #9ca3af; font-size: 13px; margin-top: 10px; }
      .cta-button { display: inline-block; background: ${activityColor}; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 15px 0; }
      .footer { text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
      .footer a { color: #6b7280; text-decoration: underline; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="icon">${activityIcon}</div>
        <h1>Athlete Activity Alert</h1>
      </div>
      <div class="content">
        <p>Hi ${data.coachName},</p>
        
        <div class="activity-card">
          <div class="athlete-name">${data.athleteName}</div>
          <div class="activity-message">${data.activityMessage}</div>
          <div class="timestamp">📅 ${formattedTime}</div>
        </div>
        
        <div style="text-align: center;">
          <a href="${data.actionUrl}" class="cta-button">View Details</a>
        </div>
        
        <div class="footer">
          <p>You're receiving this because you have instant email alerts enabled.</p>
          <p><a href="${data.actionUrl.split('/').slice(0, 3).join('/')}/activity-feed">Manage Alert Preferences</a></p>
        </div>
      </div>
    </div>
  </body>
</html>
    `;

    const result = await getResend().emails.send({
      from: "coach@coachstevebaseball.com",
      to: data.coachEmail,
      subject: `🔔 ${data.athleteName} ${getActivitySubject(data.activityType)}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error("[Email] Failed to send activity alert:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("[Email] Activity alert sent to", data.coachEmail);
    return { success: true };
  } catch (error) {
    console.error("[Email] Error sending activity alert:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
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

function getActivityColor(activityType: string): string {
  const colors: Record<string, string> = {
    portal_login: "#3b82f6", // blue
    drill_view: "#8b5cf6", // purple
    assignment_view: "#6366f1", // indigo
    drill_start: "#f59e0b", // amber
    drill_complete: "#10b981", // green
    video_submit: "#dc2626", // red
    message_sent: "#0891b2", // cyan
    profile_update: "#6b7280", // gray
  };
  return colors[activityType] || "#1e3a8a";
}

function getActivitySubject(activityType: string): string {
  const subjects: Record<string, string> = {
    portal_login: "just logged in",
    drill_view: "viewed a drill",
    assignment_view: "checked their assignments",
    drill_start: "started a drill",
    drill_complete: "completed a drill",
    video_submit: "submitted a video",
    message_sent: "sent you a message",
    profile_update: "updated their profile",
  };
  return subjects[activityType] || "performed an activity";
}


// ==========================================
// Follow-up Reminder Emails
// ==========================================

export interface DrillFollowUpReminderData {
  athleteEmail: string;
  athleteName: string;
  drills: Array<{ name: string; assignedDate: string; status: string }>;
  coachName: string;
  portalUrl: string;
}

export async function sendDrillFollowUpReminder(data: DrillFollowUpReminderData): Promise<{ success: boolean; error?: string }> {
  if (!ENV.resendApiKey) {
    console.warn("[Email] Resend API key not configured, skipping follow-up reminder");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const drillRows = data.drills.map(d => `
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${d.name}</td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb; color: #666;">${d.assignedDate}</td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb;">
          <span style="background: ${d.status === 'in-progress' ? '#fef3c7' : '#fee2e2'}; color: ${d.status === 'in-progress' ? '#92400e' : '#991b1b'}; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${d.status === 'in-progress' ? 'In Progress' : 'Not Started'}</span>
        </td>
      </tr>
    `).join('');

    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
      .drill-table { width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden; margin: 20px 0; }
      .drill-table th { background: #1e3a8a; color: white; padding: 12px 15px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
      .cta-button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
      .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
      .motivation { background: #ecfdf5; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #10b981; font-style: italic; color: #065f46; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>⏰ Drill Reminder</h1>
        <p>You have ${data.drills.length} drill${data.drills.length > 1 ? 's' : ''} waiting for you!</p>
      </div>
      <div class="content">
        <p>Hi ${data.athleteName},</p>
        <p>Your coach <strong>${data.coachName}</strong> wanted to remind you about your outstanding drill assignments. Here's what's on your plate:</p>
        
        <table class="drill-table">
          <thead>
            <tr>
              <th>Drill</th>
              <th>Assigned</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${drillRows}
          </tbody>
        </table>
        
        <div class="motivation">
          "Consistency beats intensity. Show up, put in the work, and the results will follow." — ${data.coachName}
        </div>
        
        <div style="text-align: center;">
          <a href="${data.portalUrl}" class="cta-button">Go to Athlete Portal</a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 20px;">Log in and start working through your drills. Your coach is tracking your progress and is here to help!</p>
      </div>
      <div class="footer">
        <p>This is an automated reminder from Coach Steve's Hitters Lab.</p>
      </div>
    </div>
  </body>
</html>
    `;

    const result = await getResend().emails.send({
      from: "coach@coachstevebaseball.com",
      to: data.athleteEmail,
      subject: `Drill Reminder: ${data.drills.length} drill${data.drills.length > 1 ? 's' : ''} waiting for you`,
      html: emailHtml,
    });

    if (result.error) {
      console.error("[Email] Failed to send follow-up reminder:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("[Email] Follow-up reminder sent to", data.athleteEmail);
    return { success: true };
  } catch (error) {
    console.error("[Email] Error sending follow-up reminder:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}


// ==========================================
// Practice Plan Sharing Notification
// ==========================================

export interface PracticePlanShareData {
  athleteEmail: string;
  athleteName: string;
  planTitle: string;
  sessionDate?: string;
  focusAreas: string[];
  totalDuration: number;
  blockCount: number;
  coachName: string;
  portalUrl: string;
}

export async function sendPracticePlanShareEmail(data: PracticePlanShareData): Promise<{ success: boolean; error?: string }> {
  if (!ENV.resendApiKey) {
    console.warn("[Email] Resend API key not configured, skipping practice plan share notification");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const focusBadges = data.focusAreas.map(f => 
      `<span style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; margin: 2px;">${f}</span>`
    ).join(' ');

    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
      .plan-card { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed; }
      .plan-title { font-size: 20px; font-weight: bold; color: #1e3a8a; margin: 0 0 15px 0; }
      .plan-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 15px 0; }
      .meta-item { font-size: 14px; }
      .meta-label { font-weight: bold; color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
      .meta-value { color: #333; margin-top: 4px; }
      .cta-button { display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
      .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>📋 New Practice Plan Shared</h1>
        <p>Your coach has shared a session plan with you!</p>
      </div>
      <div class="content">
        <p>Hi ${data.athleteName},</p>
        <p>Coach <strong>${data.coachName}</strong> has shared a practice plan with you. Review the details below and prepare for your session!</p>
        
        <div class="plan-card">
          <div class="plan-title">${data.planTitle}</div>
          <div class="plan-meta">
            ${data.sessionDate ? `
            <div class="meta-item">
              <div class="meta-label">Session Date</div>
              <div class="meta-value">${data.sessionDate}</div>
            </div>
            ` : ''}
            <div class="meta-item">
              <div class="meta-label">Duration</div>
              <div class="meta-value">${data.totalDuration} minutes</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Activities</div>
              <div class="meta-value">${data.blockCount} block${data.blockCount > 1 ? 's' : ''}</div>
            </div>
          </div>
          ${data.focusAreas.length > 0 ? `
          <div style="margin-top: 12px;">
            <div style="font-weight: bold; color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Focus Areas</div>
            ${focusBadges}
          </div>
          ` : ''}
        </div>
        
        <div style="text-align: center;">
          <a href="${data.portalUrl}" class="cta-button">View Practice Plan</a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 20px;">Log in to your athlete portal to see the full session breakdown with all drill details and coaching notes.</p>
      </div>
      <div class="footer">
        <p>This is an automated notification from Coach Steve's Hitters Lab.</p>
      </div>
    </div>
  </body>
</html>
    `;

    const result = await getResend().emails.send({
      from: "coach@coachstevebaseball.com",
      to: data.athleteEmail,
      subject: `Practice Plan: ${data.planTitle}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error("[Email] Failed to send practice plan share email:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("[Email] Practice plan share email sent to", data.athleteEmail);
    return { success: true };
  } catch (error) {
    console.error("[Email] Error sending practice plan share email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}


// ============================================================
// Video Analysis Feedback Email
// ============================================================

export interface VideoAnalysisFeedbackEmailData {
  athleteEmail: string;
  athleteName: string;
  coachName: string;
  feedback: string;
  drillName: string;
  portalUrl: string;
}

export async function sendVideoAnalysisFeedbackEmail(data: VideoAnalysisFeedbackEmailData): Promise<{ success: boolean; error?: string }> {
  if (!ENV.resendApiKey) {
    console.warn("[Email] Resend API key not configured, skipping video analysis feedback email");
    return { success: false, error: "Email service not configured" };
  }

  try {
    // Convert markdown-style feedback to simple HTML
    const feedbackHtml = data.feedback
      .replace(/^## (.+)$/gm, '<h2 style="color:#1e3a8a;margin-top:20px;margin-bottom:10px;font-size:18px;">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 style="color:#334155;margin-top:15px;margin-bottom:8px;font-size:16px;">$1</h3>')
      .replace(/^- (.+)$/gm, '<li style="margin-bottom:4px;">$1</li>')
      .replace(/\n/g, '<br>');

    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background: #f1f5f9; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
      .header h1 { margin: 0 0 8px 0; font-size: 24px; }
      .header p { margin: 0; opacity: 0.9; font-size: 14px; }
      .content { background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; }
      .drill-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
      .feedback-section { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
      .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
      .footer { text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
      ul { padding-left: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🎬 Video Feedback Ready</h1>
        <p>Your coach has reviewed your video submission</p>
      </div>
      <div class="content">
        <p>Hi ${data.athleteName},</p>
        <p><strong>${data.coachName}</strong> has reviewed your video submission and provided detailed feedback.</p>
        <div class="drill-badge">Drill: ${data.drillName}</div>
        <div class="feedback-section">
          ${feedbackHtml}
        </div>
        <p style="text-align:center;">
          <a href="${data.portalUrl}" class="cta-button">View in Your Portal</a>
        </p>
        <div class="footer">
          <p>This feedback was generated with AI assistance and reviewed by your coach.</p>
          <p>Coach Steve's Hitters Lab</p>
        </div>
      </div>
    </div>
  </body>
</html>`;

    const result = await getResend().emails.send({
      from: "coach@coachstevebaseball.com",
      to: data.athleteEmail,
      subject: `Video Feedback: ${data.drillName} — Coach ${data.coachName}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error("[Email] Failed to send video analysis feedback:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("[Email] Video analysis feedback sent to", data.athleteEmail);
    return { success: true };
  } catch (error) {
    console.error("[Email] Error sending video analysis feedback:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
