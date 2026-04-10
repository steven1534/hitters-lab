import { Link } from "wouter";
import { Clock, ChevronRight, Play } from "lucide-react";
import { getDrillLevelLabel } from "@/data/drills";
import type { UnifiedDrill } from "@/hooks/useAllDrills";

const LEVEL_BORDER: Record<string, string> = {
  foundation: "border-l-foundation",
  intermediate: "border-l-gold",
  advanced: "border-l-advanced",
};

const LEVEL_BADGE: Record<string, string> = {
  foundation: "bg-foundation/15 text-foundation",
  intermediate: "bg-gold/15 text-gold",
  advanced: "bg-advanced/15 text-advanced",
};

function levelKey(difficulty: string): string {
  const d = difficulty?.toLowerCase();
  if (d === "easy") return "foundation";
  if (d === "hard") return "advanced";
  return "intermediate";
}

interface DrillCardProps {
  drill: UnifiedDrill;
  queryString?: string;
}

export default function DrillCard({ drill, queryString = "" }: DrillCardProps) {
  const level = levelKey(drill.difficulty);
  const levelLabel = getDrillLevelLabel(drill.difficulty);
  const href = `/drill/${drill.id}${queryString ? `?${queryString}` : ""}`;

  return (
    <Link href={href} className="group block h-full">
      <div
        className={`relative flex h-full flex-col rounded-[1px] border border-film-border ${LEVEL_BORDER[level]} border-l-[3px] bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(200,169,107,0.12),0_8px_24px_rgba(0,0,0,0.3)]`}
      >
        {/* Header badges */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <span
            className={`inline-flex items-center rounded-[1px] px-2 py-0.5 font-heading text-[0.58rem] font-bold uppercase tracking-[0.12em] ${LEVEL_BADGE[level]}`}
          >
            {levelLabel}
          </span>
          {drill.drillType && (
            <span className="inline-flex items-center rounded-[1px] px-2 py-0.5 font-heading text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-film-muted bg-white/5">
              {drill.drillType}
            </span>
          )}
          <Play className="ml-auto h-3.5 w-3.5 text-film-muted opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {/* Title + purpose */}
        <div className="flex-1 px-4 pb-2">
          <h3 className="font-heading text-[1rem] font-bold leading-snug tracking-wide text-film-fg">
            {drill.name}
          </h3>
          {drill.purpose && (
            <p className="mt-1 line-clamp-2 text-[0.75rem] leading-relaxed text-film-muted">
              {drill.purpose}
            </p>
          )}
        </div>

        {/* Best For callout */}
        {drill.bestFor && (
          <div className="mx-4 mb-3 rounded-[1px] border border-film-border bg-surface-raised px-3 py-2">
            <span className="block font-heading text-[0.55rem] font-bold uppercase tracking-[0.15em] text-film-muted">
              Best For
            </span>
            <span className="block text-[0.72rem] text-film-fg">
              {drill.bestFor}
            </span>
          </div>
        )}

        {/* Footer: duration + view */}
        <div className="flex items-center justify-between border-t border-film-border px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-[0.65rem] text-film-muted">
            <Clock className="h-3 w-3" />
            {drill.duration}
          </span>
          <span className="flex items-center gap-1 font-heading text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-gold transition-colors group-hover:text-gold-dim">
            View Drill
            <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
