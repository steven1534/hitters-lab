/**
 * Database layer — PostgreSQL via Drizzle ORM (Supabase)
 * Replaces MySQL/Manus database connection
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser, users, notifications, notificationPreferences,
  InsertNotificationPreference, invites, drillVideos, drillDetails,
  drillSubmissions, coachFeedback, customDrills,
  drillQuestions, drillAnswers, parentChildren,
  passwordResetRequests,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { eq, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ── YouTube URL normalizer (server-side) ──────────────────────────────────────
const YT_ID_RE = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/|e\/|watch\/|attribution_link\?(?:.*&)?u=(?:.*%3Fv%3D|.*\/watch%3Fv%3D)))([a-zA-Z0-9_-]{11})/i;
function normalizeVideoUrl(url: string): string {
  if (!url?.trim()) return url;
  // Already proper embed URL — return as-is
  if (url.includes('youtube.com/embed/') || url.includes('player.vimeo.com/video/')) {
    return url.split('?')[0];
  }
  // Decode percent-encoded attribution_link URLs
  let decoded = url;
  try { decoded = decodeURIComponent(url); } catch { /* keep original */ }
  // YouTube
  const ytMatch = decoded.match(YT_ID_RE);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  // Unknown — store as-is
  return url;
}

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function resetDb() {
  if (_client) {
    _client.end({ timeout: 2 }).catch(() => {});
  }
  _db = null;
  _client = null;
}

export async function getDb() {
  if (_db) {
    try {
      await Promise.race([
        _db.execute(sql`SELECT 1`),
        new Promise((_, reject) => setTimeout(() => reject(new Error("DB ping timeout")), 5000)),
      ]);
      return _db;
    } catch {
      console.warn("[Database] Stale connection detected, reconnecting...");
      resetDb();
    }
  }

  if (!process.env.DATABASE_URL) return null;

  try {
    _client = postgres(process.env.DATABASE_URL, {
      prepare: false,
      max: 5,
      idle_timeout: 0,
      connect_timeout: 8,
    });
    const db = drizzle(_client);
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error("DB connect timeout")), 8000)),
    ]);
    _db = db;
    console.log("[Database] Connected to Supabase");
  } catch (error) {
    console.warn("[Database] Failed to connect:", error);
    resetDb();
  }
  return _db;
}

// ── User Management ──────────────────────────────────────────

export async function createUser(user: {
  email: string;
  passwordHash?: string;
  name: string;
  role?: string;
  isActiveClient?: number;
  emailVerified?: number;
  loginMethod?: string;
  lastSignedIn?: Date;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("[Database] Database not available");

  const normalizedEmail = user.email.toLowerCase().trim();
  const isOwner = normalizedEmail === ENV.ownerEmail.toLowerCase();

  // Default password is player123 if none provided
  const passwordHash = user.passwordHash || await bcrypt.hash("player123", 12);

  const result = await db.insert(users).values({
    email: normalizedEmail,
    passwordHash,
    name: user.name,
    role: (isOwner ? "admin" : (user.role as any)) ?? "athlete",
    isActiveClient: isOwner ? 1 : (user.isActiveClient ?? 1),
    emailVerified: user.emailVerified ?? 1,
    loginMethod: user.loginMethod ?? "email",
    lastSignedIn: user.lastSignedIn ?? new Date(),
  }).returning({ id: users.id });

  return result[0].id;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return result[0] ?? undefined;
}

export async function getUserByOpenId(openId: string) {
  // This app uses email-based auth; treat openId as email for SDK compatibility
  return getUserByEmail(openId);
}

export async function upsertUser(user: {
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
}) {
  const db = await getDb();
  if (!db) return;
  const emailKey = (user.email || user.openId).toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, emailKey)).limit(1);
  if (existing[0]) {
    await db.update(users).set({
      name: user.name ?? existing[0].name,
      loginMethod: user.loginMethod ?? existing[0].loginMethod,
      lastSignedIn: user.lastSignedIn,
    }).where(eq(users.email, emailKey));
  } else {
    await db.insert(users).values({
      email: emailKey,
      name: user.name ?? "",
      passwordHash: "",
      loginMethod: user.loginMethod ?? "oauth",
      lastSignedIn: user.lastSignedIn,
      role: "athlete",
    });
  }
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0] ?? undefined;
}

