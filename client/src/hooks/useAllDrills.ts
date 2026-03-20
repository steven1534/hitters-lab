import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import drillsData from "@/data/drills";

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

  return useMemo(() => {
    const staticDrills: UnifiedDrill[] = drillsData.map((d) => ({
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
    }));

    const customDrillsFormatted: UnifiedDrill[] = customDrills.map((cd: any) => ({
      id: cd.drillId,
      name: cd.name,
      difficulty: cd.difficulty,
      categories: [cd.category],
      duration: cd.duration,
      url: `/drill/${cd.drillId}`,
      is_direct_link: true,
      isCustom: true,
      ageLevel: [],
      tags: [],
      problem: [],
      goal: [],
      drillType: cd.drillType || "Game Simulation",
    }));

    // Merge and sort alphabetically by name (case-insensitive)
    return [...staticDrills, ...customDrillsFormatted].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }, [customDrills]);
}
