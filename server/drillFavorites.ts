import { eq, and, desc } from "drizzle-orm";
import { drillFavorites, InsertDrillFavorite } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Add a drill to user's favorites
 */
export async function addFavorite(userId: number, drillId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Check if already favorited
    const existing = await db.select()
      .from(drillFavorites)
      .where(
        and(
          eq(drillFavorites.userId, userId),
          eq(drillFavorites.drillId, drillId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Already favorited
      return true;
    }

    // Add to favorites
    await db.insert(drillFavorites).values({
      userId,
      drillId,
    });

    console.log(`[Favorites] User ${userId} favorited drill ${drillId}`);
    return true;
  } catch (error) {
    console.error("[Favorites] Failed to add favorite:", error);
    return false;
  }
}

/**
 * Remove a drill from user's favorites
 */
export async function removeFavorite(userId: number, drillId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(drillFavorites)
      .where(
        and(
          eq(drillFavorites.userId, userId),
          eq(drillFavorites.drillId, drillId)
        )
      );

    console.log(`[Favorites] User ${userId} unfavorited drill ${drillId}`);
    return true;
  } catch (error) {
    console.error("[Favorites] Failed to remove favorite:", error);
    return false;
  }
}

/**
 * Toggle favorite status for a drill
 */
export async function toggleFavorite(userId: number, drillId: number): Promise<{ isFavorited: boolean }> {
  const db = await getDb();
  if (!db) return { isFavorited: false };

  try {
    // Check if already favorited
    const existing = await db.select()
      .from(drillFavorites)
      .where(
        and(
          eq(drillFavorites.userId, userId),
          eq(drillFavorites.drillId, drillId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Remove from favorites
      await removeFavorite(userId, drillId);
      return { isFavorited: false };
    } else {
      // Add to favorites
      await addFavorite(userId, drillId);
      return { isFavorited: true };
    }
  } catch (error) {
    console.error("[Favorites] Failed to toggle favorite:", error);
    return { isFavorited: false };
  }
}

/**
 * Get all favorite drill IDs for a user
 */
export async function getUserFavorites(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const favorites = await db.select()
      .from(drillFavorites)
      .where(eq(drillFavorites.userId, userId))
      .orderBy(desc(drillFavorites.createdAt));

    return favorites.map(f => f.drillId);
  } catch (error) {
    console.error("[Favorites] Failed to get user favorites:", error);
    return [];
  }
}

/**
 * Check if a specific drill is favorited by user
 */
export async function isFavorited(userId: number, drillId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const existing = await db.select()
      .from(drillFavorites)
      .where(
        and(
          eq(drillFavorites.userId, userId),
          eq(drillFavorites.drillId, drillId)
        )
      )
      .limit(1);

    return existing.length > 0;
  } catch (error) {
    console.error("[Favorites] Failed to check favorite status:", error);
    return false;
  }
}

/**
 * Get favorite count for a user
 */
export async function getFavoriteCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const favorites = await db.select()
      .from(drillFavorites)
      .where(eq(drillFavorites.userId, userId));

    return favorites.length;
  } catch (error) {
    console.error("[Favorites] Failed to get favorite count:", error);
    return 0;
  }
}