export async function updateLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date(), updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users);
}

export async function toggleClientAccess(userId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(users).set({ isActiveClient: isActive ? 1 : 0, updatedAt: new Date() }).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to toggle client access:", error);
    return false;
  }
}

export async function convertUserToAthlete(userId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(users).set({ role: "athlete", updatedAt: new Date() }).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to convert user to athlete:", error);
    return false;
  }
}

export async function updateUserRole(userId: number, role: string) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(users).set({ role: role as any, updatedAt: new Date() }).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update user role:", error);
    return false;
  }
}

export async function markWelcomeEmailSent(userId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(users).set({ sentWelcomeEmail: 1, updatedAt: new Date() }).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to mark welcome email sent:", error);
    return false;
  }
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update password:", error);
    return false;
  }
}

export async function updateUserInfo(userId: number, info: { name?: string; email?: string }) {
  const db = await getDb();
  if (!db) return false;
  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (info.name !== undefined) updates.name = info.name;
    if (info.email !== undefined) updates.email = info.email.toLowerCase().trim();
    await db.update(users).set(updates).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update user info:", error);
    return false;
  }
}

// ── Password Reset Requests ──────────────────────────────────

export async function createPasswordResetRequest(email: string) {
  const db = await getDb();
  if (!db) return null;
  const normalizedEmail = email.toLowerCase().trim();
  const user = await getUserByEmail(normalizedEmail);
  if (!user) return null;
  try {
    const result = await db.insert(passwordResetRequests).values({
      userId: user.id,
      email: normalizedEmail,
    }).returning({ id: passwordResetRequests.id });
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to create password reset request:", error);
    return null;
  }
}

export async function getPasswordResetRequests() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(passwordResetRequests)
    .where(eq(passwordResetRequests.status, "pending"))
    .orderBy(desc(passwordResetRequests.createdAt));
}

export async function updateResetRequestStatus(requestId: number, status: "completed" | "dismissed") {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(passwordResetRequests).set({ status }).where(eq(passwordResetRequests.id, requestId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update reset request status:", error);
    return false;
  }
}

// ── Invites ──────────────────────────────────────────────────

export async function getInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(invites).where(eq(invites.inviteToken, token)).limit(1);
  return result[0] ?? null;
}

export async function acceptInvite(inviteId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(invites).set({
      status: "accepted",
      acceptedAt: new Date(),
      acceptedByUserId: userId || null,
    }).where(eq(invites.id, inviteId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to accept invite:", error);
    return false;
  }
}

// ── Drill Videos ──────────────────────────────────────────────

export async function saveOrUpdateDrillVideo(drillId: string, videoUrl: string, userId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    const normalizedUrl = normalizeVideoUrl(videoUrl);
    const existing = await db.select().from(drillVideos).where(eq(drillVideos.drillId, drillId)).limit(1);
    if (existing.length > 0) {
      await db.update(drillVideos).set({ videoUrl: normalizedUrl, updatedAt: new Date() }).where(eq(drillVideos.drillId, drillId));
    } else {
      await db.insert(drillVideos).values({ drillId, videoUrl: normalizedUrl, uploadedBy: userId });
    }
    return true;
  } catch (error) {
    console.error("[Database] Failed to save drill video:", error);
    return false;
  }
}

export async function getDrillVideo(drillId: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(drillVideos).where(eq(drillVideos.drillId, drillId)).limit(1);
    return result[0] ?? null;
  } catch (error) {
    console.error("[Database] Failed to get drill video:", error);
    return null;
  }
}

export async function getAllDrillVideos() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(drillVideos);
  } catch (error) {
    console.error("[Database] Failed to get drill videos:", error);
    return [];
  }
}

export async function deleteDrillVideo(drillId: string) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(drillVideos).where(eq(drillVideos.drillId, drillId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete drill video:", error);
    return false;
  }
}

