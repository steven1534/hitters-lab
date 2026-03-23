import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "drill_preview_count";
export const MAX_FREE_PREVIEWS = 2; // user gets 2 free views; 3rd view triggers login prompt

function getStoredCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
}

function storeCount(n: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    // fail silently
  }
}

export interface PreviewLimitState {
  /** Total drill views recorded so far */
  viewCount: number;
  /** Whether this visitor has already used their one free view */
  isLimitReached: boolean;
  /** Increment the view counter — call once per drill page load */
  recordView: () => void;
}

export function usePreviewLimit(): PreviewLimitState {
  const [viewCount, setViewCount] = useState<number>(getStoredCount);

  // Sync on mount (handles tab re-use)
  useEffect(() => {
    setViewCount(getStoredCount());
  }, []);

  const recordView = useCallback(() => {
    setViewCount((prev) => {
      const next = prev + 1;
      storeCount(next);
      return next;
    });
  }, []);

  const isLimitReached = viewCount >= MAX_FREE_PREVIEWS;

  return { viewCount, isLimitReached, recordView };
}
