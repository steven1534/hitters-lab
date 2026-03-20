import { getDb } from "./db";
import { athleteProfiles, InsertAthleteProfile, AthleteProfile, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Get an athlete's profile by userId
 */
export async function getProfileByUserId(userId: number): Promise<AthleteProfile | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(athleteProfiles)
    .where(eq(athleteProfiles.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Get an athlete's profile with their user record (name, email, etc.)
 */
export async function getProfileWithUser(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select({
      profile: athleteProfiles,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
      isActiveClient: users.isActiveClient,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .leftJoin(athleteProfiles, eq(athleteProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    userId,
    userName: row.userName,
    userEmail: row.userEmail,
    userRole: row.userRole,
    isActiveClient: row.isActiveClient,
    createdAt: row.createdAt,
    lastSignedIn: row.lastSignedIn,
    // Profile fields (may be null if no profile row exists)
    birthDate: row.profile?.birthDate ?? null,
    position: row.profile?.position ?? null,
    secondaryPosition: row.profile?.secondaryPosition ?? null,
    bats: row.profile?.bats ?? null,
    throws: row.profile?.throws ?? null,
    teamName: row.profile?.teamName ?? null,
    focusAreas: (row.profile?.focusAreas as string[]) ?? [],
    parentName: row.profile?.parentName ?? null,
    parentEmail: row.profile?.parentEmail ?? null,
    parentPhone: row.profile?.parentPhone ?? null,
    coachProfileNotes: row.profile?.coachProfileNotes ?? null,
  };
}

/**
 * Create or update an athlete's profile (upsert)
 */
export async function upsertProfile(
  userId: number,
  data: Partial<Omit<InsertAthleteProfile, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<AthleteProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if profile exists
  const existing = await db
    .select()
    .from(athleteProfiles)
    .where(eq(athleteProfiles.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db
      .update(athleteProfiles)
      .set(data)
      .where(eq(athleteProfiles.userId, userId));

    const updated = await db
      .select()
      .from(athleteProfiles)
      .where(eq(athleteProfiles.userId, userId))
      .limit(1);
    return updated[0];
  } else {
    // Insert new
    await db.insert(athleteProfiles).values({
      userId,
      ...data,
    });

    const created = await db
      .select()
      .from(athleteProfiles)
      .where(eq(athleteProfiles.userId, userId))
      .limit(1);
    return created[0];
  }
}

/**
 * Get profiles for multiple athletes (for overview/list views)
 */
export async function getProfilesForAthletes(userIds: number[]) {
  const db = await getDb();
  if (!db) return [];
  if (userIds.length === 0) return [];

  const { inArray } = await import("drizzle-orm");

  const rows = await db
    .select({
      profile: athleteProfiles,
      userName: users.name,
      userEmail: users.email,
    })
    .from(users)
    .leftJoin(athleteProfiles, eq(athleteProfiles.userId, users.id))
    .where(inArray(users.id, userIds));

  return rows.map((row) => ({
    userId: row.profile?.userId ?? 0,
    userName: row.userName,
    userEmail: row.userEmail,
    position: row.profile?.position ?? null,
    birthDate: row.profile?.birthDate ?? null,
    parentName: row.profile?.parentName ?? null,
    parentEmail: row.profile?.parentEmail ?? null,
    parentPhone: row.profile?.parentPhone ?? null,
    teamName: row.profile?.teamName ?? null,
  }));
}

/**
 * Get parent email for an athlete (used by progress reports)
 */
export async function getParentEmail(userId: number): Promise<string | null> {
  const profile = await getProfileByUserId(userId);
  return profile?.parentEmail ?? null;
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