// ── Drill Details ──────────────────────────────────────────────

export async function saveDrillDetail(drillId: string, detail: {
  skillSet?: string; difficulty?: string; athletes?: string;
  time?: string; equipment?: string; goal?: string;
  description?: string[]; commonMistakes?: string[];
  progressions?: string[]; instructions?: string;
}, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    const existing = await db.select().from(drillDetails).where(eq(drillDetails.drillId, drillId));
    if (existing.length > 0) {
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (detail.skillSet !== undefined) updateData.skillSet = detail.skillSet;
      if (detail.difficulty !== undefined) updateData.difficulty = detail.difficulty;
      if (detail.athletes !== undefined) updateData.athletes = detail.athletes;
      if (detail.time !== undefined) updateData.time = detail.time;
      if (detail.equipment !== undefined) updateData.equipment = detail.equipment;
      if (detail.goal !== undefined) updateData.goal = detail.goal;
      if (detail.description !== undefined) updateData.description = detail.description;
      if (detail.commonMistakes !== undefined) updateData.commonMistakes = detail.commonMistakes;
      if (detail.progressions !== undefined) updateData.progressions = detail.progressions;
      if (detail.instructions !== undefined) updateData.instructions = detail.instructions;
      await db.update(drillDetails).set(updateData).where(eq(drillDetails.drillId, drillId));
    } else {
      await db.insert(drillDetails).values({
        drillId,
        skillSet: detail.skillSet || "Custom",
        difficulty: detail.difficulty || "Medium",
        athletes: detail.athletes || "Varies",
        time: detail.time || "Varies",
        equipment: detail.equipment || "Varies",
        goal: detail.goal || "",
        description: detail.description || [],
        commonMistakes: detail.commonMistakes || null,
        progressions: detail.progressions || null,
        instructions: detail.instructions || null,
        createdBy: userId,
      });
    }
    return true;
  } catch (error) {
    console.error("[Database] Failed to save drill detail:", error);
    return false;
  }
}

export async function getDrillDetail(drillId: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(drillDetails).where(eq(drillDetails.drillId, drillId));
    if (result[0]) return result[0];

    // Auto-seed from customDrills if no detail record exists yet
    const custom = await db.select().from(customDrills).where(eq(customDrills.drillId, drillId));
    if (custom[0]) {
      const cd = custom[0];
      const [inserted] = await db.insert(drillDetails).values({
        drillId: cd.drillId,
        skillSet: cd.category,
        difficulty: cd.difficulty,
        athletes: 'All Ages',
        time: cd.duration,
        equipment: 'Bat, Tee (optional)',
        goal: 'Improve mechanics and develop consistent habits through focused repetition.',
        description: [cd.name + ' — click Edit to add a description.'],
        commonMistakes: [],
        progressions: [],
        createdBy: cd.createdBy,
      }).returning();
      return inserted ?? null;
    }

    return null;
  } catch (error) {
    console.error("[Database] Failed to get drill detail:", error);
    return null;
  }
}

export async function deleteDrillDetail(drillId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(drillDetails).where(eq(drillDetails.drillId, drillId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete drill detail:", error);
    return false;
  }
}

export async function saveDrillInstructions(drillId: string, instructions: string, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    const existing = await db.select().from(drillDetails).where(eq(drillDetails.drillId, drillId));
    if (existing.length > 0) {
      await db.update(drillDetails).set({ instructions, updatedAt: new Date() }).where(eq(drillDetails.drillId, drillId));
    } else {
      await db.insert(drillDetails).values({
        drillId, instructions, description: [],
        skillSet: "Custom", difficulty: "Medium", athletes: "Varies",
        time: "Varies", equipment: "Varies", goal: "Custom Drill", createdBy: userId,
      });
    }
    return true;
  } catch (error) {
    console.error("[Database] Failed to save drill instructions:", error);
    return false;
  }
}

