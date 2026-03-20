import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq, and } from "drizzle-orm";
import { drillFavorites, users } from "../drizzle/schema";
import { getDb } from "./db";
import {
  addFavorite,
  removeFavorite,
  toggleFavorite,
  getUserFavorites,
  isFavorited,
  getFavoriteCount,
} from "./drillFavorites";

describe("Drill Favorites", () => {
  let testUserId: number;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test user
    const userResult = await db.insert(users).values({
      openId: `test-favorites-user-${Date.now()}`,
      name: "Test Favorites User",
      email: "testfavorites@example.com",
      role: "athlete",
      isActiveClient: 1,
    });
    testUserId = userResult[0].insertId;
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    if (testUserId) {
      await db.delete(drillFavorites).where(eq(drillFavorites.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it("should add a drill to favorites", async () => {
    const drillId = 1;
    const result = await addFavorite(testUserId, drillId);

    expect(result).toBe(true);

    // Verify it was added
    const favorites = await getUserFavorites(testUserId);
    expect(favorites).toContain(drillId);
  });

  it("should not duplicate favorites when adding same drill twice", async () => {
    const drillId = 2;
    
    await addFavorite(testUserId, drillId);
    await addFavorite(testUserId, drillId);

    const favorites = await getUserFavorites(testUserId);
    const count = favorites.filter(id => id === drillId).length;
    expect(count).toBe(1);
  });

  it("should remove a drill from favorites", async () => {
    const drillId = 3;
    
    await addFavorite(testUserId, drillId);
    expect(await isFavorited(testUserId, drillId)).toBe(true);

    await removeFavorite(testUserId, drillId);
    expect(await isFavorited(testUserId, drillId)).toBe(false);
  });

  it("should toggle favorite status", async () => {
    const drillId = 4;

    // First toggle: should add
    const result1 = await toggleFavorite(testUserId, drillId);
    expect(result1.isFavorited).toBe(true);
    expect(await isFavorited(testUserId, drillId)).toBe(true);

    // Second toggle: should remove
    const result2 = await toggleFavorite(testUserId, drillId);
    expect(result2.isFavorited).toBe(false);
    expect(await isFavorited(testUserId, drillId)).toBe(false);
  });

  it("should get all favorites for a user", async () => {
    const drillIds = [5, 6, 7];
    
    for (const drillId of drillIds) {
      await addFavorite(testUserId, drillId);
    }

    const favorites = await getUserFavorites(testUserId);
    expect(favorites.length).toBe(3);
    for (const drillId of drillIds) {
      expect(favorites).toContain(drillId);
    }
  });

  it("should check if a drill is favorited", async () => {
    const drillId = 8;

    expect(await isFavorited(testUserId, drillId)).toBe(false);
    
    await addFavorite(testUserId, drillId);
    expect(await isFavorited(testUserId, drillId)).toBe(true);
  });

  it("should get favorite count for a user", async () => {
    expect(await getFavoriteCount(testUserId)).toBe(0);

    await addFavorite(testUserId, 9);
    await addFavorite(testUserId, 10);
    await addFavorite(testUserId, 11);

    expect(await getFavoriteCount(testUserId)).toBe(3);
  });
});
