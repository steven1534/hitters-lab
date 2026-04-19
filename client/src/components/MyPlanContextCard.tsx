import { Link } from "wouter";
import { Target, GitBranch, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PATHWAYS } from "@/pages/Pathways";

/**
 * Top-of-My-Plan card. Surfaces the two pieces of "personalization" that
 * separate this from a generic drill catalog:
 *   - Coach Steve's weekly focus directive
 *   - The pathway the athlete is actively working through
 *
 * Renders nothing if the coach hasn't set either yet (so a brand new athlete
 * doesn't see an empty placeholder).
 */
export function MyPlanContextCard() {
  const { data: profile } = trpc.athleteProfiles.getMyProfile.useQuery();

  if (!profile) return null;

  const hasFocus = !!profile.weeklyFocus && profile.weeklyFocus.trim().length > 0;
  const activePathway = profile.activePathwayId
    ? PATHWAYS.find((p) => p.id === profile.activePathwayId) ?? null
    : null;

  if (!hasFocus && !activePathway) return null;

  const focusUpdatedLabel = profile.weeklyFocusUpdatedAt
    ? `Set ${formatRelative(new Date(profile.weeklyFocusUpdatedAt))}`
    : null;

  return (
    <div className="glass-card rounded-2xl p-5 border-glow space-y-4 animate-fade-in-up">
      {hasFocus && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-electric" />
              <span className="text-xs font-semibold text-electric uppercase tracking-wider">
                This Week&apos;s Focus
              </span>
            </div>
            {focusUpdatedLabel && (
              <span className="text-[10px] text-muted-foreground">{focusUpdatedLabel}</span>
            )}
          </div>
          <p className="text-base text-foreground/90 leading-snug pl-6">{profile.weeklyFocus}</p>
        </div>
      )}

      {activePathway && (
        <Link href="/pathways">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 hover:bg-white/10 transition-colors cursor-pointer">
            <div className="flex items-center gap-2 min-w-0">
              <GitBranch className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Active Pathway
                </p>
                <p className="text-sm font-semibold text-foreground truncate">
                  {activePathway.title}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>
        </Link>
      )}
    </div>
  );
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  return `${Math.floor(diffDays / 7)} weeks ago`;
}
