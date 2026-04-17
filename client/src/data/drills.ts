/**
 * Coach Steve's Hitters Lab — Drill Library
 * Adapted from Manus drillsData.ts with backward-compatible field mapping
 * Total drills: 105 (hitting-only, enriched with coaching content)
 */
import { drills as manusDrills, filterOptions as manusFilters } from "./manusData";

export type DrillLevel = 'foundation' | 'intermediate' | 'advanced';

export interface Drill {
  id: string;
  name: string;
  difficulty: string;
  categories: string[];
  duration: string;
  url: string;
  is_direct_link: boolean;
  ageLevel: string[];
  tags: string[];
  problem: string[];
  goal: string[];
  drillType: string;
  purpose?: string;
  bestFor?: string;
  equipment?: string;
  athletes?: string;
  description?: string[];
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  drillTypeRaw?: string;
  foundationOrAdvanced?: string;
  skillSet?: string;
  whatThisFixes?: string[];
  howToDoIt?: string[];
  whatToFeel?: string[];
  commonMistakes?: string[];
  coachCue?: string;
  watchFor?: string;
  nextSteps?: string[];
}

export function getDrillLevel(difficulty: string): DrillLevel {
  const d = difficulty?.toLowerCase();
  if (d === 'easy') return 'foundation';
  if (d === 'hard') return 'advanced';
  return 'intermediate';
}

export function getDrillLevelLabel(difficulty: string): string {
  const d = difficulty?.toLowerCase();
  if (d === 'easy') return 'Foundation';
  if (d === 'hard') return 'Advanced';
  return 'Intermediate';
}

const drillsData: Drill[] = manusDrills.map((d) => ({
  id: d.id,
  name: d.name,
  difficulty: d.difficulty,
  categories: [d.skillSet],
  duration: d.time,
  url: d.videoUrl || '',
  is_direct_link: false,
  ageLevel: d.ageLevel,
  tags: d.tags,
  problem: d.problems,
  goal: d.goals,
  drillType: d.drillType,
  purpose: d.purpose,
  bestFor: d.bestFor,
  equipment: d.equipment,
  athletes: d.athletes,
  description: d.description,
  videoUrl: d.videoUrl,
  thumbnailUrl: d.thumbnailUrl,
  drillTypeRaw: d.drillTypeRaw,
  foundationOrAdvanced: d.foundationOrAdvanced,
  skillSet: d.skillSet,
  whatThisFixes: d.whatThisFixes,
  howToDoIt: d.howToDoIt,
  whatToFeel: d.whatToFeel,
  commonMistakes: d.commonMistakes,
  coachCue: d.coachCue,
  watchFor: d.watchFor,
  nextSteps: d.nextSteps,
}));

export default drillsData;

export const filterOptions = manusFilters;

export const drillTypeOptions = [
  {
    label: 'Tee & Foundation',
    options: [
      { value: 'Tee Work', label: 'Tee Work' },
      { value: 'No Stride', label: 'No Stride' },
      { value: 'Warm-Up', label: 'Warm-Up' },
      { value: 'Mirror', label: 'Mirror' },
    ],
  },
  {
    label: 'Toss & Feed',
    options: [
      { value: 'Front Toss', label: 'Front Toss' },
      { value: 'Soft Toss', label: 'Soft Toss' },
      { value: 'Side Toss', label: 'Side Toss' },
    ],
  },
  {
    label: 'Game & Decision',
    options: [
      { value: 'Decision Making', label: 'Decision Making' },
      { value: 'Constraint', label: 'Constraint' },
      { value: 'Movement', label: 'Movement' },
    ],
  },
  {
    label: 'Corrections',
    options: [
      { value: 'Flaw Fix', label: 'Flaw Fix' },
    ],
  },
];
