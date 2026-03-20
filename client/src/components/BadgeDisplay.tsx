import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BadgeItem {
  id: number;
  badgeType: string;
  badgeName: string;
  badgeDescription?: string;
  badgeIcon?: string;
  earnedAt: Date | string;
}

interface BadgeDisplayProps {
  badges: BadgeItem[];
  maxDisplay?: number;
}

const badgeConfigs: Record<string, { icon: string; color: string; bgColor: string }> = {
  first_drill: { icon: "🎯", color: "text-[#DC143C]", bgColor: "bg-red-50 dark:bg-red-950" },
  five_day_streak: { icon: "🔥", color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950" },
  ten_day_streak: { icon: "🚀", color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950" },
  master_hitting: { icon: "⚾", color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950" },
  master_infield: { icon: "🧤", color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-950" },
  master_pitching: { icon: "🎪", color: "text-[#DC143C]", bgColor: "bg-red-50 dark:bg-red-950" },
};

export function BadgeDisplay({ badges, maxDisplay = 6 }: BadgeDisplayProps) {
  if (badges.length === 0) {
    return null;
  }

  const displayBadges = badges.slice(0, maxDisplay);
  const config = badgeConfigs;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Achievements</h3>
      <div className="flex flex-wrap gap-2">
        {displayBadges.map((badge) => {
          const badgeConfig = config[badge.badgeType] || { icon: "⭐", color: "text-yellow-600", bgColor: "bg-yellow-50" };
          return (
            <div
              key={badge.id}
              className={`${badgeConfig.bgColor} border rounded-lg p-2 flex items-center gap-2 hover:shadow-md transition-shadow`}
              title={badge.badgeDescription}
            >
              <span className="text-lg">{badgeConfig.icon}</span>
              <div className="flex flex-col">
                <span className={`text-xs font-bold ${badgeConfig.color}`}>{badge.badgeName}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(badge.earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {badges.length > maxDisplay && (
        <p className="text-xs text-muted-foreground">+{badges.length - maxDisplay} more badges</p>
      )}
    </div>
  );
}

export function BadgeCard({ badge }: { badge: BadgeItem }) {
  const badgeConfig = badgeConfigs[badge.badgeType] || { icon: "⭐", color: "text-yellow-600", bgColor: "bg-yellow-50" };

  return (
    <Card className={badgeConfig.bgColor}>
      <CardContent className="pt-6">
        <div className="text-center">
          <div className="text-4xl mb-2">{badgeConfig.icon}</div>
          <h3 className={`font-bold ${badgeConfig.color} mb-1`}>{badge.badgeName}</h3>
          {badge.badgeDescription && (
            <p className="text-xs text-muted-foreground mb-2">{badge.badgeDescription}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Earned {new Date(badge.earnedAt).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
