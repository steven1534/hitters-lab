import { useState } from "react";
import { Link } from "wouter";
import { Clock, ChevronRight, Play, Star } from "lucide-react";
import { getDrillLevelLabel } from "@/data/drills";
import type { UnifiedDrill } from "@/hooks/useAllDrills";

const LEVEL_STYLES: Record<string, { badge: string; accent: string; glow: string }> = {
  foundation: {
    badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
    accent: "border-l-emerald-500",
    glow: "group-hover:shadow-emerald-500/8",
  },
  intermediate: {
    badge: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    accent: "border-l-amber-500",
    glow: "group-hover:shadow-amber-500/8",
  },
  advanced: {
    badge: "bg-red-500/15 text-red-400 border border-red-500/25",
    accent: "border-l-red-500",
    glow: "group-hover:shadow-red-500/8",
  },
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
  animationDelay?: number;
  isFavorited?: boolean;
  onToggleFavorite?: (drillId: string) => void;
}

export default function DrillCard({
  drill,
  queryString = "",
  animationDelay = 0,
  isFavorited = false,
  onToggleFavorite,
}: DrillCardProps) {
  const [hovered, setHovered] = useState(false);
  const level = levelKey(drill.difficulty);
  const styles = LEVEL_STYLES[level];
  const levelLabel = getDrillLevelLabel(drill.difficulty);
  const href = `/drill/${drill.id}${queryString ? `?${queryString}` : ""}`;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(drill.id);
  };

  return (
    <Link href={href} className="block h-full group">
      <div
        className={`relative h-full rounded-sm border-l-[3px] ${styles.accent} overflow-hidden cursor-pointer animate-fade-up
          bg-[oklch(0.14_0.007_260)] border border-[oklch(0.22_0.008_260)] border-l-[3px]
          transition-all duration-200 ease-out
          hover:-translate-y-[3px] hover:border-[oklch(0.30_0.012_260)]
          hover:shadow-[0_12px_40px_oklch(0_0_0/0.5),0_0_0_1px_oklch(0.76_0.10_75/0.12)]`}
        style={{ animationDelay: `${animationDelay}ms` }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex h-full flex-col p-5 pb-4">
          {/* Top row: badges + actions */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-md font-heading text-[0.6rem] font-bold uppercase tracking-[0.1em] ${styles.badge}`}>
                {levelLabel}
              </span>
              {drill.drillType && (
                <span className="px-2 py-0.5 rounded-md font-heading text-[0.58rem] font-semibold uppercase tracking-[0.08em] bg-white/[0.06] text-film-muted border border-white/[0.06]">
                  {drill.drillType}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {drill.videoUrl && (
                <span className="flex items-center gap-1 text-gold/60">
                  <Play size={10} fill="currentColor" />
                </span>
              )}
              {onToggleFavorite && (hovered || isFavorited) && (
                <button
                  className="transition-all duration-200 p-0.5 rounded hover:bg-white/[0.06]"
                  style={{ color: isFavorited ? "#C8A96B" : "rgba(200,169,107,0.35)" }}
                  onClick={handleFavoriteClick}
                  title={isFavorited ? "Remove from My Drills" : "Save to My Drills"}
                >
                  <Star size={14} fill={isFavorited ? "#C8A96B" : "none"} />
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="mb-2 font-heading text-[1.05rem] font-bold leading-snug tracking-wide text-film-fg group-hover:text-white transition-colors duration-200">
            {drill.name}
          </h3>

          {/* Purpose */}
          {drill.purpose && (
            <p className="mb-3 text-[0.78rem] leading-relaxed text-[oklch(0.55_0.012_260)]">
              {drill.purpose}
            </p>
          )}

          {/* Best For */}
          {drill.bestFor && (
            <div className="mb-4 rounded-md px-3 py-2.5 bg-[oklch(0.11_0.005_260)] border border-[oklch(0.20_0.006_260)]">
              <span className="block font-heading text-[0.55rem] font-bold uppercase tracking-[0.12em] text-gold/70 mb-1">
                Best For
              </span>
              <p className="text-[0.75rem] leading-snug text-[oklch(0.72_0.01_260)]">
                {drill.bestFor}
              </p>
            </div>
          )}

          {/* Footer: duration + CTA */}
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-[oklch(0.20_0.006_260)]">
            <div className="flex items-center gap-1.5 text-film-muted">
              <Clock size={12} />
              <span className="font-heading text-[0.65rem] font-semibold uppercase tracking-[0.06em]">
                {drill.duration}
              </span>
            </div>
            <div
              className="flex items-center gap-1 transition-all duration-200"
              style={{
                color: hovered ? "oklch(0.76 0.10 75)" : "oklch(0.50 0.012 260)",
                transform: hovered ? "translateX(3px)" : "translateX(0)",
              }}
            >
              <span className="font-heading text-[0.65rem] font-bold uppercase tracking-[0.08em]">
                View Drill
              </span>
              <ChevronRight size={13} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