export async function saveDrillGoal(drillId: string, goal: string, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    const existing = await db.select().from(drillDetails).where(eq(drillDetails.drillId, drillId));
    if (existing.length > 0) {
      await db.update(drillDetails).set({ goal, updatedAt: new Date() }).where(eq(drillDetails.drillId, drillId));
    } else {
      await db.insert(drillDetails).values({
        drillId, goal, description: [],
        skillSet: "Custom", difficulty: "Medium", athletes: "Varies",
        time: "Varies", equipment: "Varies", createdBy: userId,
      });
    }
    return true;
  } catch (error) {
    console.error("[Database] Failed to save drill goal:", error);
    return false;
  }
}

// ── Drill Submissions & Feedback ──────────────────────────────

export async function createDrillSubmission(submission: typeof drillSubmissions.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(drillSubmissions).values(submission).returning({ id: drillSubmissions.id });
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to create drill submission:", error);
    throw error;
  }
}

export async function getSubmissionsByAssignment(assignmentId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(drillSubmissions).where(eq(drillSubmissions.assignmentId, assignmentId));
  } catch (error) {
    console.error("[Database] Failed to get submissions:", error);
    return [];
  }
}

export async function getSubmissionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(drillSubmissions).where(eq(drillSubmissions.userId, userId));
  } catch (error) {
    console.error("[Database] Failed to get user submissions:", error);
    return [];
  }
}

export async function createCoachFeedback(feedback: typeof coachFeedback.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(coachFeedback).values(feedback).returning({ id: coachFeedback.id });
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to create coach feedback:", error);
    throw error;
  }
}

export async function getFeedbackBySubmission(submissionId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(coachFeedback).where(eq(coachFeedback.submissionId, submissionId));
  } catch (error) {
    console.error("[Database] Failed to get feedback:", error);
    return [];
  }
}

export async function getFeedbackByDrill(drillId: string, userId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(coachFeedback)
      .where(and(eq(coachFeedback.drillId, drillId), eq(coachFeedback.userId, userId)));
  } catch (error) {
    console.error("[Database] Failed to get drill feedback:", error);
    return [];
  }
}

// ── Notifications ──────────────────────────────────────────────

export async function createNotification(data: {
  userId: number;
  type: "submission" | "feedback" | "badge" | "assignment" | "system";
  title: string;
  message: string;
  relatedId?: number;
  relatedType?: string;
  actionUrl?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(notifications).values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedId: data.relatedId ?? null,
      relatedType: data.relatedType ?? null,
      actionUrl: data.actionUrl ?? null,
      isRead: 0,
    }).returning({ id: notifications.id });
    return result[0];
  } catch (error) {
    console.error("[DB] Error creating notification:", error);
    return null;
  }
}

export async function getNotificationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  } catch (error) {
    console.error("[DB] Error fetching notifications:", error);
    return [];
  }
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  try {
    const result = await db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
    return result.length;
  } catch (error) {
    return 0;
  }
}

export async function markNotificationRead(notificationId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(notifications).set({ isRead: 1, readAt: new Date() }).where(eq(notifications.id, notificationId));
    return true;
  } catch (error) {
    return false;
  }
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(notifications).set({ isRead: 1, readAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
    return true;
  } catch (error) {
    return false;
  }
}

export async function getNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
    return result[0] ?? null;
  } catch (error) {
    return null;
  }
}

export async function upsertNotificationPreferences(userId: number, prefs: Partial<InsertNotificationPreference>) {
  const db = await getDb();
  if (!db) return false;
  try {
    const existing = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
    if (existing.length > 0) {
      await db.update(notificationPreferences).set({ ...prefs, updatedAt: new Date() }).where(eq(notificationPreferences.userId, userId));
    } else {
      await db.insert(notificationPreferences).values({ userId, ...prefs });
    }
    return true;
  } catch (error) {
    return false;
  }
}

