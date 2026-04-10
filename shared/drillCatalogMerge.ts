/** Shared merge logic: static/custom drill row + optional DB catalog override (Phase 1). */

export type CatalogOverrideRow = {
  drillId: string;
  name: string | null;
  difficulty: string | null;
  categories: string[] | null;
  duration: string | null;
  tags: string[] | null;
  externalUrl: string | null;
  hiddenFromDirectory: number;
};

export type MergeableDrill = {
  id: string;
  name: string;
  difficulty: string;
  categories: string[];
  duration: string;
  url?: string;
  is_direct_link?: boolean;
  isCustom?: boolean;
  ageLevel?: string[];
  tags?: string[];
  problem?: string[];
  goal?: string[];
  drillType?: string;
  // Enriched coaching fields (passed through from Manus drill data)
  purpose?: string;
  bestFor?: string;
  equipment?: string;
  athletes?: string;
  description?: string[];
  videoUrl?: string | null;
  whatThisFixes?: string[];
  whatToFeel?: string[];
  commonMistakes?: string[];
  coachCue?: string;
  watchFor?: string;
  nextSteps?: string[];
  howToDoIt?: string[];
  foundationOrAdvanced?: string;
};

/**
 * Apply DB override on top of base drill.
 * Returns null when hidden — unless `skipHiddenCheck` is true (use on detail pages
 * where the drill should still be accessible via direct URL).
 */
export function mergeDrillWithCatalogOverride(
  base: MergeableDrill,
  ov: CatalogOverrideRow | null | undefined,
  opts?: { skipHiddenCheck?: boolean }
): MergeableDrill | null {
  if (!ov) return base;
  if (ov.hiddenFromDirectory === 1 && !opts?.skipHiddenCheck) return null;
  const url =
    ov.externalUrl != null && ov.externalUrl.trim() !== ""
      ? ov.externalUrl.trim()
      : base.url;
  const hasCustomUrl = ov.externalUrl != null && ov.externalUrl.trim() !== "";
  return {
    ...base,
    name: ov.name != null && ov.name.trim() !== "" ? ov.name.trim() : base.name,
    difficulty:
      ov.difficulty != null && ov.difficulty.trim() !== ""
        ? ov.difficulty.trim()
        : base.difficulty,
    categories: ov.categories != null ? ov.categories : base.categories,
    duration:
      ov.duration != null && ov.duration.trim() !== ""
        ? ov.duration.trim()
        : base.duration,
    tags: ov.tags != null ? ov.tags : base.tags,
    url,
    is_direct_link: hasCustomUrl ? true : base.is_direct_link,
  };
}
