import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import drillsData from "@/data/drills";
import { mergeDrillWithCatalogOverride } from "@shared/drillCatalogMerge";

export interface UnifiedDrill {
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
  // Enriched coaching fields (from Manus data)
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
}

/**
 * Shared hook that merges static drills (from drills.ts) with custom drills
 * (from the database) and returns them sorted alphabetically by name.
 *
 * Use this everywhere drills are listed to ensure custom drills are interleaved
 * with built-in drills rather than appended at the end.
 */
export function useAllDrills(): UnifiedDrill[] {
  const { data: customDrills = [] } = trpc.drillDetails.getCustomDrills.useQuery();
  const { data: catalogOverrides = [] } = trpc.drillCatalog.getAll.useQuery();

  return useMemo(() => {
    const overrideMap = new Map(catalogOverrides.map((o) => [o.drillId, o]));

    const staticBases: UnifiedDrill[] = drillsData.map((d) => ({
      id: String(d.id),
      name: d.name,
      difficulty: d.difficulty,
      categories: d.categories,
      duration: d.duration,
      url: d.url,
      is_direct_link: d.is_direct_link,
      isCustom: false,
      ageLevel: d.ageLevel,
      tags: d.tags,
      problem: d.problem,
      goal: d.goal,
      drillType: d.drillType,
      purpose: d.purpose,
      bestFor: d.bestFor,
      equipment: d.equipment,
      athletes: d.athletes,
      description: d.description,
      videoUrl: d.videoUrl,
      whatThisFixes: d.whatThisFixes,
      whatToFeel: d.whatToFeel,
      commonMistakes: d.commonMistakes,
      coachCue: d.coachCue,
      watchFor: d.watchFor,
      nextSteps: d.nextSteps,
      howToDoIt: d.howToDoIt,
      foundationOrAdvanced: d.foundationOrAdvanced,
    }));

    const staticDrills: UnifiedDrill[] = staticBases
      .map((base) => mergeDrillWithCatalogOverride(base, overrideMap.get(base.id)))
      .filter((d): d is UnifiedDrill => d != null);

    const customBases: UnifiedDrill[] = customDrills.map((cd: any) => ({
      id: cd.drillId,
      name: cd.name,
      difficulty: cd.difficulty,
      categories: [cd.category],
      duration: cd.duration,
      url: cd.videoUrl || `/drill/${cd.drillId}`,
      is_direct_link: true,
      isCustom: true,
      ageLevel: cd.ageLevel ?? [],
      tags: cd.tags ?? [],
      problem: cd.problem ?? [],
      goal: cd.goalTags ?? [],
      drillType: cd.drillType || "Tee Work",
      purpose: cd.purpose,
      bestFor: cd.bestFor,
      equipment: cd.equipment,
      athletes: cd.athletes,
      description: cd.description,
      videoUrl: cd.videoUrl,
      whatThisFixes: cd.whatThisFixes,
      whatToFeel: cd.whatToFeel,
      commonMistakes: cd.commonMistakes,
      coachCue: cd.coachCue,
      watchFor: cd.watchFor,
      nextSteps: cd.nextSteps,
      howToDoIt: cd.description,
      foundationOrAdvanced: cd.difficulty === 'Easy' ? 'foundation' : cd.difficulty === 'Hard' ? 'advanced' : 'build',
    }));

    const customDrillsFormatted: UnifiedDrill[] = customBases
      .map((base) => mergeDrillWithCatalogOverride(base, overrideMap.get(base.id)))
      .filter((d): d is UnifiedDrill => d != null);

    // Merge and sort alphabetically by name (case-insensitive)
    return [...staticDrills, ...customDrillsFormatted].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }, [customDrills, catalogOverrides]);
}