export async function createNewDrill(
  input: {
    name: string; difficulty: string; category: string; duration: string;
    goal?: string; instructions?: string; videoUrl?: string;
    purpose?: string; bestFor?: string; equipment?: string; athletes?: string;
    description?: string[]; drillType?: string; drillTypeRaw?: string; skillSet?: string;
    ageLevel?: string[]; tags?: string[]; problem?: string[]; goalTags?: string[];
    whatThisFixes?: string[]; whatToFeel?: string[]; commonMistakes?: string[];
    coachCue?: string; watchFor?: string; nextSteps?: string[];
  },
  createdBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const drillId = input.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 80)
    + "-" + Date.now();

  const [created] = await db.insert(customDrills).values({
    drillId,
    name: input.name,
    difficulty: input.difficulty,
    category: input.category,
    duration: input.duration,
    purpose: input.purpose || null,
    bestFor: input.bestFor || null,
    equipment: input.equipment || null,
    athletes: input.athletes || null,
    description: input.description?.length ? input.description : null,
    videoUrl: input.videoUrl || null,
    drillType: input.drillType || "Tee Work",
    drillTypeRaw: input.drillTypeRaw || null,
    skillSet: input.skillSet || "Hitting",
    ageLevel: input.ageLevel?.length ? input.ageLevel : null,
    tags: input.tags?.length ? input.tags : null,
    problem: input.problem?.length ? input.problem : null,
    goalTags: input.goalTags?.length ? input.goalTags : null,
    whatThisFixes: input.whatThisFixes?.length ? input.whatThisFixes : null,
    whatToFeel: input.whatToFeel?.length ? input.whatToFeel : null,
    commonMistakes: input.commonMistakes?.length ? input.commonMistakes : null,
    coachCue: input.coachCue || null,
    watchFor: input.watchFor || null,
    nextSteps: input.nextSteps?.length ? input.nextSteps : null,
    createdBy,
  }).returning();

  // If a video URL was provided, save it to drillVideos
  if (input.videoUrl) {
    await db.insert(drillVideos).values({
      drillId,
      videoUrl: input.videoUrl,
      uploadedBy: createdBy,
    }).onConflictDoUpdate({
      target: drillVideos.drillId,
      set: { videoUrl: input.videoUrl },
    });
  }

  return created;
}

export async function getCustomDrills() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(customDrills).orderBy(customDrills.name);
  } catch {
    return [];
  }
}

export async function deleteNotification(notificationId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(notifications).where(eq(notifications.id, notificationId));
    return true;
  } catch (error) {
    return false;
  }
}

export async function createOrUpdateNotificationPreferences(userId: number, prefs: Partial<InsertNotificationPreference>) {
  return upsertNotificationPreferences(userId, prefs);
}

