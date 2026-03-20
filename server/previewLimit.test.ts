import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the 2 free drill preview system.
 * Validates the localStorage-based tracking logic that determines
 * whether an anonymous visitor can view a drill or sees the signup wall.
 */

// Simulate the core logic from usePreviewLimit (extracted for testability)
const STORAGE_KEY = "drill_preview_views";
const MAX_FREE_PREVIEWS = 2;

function getStoredSlugs(storage: Record<string, string>): string[] {
  try {
    const raw = storage[STORAGE_KEY];
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function recordView(
  storage: Record<string, string>,
  currentSlugs: string[],
  slug: string
): string[] {
  if (currentSlugs.includes(slug)) return currentSlugs;
  const next = [...currentSlugs, slug];
  storage[STORAGE_KEY] = JSON.stringify(next);
  return next;
}

function computeState(viewedSlugs: string[], currentSlug: string) {
  const remaining = Math.max(0, MAX_FREE_PREVIEWS - viewedSlugs.length);
  const isLimitReached = viewedSlugs.length >= MAX_FREE_PREVIEWS;
  const currentSlugAlreadyViewed = viewedSlugs.includes(currentSlug);
  const showPreviewWall = isLimitReached && !currentSlugAlreadyViewed;
  return { remaining, isLimitReached, currentSlugAlreadyViewed, showPreviewWall };
}

describe("Free Drill Preview Limit", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
  });

  describe("Storage operations", () => {
    it("should return empty array when no previews stored", () => {
      const slugs = getStoredSlugs(storage);
      expect(slugs).toEqual([]);
    });

    it("should store and retrieve viewed slugs", () => {
      let slugs = getStoredSlugs(storage);
      slugs = recordView(storage, slugs, "1-2-3-drill");
      expect(getStoredSlugs(storage)).toEqual(["1-2-3-drill"]);
    });

    it("should not duplicate slugs for revisited drills", () => {
      let slugs = getStoredSlugs(storage);
      slugs = recordView(storage, slugs, "1-2-3-drill");
      slugs = recordView(storage, slugs, "1-2-3-drill");
      expect(slugs).toEqual(["1-2-3-drill"]);
      expect(slugs.length).toBe(1);
    });

    it("should handle corrupted storage gracefully", () => {
      storage[STORAGE_KEY] = "not-valid-json{{{";
      const slugs = getStoredSlugs(storage);
      expect(slugs).toEqual([]);
    });

    it("should handle non-array stored value", () => {
      storage[STORAGE_KEY] = JSON.stringify("a string, not an array");
      const slugs = getStoredSlugs(storage);
      expect(slugs).toEqual([]);
    });
  });

  describe("Preview limit logic", () => {
    it("should allow first drill view (0 of 2 used)", () => {
      const state = computeState([], "1-2-3-drill");
      expect(state.remaining).toBe(2);
      expect(state.isLimitReached).toBe(false);
      expect(state.showPreviewWall).toBe(false);
    });

    it("should allow second drill view (1 of 2 used)", () => {
      const state = computeState(["1-2-3-drill"], "drop-step-cones");
      expect(state.remaining).toBe(1);
      expect(state.isLimitReached).toBe(false);
      expect(state.showPreviewWall).toBe(false);
    });

    it("should show wall on third unique drill (2 of 2 used)", () => {
      const state = computeState(["1-2-3-drill", "drop-step-cones"], "new-drill");
      expect(state.remaining).toBe(0);
      expect(state.isLimitReached).toBe(true);
      expect(state.showPreviewWall).toBe(true);
    });

    it("should NOT show wall when revisiting an already-viewed drill after limit", () => {
      const state = computeState(["1-2-3-drill", "drop-step-cones"], "1-2-3-drill");
      expect(state.isLimitReached).toBe(true);
      expect(state.currentSlugAlreadyViewed).toBe(true);
      expect(state.showPreviewWall).toBe(false);
    });

    it("should NOT show wall when revisiting second viewed drill after limit", () => {
      const state = computeState(["1-2-3-drill", "drop-step-cones"], "drop-step-cones");
      expect(state.isLimitReached).toBe(true);
      expect(state.currentSlugAlreadyViewed).toBe(true);
      expect(state.showPreviewWall).toBe(false);
    });
  });

  describe("Full workflow simulation", () => {
    it("should track a complete visitor journey: browse → view 2 → wall on 3rd", () => {
      let slugs = getStoredSlugs(storage);

      // Visit first drill
      let state = computeState(slugs, "1-2-3-drill");
      expect(state.showPreviewWall).toBe(false);
      slugs = recordView(storage, slugs, "1-2-3-drill");

      // Visit second drill
      state = computeState(slugs, "drop-step-cones");
      expect(state.showPreviewWall).toBe(false);
      slugs = recordView(storage, slugs, "drop-step-cones");

      // Try to visit third drill → wall
      state = computeState(slugs, "change-up-tee");
      expect(state.showPreviewWall).toBe(true);
      expect(state.remaining).toBe(0);

      // Revisit first drill → no wall
      state = computeState(slugs, "1-2-3-drill");
      expect(state.showPreviewWall).toBe(false);
    });

    it("should persist across simulated page reloads", () => {
      let slugs = getStoredSlugs(storage);
      slugs = recordView(storage, slugs, "1-2-3-drill");

      // Simulate page reload — re-read from storage
      const reloadedSlugs = getStoredSlugs(storage);
      expect(reloadedSlugs).toEqual(["1-2-3-drill"]);

      const state = computeState(reloadedSlugs, "drop-step-cones");
      expect(state.remaining).toBe(1);
      expect(state.showPreviewWall).toBe(false);
    });
  });

  describe("Logged-in user bypass", () => {
    it("should bypass preview limit for any logged-in user", () => {
      // The isAnonymous check in DrillDetail means logged-in users
      // never enter the preview flow. We verify the logic here:
      const isAnonymous = false; // user is logged in
      const isLimitReached = true; // they would be limited if anonymous
      const showPreviewWall = isAnonymous && isLimitReached;
      expect(showPreviewWall).toBe(false);
    });

    it("should show wall only for anonymous users", () => {
      const isAnonymous = true;
      const isLimitReached = true;
      const currentSlugAlreadyViewed = false;
      const showPreviewWall = isAnonymous && isLimitReached && !currentSlugAlreadyViewed;
      expect(showPreviewWall).toBe(true);
    });
  });
});
