import { useState } from "react";
import { Link } from "wouter";
import { Clock, ChevronRight, Play, Star } from "lucide-react";
import { getDrillLevelLabel } from "@/data/drills";
import type { UnifiedDrill } from "@/hooks/useAllDrills";

const LEVEL_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  foundation: { color: "#3FAE5A", bg: "rgba(63,174,90,0.08)", border: "#3FAE5A" },
  intermediate: { color: "#C8A96B", bg: "rgba(200,169,107,0.08)", border: "#C8A96B" },
  advanced: { color: "#C74646", bg: "rgba(199,70,70,0.08)", border: "#C74646" },
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
  const lc = LEVEL_COLORS[level];
  const levelLabel = getDrillLevelLabel(drill.difficulty);
  const href = `/drill/${drill.id}${queryString ? `?${queryString}` : ""}`;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(drill.id);
  };

  return (
    <Link href={href} className="block h-full">
      <div
        className="relative h-full rounded-sm overflow-hidden cursor-pointer animate-fade-up"
        style={{
          animationDelay: `${animationDelay}ms`,
          background: "#151618",
          borderTop: `1px solid ${hovered ? "rgba(200,169,107,0.2)" : "rgba(255,255,255,0.06)"}`,
          borderRight: `1px solid ${hovered ? "rgba(200,169,107,0.2)" : "rgba(255,255,255,0.06)"}`,
          borderBottom: `1px solid ${hovered ? "rgba(200,169,107,0.2)" : "rgba(255,255,255,0.06)"}`,
          borderLeft: `3px solid ${lc.border}`,
          transform: hovered ? "translateY(-2px)" : "translateY(0)",
          boxShadow: hovered
            ? "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(200,169,107,0.12)"
            : "0 2px 8px rgba(0,0,0,0.2)",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex h-full flex-col p-4 pt-3.5">
          {/* Top row: level badge + drill type + favorite */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-1.5 py-0.5 rounded-sm font-heading text-[0.58rem] font-bold uppercase"
                style={{ letterSpacing: "0.12em", color: lc.color, background: lc.bg }}
              >
                {levelLabel}
              </span>
              {drill.drillType && (
                <span className="font-heading text-[0.58rem] font-semibold uppercase text-film-muted" style={{ letterSpacing: "0.1em" }}>
                  {drill.drillType}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {drill.videoUrl && (
                <Play size={10} fill="currentColor" className="text-gold/50" />
              )}
              {onToggleFavorite && (hovered || isFavorited) && (
                <button
                  className="transition-all p-0 border-none bg-none leading-none"
                  style={{ color: isFavorited ? "#C8A96B" : "rgba(200,169,107,0.4)" }}
                  onClick={handleFavoriteClick}
                  title={isFavorited ? "Remove from My Drills" : "Save to My Drills"}
                >
                  <Star size={13} fill={isFavorited ? "#C8A96B" : "none"} />
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="mb-1.5 font-heading text-[1.1rem] font-bold leading-tight tracking-wide text-film-fg">
            {drill.name}
          </h3>

          {/* Purpose */}
          {drill.purpose && (
            <p className="mb-3 text-[0.78rem] leading-snug text-film-muted" style={{ lineHeight: 1.45 }}>
              {drill.purpose}
            </p>
          )}

          {/* Best For */}
          {drill.bestFor && (
            <div
              className="mb-3 rounded-sm px-2 py-1.5"
              style={{ background: "rgba(255,255,255,0.04)", borderLeft: `2px solid ${lc.border}50` }}
            >
              <span className="block font-heading text-[0.6rem] font-semibold uppercase text-film-muted" style={{ letterSpacing: "0.1em" }}>
                Best For
              </span>
              <p className="mt-0.5 text-[0.72rem] leading-snug text-film-muted" style={{ color: "#B8BCC4" }}>
                {drill.bestFor}
              </p>
            </div>
          )}

          {/* Footer: duration + CTA */}
          <div className="mt-auto flex items-center justify-between pt-2">
            <div className="flex items-center gap-1">
              <Clock size={11} className="text-film-muted" />
              <span className="font-heading text-[0.65rem] font-semibold uppercase text-film-muted" style={{ letterSpacing: "0.08em" }}>
                {drill.duration}
              </span>
            </div>
            <div
              className="flex items-center gap-1 transition-all"
              style={{
                color: hovered ? "#C8A96B" : "#6B7280",
                transform: hovered ? "translateX(2px)" : "translateX(0)",
                transition: "all 0.2s ease",
              }}
            >
              <span className="font-heading text-[0.65rem] font-bold uppercase" style={{ letterSpacing: "0.1em" }}>
                View Drill
              </span>
              <ChevronRight size={12} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
