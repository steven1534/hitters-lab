import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Zap, Target, Flame } from "lucide-react";

interface BadgeAchievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

interface AthleteBadgesProps {
  submissionCount: number;
  completedDrillCount: number;
  consecutiveDays?: number;
  averageCompletionTime?: number;
}

export function AthleteBadges({
  submissionCount,
  completedDrillCount,
  consecutiveDays = 0,
}: AthleteBadgesProps) {
  const [badges, setBadges] = useState<BadgeAchievement[]>([]);
  const [newBadges, setNewBadges] = useState<string[]>([]);

  useEffect(() => {
    const calculatedBadges: BadgeAchievement[] = [];

    // First Submission Badge
    if (submissionCount >= 1) {
      calculatedBadges.push({
        id: "first_submission",
        name: "Getting Started",
        description: "Submitted your first drill",
        icon: <Target className="h-5 w-5" />,
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-[#E8425A]",
        unlockedAt: new Date(),
      });
    }

    // 5 Submissions Badge
    if (submissionCount >= 5) {
      calculatedBadges.push({
        id: "five_submissions",
        name: "Dedicated Athlete",
        description: "Submitted 5 drills",
        icon: <Zap className="h-5 w-5" />,
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        unlockedAt: new Date(),
      });
    }

    // 10 Submissions Badge
    if (submissionCount >= 10) {
      calculatedBadges.push({
        id: "ten_submissions",
        name: "Submission Master",
        description: "Submitted 10 drills",
        icon: <Award className="h-5 w-5" />,
        color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
        unlockedAt: new Date(),
      });
    }

    // 25 Submissions Badge
    if (submissionCount >= 25) {
      calculatedBadges.push({
        id: "twenty_five_submissions",
        name: "Elite Performer",
        description: "Submitted 25 drills",
        icon: <Flame className="h-5 w-5" />,
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        unlockedAt: new Date(),
      });
    }

    // Completion Badge
    if (completedDrillCount >= 5) {
      calculatedBadges.push({
        id: "five_completed",
        name: "Completion Champion",
        description: "Completed 5 drills",
        icon: <Target className="h-5 w-5" />,
        color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        unlockedAt: new Date(),
      });
    }

    // Consistency Badge
    if (consecutiveDays >= 7) {
      calculatedBadges.push({
        id: "seven_day_streak",
        name: "Consistency King",
        description: "7-day submission streak",
        icon: <Flame className="h-5 w-5" />,
        color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
        unlockedAt: new Date(),
      });
    }

    // Check for new badges
    const oldBadgeIds = badges.map((b) => b.id);
    const newBadgeIds = calculatedBadges.map((b) => b.id).filter((id) => !oldBadgeIds.includes(id));

    if (newBadgeIds.length > 0) {
      setNewBadges(newBadgeIds);
      // Clear new badge animation after 3 seconds
      setTimeout(() => setNewBadges([]), 3000);
    }

    setBadges(calculatedBadges);
  }, [submissionCount, completedDrillCount, consecutiveDays, badges]);

  // Calculate next milestone
  const nextMilestone = (() => {
    if (submissionCount < 5) return { name: "Dedicated Athlete", count: 5 - submissionCount };
    if (submissionCount < 10) return { name: "Submission Master", count: 10 - submissionCount };
    if (submissionCount < 25) return { name: "Elite Performer", count: 25 - submissionCount };
    return null;
  })();

  return (
    <div className="space-y-4">
      {/* Badges Grid */}
      {badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-3 rounded-lg text-center transition-all ${badge.color} ${
                    newBadges.includes(badge.id) ? "ring-2 ring-offset-2 ring-primary animate-pulse" : ""
                  }`}
                >
                  <div className="flex justify-center mb-2">{badge.icon}</div>
                  <p className="text-xs font-semibold">{badge.name}</p>
                  <p className="text-xs opacity-75 mt-1">{badge.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress to Next Badge */}
      {nextMilestone && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold">Next Badge: {nextMilestone.name}</p>
                <Badge variant="secondary">{nextMilestone.count} more</Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-secondary h-2 rounded-full transition-all"
                  style={{
                    width: `${((submissionCount % 5) / 5) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {submissionCount} submissions so far
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-primary">{submissionCount}</p>
              <p className="text-xs text-muted-foreground">Submissions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary">{completedDrillCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            {consecutiveDays > 0 && (
              <div>
                <p className="text-2xl font-bold text-accent">{consecutiveDays}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
