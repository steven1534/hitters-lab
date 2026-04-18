import { getDb } from "./db";
import { invites } from "../drizzle/schema";
import { eq, and, lt, gt } from "drizzle-orm";
import crypto from "crypto";
import { sendInviteEmail } from "./email";
import { ENV } from "./_core/env";

/**
 * Generate a unique invite token
 */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a new invite
 */
export async function createInvite(
  email: string,
  createdByUserId: number,
  role: "user" | "admin" | "athlete" | "coach" = "athlete",
  expirationDays: number = 7,
  sendEmail: boolean = true,
  name?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const inviteToken = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  await db.insert(invites).values({
    name: name || null,
    email,
    inviteToken,
    role,
    status: "pending",
    expiresAt,
    createdByUserId,
  } as any);

  const inviteUrl = `${ENV.appUrl}/accept-invite/${inviteToken}`;

  let emailSent = false;
  let emailError: string | undefined;

  if (sendEmail) {
    const inviteType = role === "coach" ? "coach" : "athlete";
    const result = await sendInviteEmail({
      toEmail: email,
      inviteLink: inviteUrl,
      inviteType,
      expiresAt,
    });
    emailSent = result.success;
    if (!result.success) {
      emailError = result.error;
      console.error(`[Invites] Failed to send invite email to ${email}: ${result.error}`);
    }
  }

  return {
    name: name || null,
    email,
    inviteToken,
    expiresAt,
    inviteUrl,
    emailSent,
    emailError,
  };
}

/**
 * Get invite by token
 */
export async function getInviteByToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const invite = await db
    .select()
    .from(invites)
    .where(eq(invites.inviteToken, token))
    .limit(1);

  return invite[0] || null;
}

/**
 * Check if invite is valid (not expired, not already accepted)
 */
export function isInviteValid(invite: any): boolean {
  if (!invite) return false;
  if (invite.status !== "pending") return false;
  if (new Date(invite.expiresAt) < new Date()) return false;
  return true;
}

/**
 * Accept an invite and link pre-assigned drills to the user account.
 *
 * All writes run inside a single DB transaction so a partial failure
 * cannot leave the account half-linked: either the user's role is
 * updated AND the invite is marked accepted AND the pre-assigned
 * drills + notifications are linked, or none of those happen.
 */
export async function acceptInvite(
  token: string,
  userId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const invite = await getInviteByToken(token);
  console.log('[Invites] acceptInvite called with token:', token, 'userId:', userId);

  if (!invite || !isInviteValid(invite)) {
    throw new Error("Invalid or expired invite");
  }

  const { users } = await import("../drizzle/schema");
  const { drillAssignments, notifications: notificationsTbl } =
    await import("../drizzle/schema");

  return await db.transaction(async (tx) => {
    // 1. Verify the user exists (inside the tx so a deletion racing with
    //    acceptance rolls us back rather than orphaning the invite).
    const existingUser = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser || existingUser.length === 0) {
      console.error('[Invites] User not found in database with id:', userId);
      throw new Error("User account not found. Please try logging in again.");
    }
    console.log('[Invites] Found user:', existingUser[0].email, 'current role:', existingUser[0].role);

    // 2. Update user role (+ activate if athlete).
    const updateData: any = { role: invite.role };
    if (invite.role === "athlete") {
      updateData.isActiveClient = 1;
    }
    await tx.update(users).set(updateData).where(eq(users.id, userId));
    console.log('[Invites] User role updated to:', invite.role, 'isActiveClient:', updateData.isActiveClient);

    // 3. Mark invite accepted.
    await tx
      .update(invites)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
        acceptedByUserId: userId,
      })
      .where(eq(invites.inviteToken, token));

    // 4. Link any pre-assigned drills from this invite to the user and
    //    create notifications. All inside the same transaction, so if
    //    any notification insert fails, the role update and invite
    //    acceptance are also rolled back.
    await tx
      .update(drillAssignments)
      .set({ userId })
      .where(eq(drillAssignments.inviteId, invite.id));

    const linkedAssignments = await tx
      .select()
      .from(drillAssignments)
      .where(eq(drillAssignments.inviteId, invite.id));

    for (const assignment of linkedAssignments) {
      await tx.insert(notificationsTbl).values({
        userId,
        type: "assignment",
        title: "Drill Waiting for You",
        message: `You have a drill assigned: ${assignment.drillName}`,
        isRead: 0,
      });
    }
    console.log(
      '[Invites] Linked',
      linkedAssignments.length,
      'drill assignments from invite',
      invite.id,
      'to user',
      userId,
    );

    return invite;
  });
}

