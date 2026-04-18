import { eq, and, desc } from "drizzle-orm";
import { drillFavorites, type InsertDrillFavorite } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Add a drill to user's favorites. drillId is a string to match the drill
 * catalog (static drill IDs like "belly-button-tee" and custom drill IDs).
 */
export async function addFavorite(userId: number, drillId: string): Promise<boolean> {
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

    if (existing.length > 0) return true;

    await db.insert(drillFavorites).values({ userId, drillId } satisfies InsertDrillFavorite);
    return true;
  } catch (error) {
    console.error("[Favorites] Failed to add favorite:", error);
    return false;
  }
}

export async function removeFavorite(userId: number, drillId: string): Promise<boolean> {
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
    return true;
  } catch (error) {
    console.error("[Favorites] Failed to remove favorite:", error);
    return false;
  }
}

export async function toggleFavorite(userId: number, drillId: string): Promise<{ isFavorited: boolean }> {
  const db = await getDb();
  if (!db) return { isFavorited: false };

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

    if (existing.length > 0) {
      await removeFavorite(userId, drillId);
      return { isFavorited: false };
    }
    await addFavorite(userId, drillId);
    return { isFavorited: true };
  } catch (error) {
    console.error("[Favorites] Failed to toggle favorite:", error);
    return { isFavorited: false };
  }
}

export async function getUserFavorites(userId: number): Promise<string[]> {
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

export async function isFavorited(userId: number, drillId: string): Promise<boolean> {
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
