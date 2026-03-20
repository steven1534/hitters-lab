import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "drill_preview_views";
const MAX_FREE_PREVIEWS = 2;

export interface PreviewLimitState {
  /** Drill slugs the visitor has already viewed */
  viewedSlugs: string[];
  /** How many free views remain */
  remaining: number;
  /** Whether the visitor has hit the wall */
  isLimitReached: boolean;
  /** Record a new drill view (no-op if already seen) */
  recordView: (slug: string) => void;
  /** Check if a specific slug has already been viewed */
  hasViewed: (slug: string) => boolean;
}

function getStoredSlugs(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storeSlugs(slugs: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // localStorage might be full or disabled — fail silently
  }
}

/**
 * Tracks how many unique drill detail pages an unauthenticated visitor
 * has opened. After MAX_FREE_PREVIEWS unique drills, `isLimitReached`
 * flips to true and the UI should show a signup wall.
 *
 * Revisiting an already-viewed drill does NOT count as a new view.
 */
export function usePreviewLimit(): PreviewLimitState {
  const [viewedSlugs, setViewedSlugs] = useState<string[]>(getStoredSlugs);

  // Sync from localStorage on mount (handles multiple tabs)
  useEffect(() => {
    setViewedSlugs(getStoredSlugs());
  }, []);

  const recordView = useCallback((slug: string) => {
    setViewedSlugs((prev) => {
      if (prev.includes(slug)) return prev;
      const next = [...prev, slug];
      storeSlugs(next);
      return next;
    });
  }, []);

  const hasViewed = useCallback(
    (slug: string) => viewedSlugs.includes(slug),
    [viewedSlugs]
  );

  const remaining = Math.max(0, MAX_FREE_PREVIEWS - viewedSlugs.length);
  const isLimitReached = viewedSlugs.length >= MAX_FREE_PREVIEWS;

  return { viewedSlugs, remaining, isLimitReached, recordView, hasViewed };
}

export { MAX_FREE_PREVIEWS };