/**
 * Get all invites (admin only)
 */
export async function getAllInvites() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(invites).orderBy(invites.createdAt);
}

/**
 * Get pending invites
 */
export async function getPendingInvites() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(invites)
    .where(eq(invites.status, "pending"));
}

/**
 * Resend invite (generate new token, mark old as expired)
 */
export async function resendInvite(inviteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const invite = await db
    .select()
    .from(invites)
    .where(eq(invites.id, inviteId))
    .limit(1);

  if (!invite[0]) {
    throw new Error("Invite not found");
  }

  const oldInvite = invite[0];

  // Mark old invite as expired
  await db
    .update(invites)
    .set({ status: "expired" })
    .where(eq(invites.id, inviteId));

  // Create new invite
  return await createInvite(
    oldInvite.email,
    oldInvite.createdByUserId,
    oldInvite.role as any,
    7,
    true,
    (oldInvite as any).name || undefined
  );
}

/**
 * Revoke invite
 */
export async function revokeInvite(inviteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(invites)
    .set({ status: "expired" })
    .where(eq(invites.id, inviteId));
}

/**
 * Permanently delete an invite from the database
 */
export async function deleteInvite(inviteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(invites)
    .where(eq(invites.id, inviteId));
}

/**
 * Expire old pending invites (called periodically)
 */
export async function expireOldInvites() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  await db
    .update(invites)
    .set({ status: "expired" })
    .where(
      and(
        eq(invites.status, "pending"),
        lt(invites.expiresAt, now)
      )
    );
}


/**
 * Generate email verification token and send verification email
 */
export async function generateEmailVerificationToken(userId: number, email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { users } = await import("../drizzle/schema");
  const { sendEmailVerificationEmail } = await import("./email");

  const verificationToken = generateInviteToken(); // Reuse token generation

  // Update user with verification token
  await db
    .update(users)
    .set({ emailVerificationToken: verificationToken })
    .where(eq(users.id, userId));

  // Get user name for email
  const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userResult[0];

  // Send verification email
  const verificationLink = `${ENV.appUrl}/verify-email/${verificationToken}`;
  await sendEmailVerificationEmail({
    toEmail: email,
    verificationLink,
    athleteName: user?.name || "Athlete",
  });

  return verificationToken;
}

/**
 * Verify email with token
 */
export async function verifyEmailWithToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { users } = await import("../drizzle/schema");

  // Find user with verification token
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.emailVerificationToken, token))
    .limit(1);

  if (!userResult[0]) {
    throw new Error("Invalid verification token");
  }

  const user = userResult[0];

  // Mark email as verified
  await db
    .update(users)
    .set({ emailVerified: 1, emailVerificationToken: null })
    .where(eq(users.id, user.id));

  return user;
}

/**
 * Get invites expiring in 2 days that haven't had reminders sent
 */
export async function getExpiringInvites() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  return await db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.status, "pending"),
        lt(invites.expiresAt, twoDaysFromNow),
        gt(invites.expiresAt, now),
        eq(invites.reminderSent, 0)
      )
    );
}

/**
 * Mark invite reminder as sent
 */
export async function markReminderAsSent(inviteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(invites)
    .set({ reminderSent: 1 })
    .where(eq(invites.id, inviteId));
}

/**
 * Send expiration reminder for a specific invite
 */
export async function sendExpirationReminder(inviteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { sendInviteExpirationReminderEmail } = await import("./email");

  // Get invite
  const inviteResult = await db
    .select()
    .from(invites)
    .where(eq(invites.id, inviteId))
    .limit(1);

  if (!inviteResult[0]) {
    throw new Error("Invite not found");
  }

  const invite = inviteResult[0];
  const inviteUrl = `${ENV.appUrl}/accept-invite/${invite.inviteToken}`;

  // Send reminder email
  await sendInviteExpirationReminderEmail({
    toEmail: invite.email,
    athleteName: (invite as any).name || invite.email.split("@")[0], // Use name if available, otherwise email prefix
    inviteLink: inviteUrl,
    expiresAt: invite.expiresAt,
  });

  // Mark as sent
  await markReminderAsSent(inviteId);
}
