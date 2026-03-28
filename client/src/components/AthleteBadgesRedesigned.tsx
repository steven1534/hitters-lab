import { trpc } from "@/lib/trpc";
import { Trophy, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

export function AthleteBadgesRedesigned() {
  const { data: progressData, isLoading } = trpc.badges.getMyProgress.useQuery();
  const [showNewBadge, setShowNewBadge] = useState<string | null>(null);

  // Show new badge animation
  useEffect(() => {
    if (progressData?.newBadges && progressData.newBadges.length > 0) {
      setShowNewBadge(progressData.newBadges[0].name);
      const timer = setTimeout(() => setShowNewBadge(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [progressData?.newBadges]);

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-4 animate-pulse">
        <div className="h-5 bg-muted rounded w-32 mb-3" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted/50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!progressData) return null;

  const { earnedBadges, nextBadge, stats } = progressData;

  return (
    <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '0.45s' }}>
      {/* New Badge Celebration */}
      {showNewBadge && (
        <div className="glass-card rounded-2xl p-5 border-2 border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 animate-in zoom-in-95 duration-500">
          <div className="flex items-center gap-3 justify-center">
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
            <div className="text-center">
              <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider">New Badge Earned!</p>
              <p className="text-lg font-bold text-foreground">{showNewBadge}</p>
            </div>
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
        </div>
      )}

      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <div className="glass-card rounded-2xl p-4 border-glow">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="font-semibold text-foreground">Your Badges</span>
            <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 ml-auto">
              {earnedBadges.length}
            </Badge>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {earnedBadges.map((badge) => (
              <div
                key={badge.id}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/40 border border-border hover:bg-muted transition-all duration-200"
                title={badge.badgeDescription || ""}
              >
                <span className="text-2xl">{badge.badgeIcon}</span>
                <span className="text-[10px] font-medium text-foreground text-center leading-tight">
                  {badge.badgeName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Badge Progress */}
      {nextBadge && (
        <div className="glass-card rounded-2xl p-4 border-glow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{nextBadge.icon}</span>
              <div>
                <span className="font-semibold text-foreground text-sm">Next: {nextBadge.name}</span>
                <p className="text-xs text-muted-foreground">{nextBadge.description}</p>
              </div>
            </div>
            <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30">
              {nextBadge.target - nextBadge.progress} more
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-electric h-2.5 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, (nextBadge.progress / nextBadge.target) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {nextBadge.progress}/{nextBadge.target} completed
          </p>
        </div>
      )}

      {/* Stats Row */}
      <div className="glass-card rounded-2xl p-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-2xl font-bold text-electric">{stats.completedDrills}</p>
          <p className="text-xs text-muted-foreground">Drills Done</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-orange-400">{stats.streak}</p>
          <p className="text-xs text-muted-foreground">Day Streak</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-purple-400">{stats.videoSubmissions}</p>
          <p className="text-xs text-muted-foreground">Videos</p>
        </div>
      </div>
    </div>
  );
}