export async function updateDrillSubmission(submissionId: number, data: { notes?: string; videoUrl?: string }) {
  const db = await getDb();
  if (!db) return false;
  try {
    const updateData: Record<string, any> = {};
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;
    await db.update(drillSubmissions).set(updateData).where(eq(drillSubmissions.id, submissionId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update drill submission:", error);
    return false;
  }
}

export async function deleteDrillSubmission(submissionId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(drillSubmissions).where(eq(drillSubmissions.id, submissionId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete drill submission:", error);
    return false;
  }
}

export async function updateCoachFeedback(feedbackId: number, feedbackText: string) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(coachFeedback).set({ feedback: feedbackText }).where(eq(coachFeedback.id, feedbackId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update coach feedback:", error);
    return false;
  }
}

export async function deleteCoachFeedback(feedbackId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(coachFeedback).where(eq(coachFeedback.id, feedbackId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete coach feedback:", error);
    return false;
  }
}

export async function bulkImportDrillDescriptions(drillsData: { drillName: string; description: string }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const item of drillsData) {
    try {
      const existing = await db.select().from(drillDetails).where(eq(drillDetails.drillId, item.drillName));
      if (existing.length > 0) {
        await db.update(drillDetails).set({ description: [item.description], updatedAt: new Date() }).where(eq(drillDetails.drillId, item.drillName));
      } else {
        await db.insert(drillDetails).values({
          drillId: item.drillName,
          description: [item.description],
          skillSet: "Custom", difficulty: "Medium", athletes: "Varies",
          time: "Varies", equipment: "Varies", goal: "",
          createdBy: 0,
        });
      }
      imported++;
    } catch (e: any) {
      skipped++;
      errors.push(`${item.drillName}: ${e.message}`);
    }
  }
  return { imported, skipped, errors };
}

export async function bulkImportDrillGoals(goalsData: { drillName: string; goal: string }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const item of goalsData) {
    try {
      const existing = await db.select().from(drillDetails).where(eq(drillDetails.drillId, item.drillName));
      if (existing.length > 0) {
        await db.update(drillDetails).set({ goal: item.goal, updatedAt: new Date() }).where(eq(drillDetails.drillId, item.drillName));
      } else {
        await db.insert(drillDetails).values({
          drillId: item.drillName,
          goal: item.goal,
          description: [],
          skillSet: "Custom", difficulty: "Medium", athletes: "Varies",
          time: "Varies", equipment: "Varies",
          createdBy: 0,
        });
      }
      imported++;
    } catch (e: any) {
      skipped++;
      errors.push(`${item.drillName}: ${e.message}`);
    }
  }
  return { imported, skipped, errors };
}

export async function updateDrillGoal(drillId: string, goal: string, userId: number = 0): Promise<boolean> {
  return saveDrillGoal(drillId, goal, userId);
}

export async function updateDrillInstructions(drillId: string, instructions: string, userId: number = 0): Promise<boolean> {
  return saveDrillInstructions(drillId, instructions, userId);
}

export async function linkChildToParent(childUserId: number, parentUserId: number): Promise<boolean> {
  // Stub: parent-child linking not yet implemented in schema
  console.warn("[Database] linkChildToParent not yet implemented");
  return false;
}

export async function getChildrenByParent(parentUserId: number): Promise<any[]> {
  // Stub: parent-child lookup not yet implemented in schema
  console.warn("[Database] getChildrenByParent not yet implemented");
  return [];
}

export async function isParentOf(parentUserId: number, childUserId: number): Promise<boolean> {
  // Stub: parent-child relationship not yet implemented in schema
  console.warn("[Database] isParentOf not yet implemented");
  return false;
}

// ── Q&A ──────────────────────────────────────────────────────

export async function createDrillQuestion(data: { athleteId: number; drillId: string; question: string }) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(drillQuestions).values(data).returning({ id: drillQuestions.id });
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to create drill question:", error);
    throw error;
  }
}

export async function getDrillQuestions(drillId: string) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(drillQuestions).where(eq(drillQuestions.drillId, drillId));
  } catch (error) {
    return [];
  }
}

export async function getAthleteQuestions(athleteId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(drillQuestions).where(eq(drillQuestions.athleteId, athleteId));
  } catch (error) {
    return [];
  }
}

export async function getAllQuestions() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(drillQuestions);
  } catch (error) {
    return [];
  }
}

export async function createDrillAnswer(data: { questionId: number; coachId: number; answer: string }) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(drillAnswers).values(data).returning({ id: drillAnswers.id });
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to create drill answer:", error);
    throw error;
  }
}

export async function getAnswersByQuestion(questionId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(drillAnswers).where(eq(drillAnswers.questionId, questionId));
  } catch (error) {
    return [];
  }
}

export async function bulkImportCustomDrills(
  drills: { drillId: string; name: string; difficulty: string; category: string; duration: string; videoUrl?: string }[],
  createdBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const drill of drills) {
    try {
      await db.insert(customDrills).values({
        drillId: drill.drillId,
        name: drill.name,
        difficulty: drill.difficulty,
        category: drill.category,
        duration: drill.duration,
        createdBy,
      }).onConflictDoUpdate({
        target: customDrills.drillId,
        set: {
          name: drill.name,
          difficulty: drill.difficulty,
          category: drill.category,
          duration: drill.duration,
        }
      });

      // Save video URL if provided
      if (drill.videoUrl?.trim()) {
        await saveOrUpdateDrillVideo(drill.drillId, drill.videoUrl.trim(), createdBy);
      }

      imported++;
    } catch (e: any) {
      skipped++;
      errors.push(`${drill.name}: ${e.message}`);
    }
  }

  return { imported, skipped, errors };
}

// ── Notification aliases ──────────────────────────────────────────────────────

export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)))
      .orderBy(desc(notifications.createdAt));
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(notificationId: number) {
  return markNotificationRead(notificationId);
}

