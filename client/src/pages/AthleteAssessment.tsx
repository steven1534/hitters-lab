import { useState, useMemo, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, FileText, TrendingUp, Target, Clock, CheckCircle2,
  AlertCircle, BarChart3, Calendar, Award, Flame, Download,
  ChevronRight, User, Activity
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

function StatCard({ icon, label, value, subtitle, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-heading font-bold mt-1 ${color || "text-foreground"}`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="p-2 rounded-lg bg-muted/50 border border-border/60">{icon}</div>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, label, color }: {
  value: number;
  max: number;
  label: string;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/{max} ({pct}%)</span>
      </div>
      <div className="h-2.5 bg-muted/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function WeeklyChart({ data }: { data: Array<{ week: string; completed: number }> }) {
  const maxVal = Math.max(...data.map((d) => d.completed), 1);
  return (
    <div className="flex items-end gap-3 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs font-medium text-foreground">{d.completed}</span>
          <div className="w-full bg-muted/60 rounded-t-md overflow-hidden" style={{ height: "100%" }}>
            <div
              className="w-full bg-gradient-to-t from-[#DC143C] to-[#E8425A] rounded-t-md transition-all duration-500"
              style={{
                height: `${(d.completed / maxVal) * 100}%`,
                marginTop: `${100 - (d.completed / maxVal) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{d.week}</span>
        </div>
      ))}
    </div>
  );
}

function AssessmentReport({ athleteId, athleteName }: { athleteId: number; athleteName: string }) {
  const { data: progress, isLoading } = trpc.drillAssignments.getAthleteProgress.useQuery({ userId: athleteId });
  const { data: coachNotes } = trpc.drillAssignments.getCoachNotes.useQuery({ athleteId });
  const reportRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-secondary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-heading font-bold">No Data Available</h3>
        <p className="text-muted-foreground">No progress data found for this athlete.</p>
      </div>
    );
  }

  const { coreMetrics, activity, assignments } = progress;

  // Calculate category breakdown from assignments
  const categoryBreakdown: Record<string, { total: number; completed: number }> = {};
  // We'll use drillName to infer categories - this is approximate
  assignments.forEach((a: any) => {
    const cat = "Assigned Drills";
    if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { total: 0, completed: 0 };
    categoryBreakdown[cat].total++;
    if (a.status === "completed") categoryBreakdown[cat].completed++;
  });

  // Determine engagement level
  const getEngagementLevel = () => {
    if (coreMetrics.completionRate >= 80) return { level: "Highly Engaged", color: "text-green-500", badge: "bg-green-900/30 text-green-400 border-green-800" };
    if (coreMetrics.completionRate >= 50) return { level: "Moderately Engaged", color: "text-yellow-500", badge: "bg-yellow-900/30 text-yellow-400 border-yellow-800" };
    if (coreMetrics.completionRate >= 25) return { level: "Needs Encouragement", color: "text-orange-500", badge: "bg-orange-900/30 text-orange-400 border-orange-800" };
    return { level: "At Risk", color: "text-red-500", badge: "bg-red-900/30 text-red-400 border-red-800" };
  };

  const engagement = getEngagementLevel();

  // Generate recommendations
  const recommendations: string[] = [];
  if (coreMetrics.completionRate < 50) {
    recommendations.push("Consider reducing the number of assigned drills to avoid overwhelming the athlete.");
  }
  if (coreMetrics.inProgress > 3) {
    recommendations.push("Multiple drills are in-progress. Encourage the athlete to complete current drills before starting new ones.");
  }
  if (coreMetrics.avgDaysToComplete > 7) {
    recommendations.push("Average completion time is over a week. Consider setting shorter deadlines or breaking drills into smaller sessions.");
  }
  if (coreMetrics.completionRate >= 80) {
    recommendations.push("Excellent completion rate! Consider increasing difficulty or adding more advanced drills.");
  }
  if (activity.weeklyProgress.every((w: any) => w.completed === 0)) {
    recommendations.push("No drill completions in the last 4 weeks. A check-in conversation may be helpful.");
  }
  if (coreMetrics.totalAssigned === 0) {
    recommendations.push("No drills have been assigned yet. Start with 2-3 foundational drills.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Athlete is progressing steadily. Continue current training plan.");
  }

  const reportDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div ref={reportRef} className="space-y-6">
      {/* Report Header */}
      <div className="glass-card rounded-xl border-l-4 border-l-[#DC143C] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#DC143C]/20 to-purple-500/20 border border-border/60 flex items-center justify-center">
                <User className="h-5 w-5 text-[#E8425A]" />
              </div>
              <h2 className="text-2xl font-heading font-bold">{athleteName}</h2>
            </div>
            <p className="text-sm text-muted-foreground ml-[52px]">Assessment Report — {reportDate}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={engagement.badge}>
              {engagement.level}
            </Badge>
          </div>
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="h-5 w-5 text-secondary" />}
          label="Total Assigned"
          value={coreMetrics.totalAssigned}
          subtitle="drills"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          label="Completed"
          value={coreMetrics.completed}
          subtitle={`${coreMetrics.completionRate}% rate`}
          color="text-green-500"
        />
        <StatCard
          icon={<Activity className="h-5 w-5 text-yellow-500" />}
          label="In Progress"
          value={coreMetrics.inProgress}
          subtitle="active drills"
          color="text-yellow-500"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-muted-foreground" />}
          label="Avg. Completion"
          value={coreMetrics.avgDaysToComplete > 0 ? `${coreMetrics.avgDaysToComplete}d` : "N/A"}
          subtitle="days per drill"
        />
      </div>

      {/* Completion Progress */}
      <div className="glass-card rounded-xl">
        <div className="p-4 md:p-6 pb-3">
          <h3 className="text-lg font-heading font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-green-400" />
            </div>
            Overall Progress
          </h3>
        </div>
        <div className="p-4 md:p-6 pt-0 space-y-4">
          <ProgressBar
            value={coreMetrics.completed}
            max={coreMetrics.totalAssigned}
            label="Completion Rate"
            color="bg-green-500"
          />
          <ProgressBar
            value={coreMetrics.inProgress}
            max={coreMetrics.totalAssigned}
            label="In Progress"
            color="bg-yellow-500"
          />
          <ProgressBar
            value={coreMetrics.assigned}
            max={coreMetrics.totalAssigned}
            label="Not Started"
            color="bg-muted-foreground/50"
          />
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="glass-card rounded-xl">
        <div className="p-4 md:p-6 pb-3">
          <h3 className="text-lg font-heading font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-purple-400" />
            </div>
            Weekly Activity (Last 4 Weeks)
          </h3>
        </div>
        <div className="p-4 md:p-6 pt-0">
          {activity.weeklyProgress.length > 0 ? (
            <WeeklyChart data={activity.weeklyProgress} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No weekly activity data available</p>
          )}
        </div>
      </div>

      {/* Recent Completions & Assignments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Completions */}
        <div className="glass-card rounded-xl">
          <div className="p-4 md:p-6 pb-3">
            <h3 className="text-lg font-heading font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                <Award className="h-4 w-4 text-green-400" />
              </div>
              Recent Completions
            </h3>
          </div>
          <div className="p-4 md:p-6 pt-0">
            {activity.recentCompletions.length > 0 ? (
              <div className="space-y-3">
                {activity.recentCompletions.map((rc: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      <span className="text-sm font-medium">{rc.drillName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {rc.completedAt ? new Date(rc.completedAt).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No completions yet</p>
            )}
          </div>
        </div>

        {/* Current Assignments */}
        <div className="glass-card rounded-xl">
          <div className="p-4 md:p-6 pb-3">
            <h3 className="text-lg font-heading font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#DC143C]/20 to-[#DC143C]/20 flex items-center justify-center">
                <Target className="h-4 w-4 text-[#E8425A]" />
              </div>
              Active Assignments
            </h3>
          </div>
          <div className="p-4 md:p-6 pt-0">
            {assignments.filter((a: any) => a.status !== "completed").length > 0 ? (
              <div className="space-y-3">
                {assignments
                  .filter((a: any) => a.status !== "completed")
                  .slice(0, 5)
                  .map((a: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${a.status === "in-progress" ? "bg-yellow-500" : "bg-muted-foreground/50"}`} />
                        <span className="text-sm font-medium">{a.drillName}</span>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">{a.status}</Badge>
                    </div>
                  ))}
                {assignments.filter((a: any) => a.status !== "completed").length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{assignments.filter((a: any) => a.status !== "completed").length - 5} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">All drills completed!</p>
            )}
          </div>
        </div>
      </div>

      {/* Coach Notes Summary */}
      {coachNotes && coachNotes.length > 0 && (
        <div className="glass-card rounded-xl">
          <div className="p-4 md:p-6 pb-3">
            <h3 className="text-lg font-heading font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <FileText className="h-4 w-4 text-amber-400" />
              </div>
              Recent Coach Notes
            </h3>
          </div>
          <div className="p-4 md:p-6 pt-0">
            <div className="space-y-4">
              {coachNotes.slice(0, 3).map((note: any, i: number) => (
                <div key={i} className="bg-muted/30 rounded-lg p-4 border-l-2 border-l-[#DC143C]/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      {note.meetingDate ? new Date(note.meetingDate).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{note.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="glass-card rounded-xl border border-[#DC143C]/20">
        <div className="p-4 md:p-6 pb-3">
          <h3 className="text-lg font-heading font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#DC143C]/20 to-[#DC143C]/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-[#E8425A]" />
            </div>
            Recommendations
          </h3>
        </div>
        <div className="p-4 md:p-6 pt-0">
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <ChevronRight className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AthleteAssessment() {
  const { user } = useAuth();
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const { data: overview, isLoading: overviewLoading } = trpc.drillAssignments.getAthleteAssignmentOverview.useQuery();

  const athletes = useMemo(() => {
    if (!overview?.athletes) return [];
    return overview.athletes
      .filter((a) => a.type === "user")
      .map((a) => ({
        id: a.id.replace("user-", ""),
        name: a.name,
        email: a.email,
        totalDrills: a.totalDrills,
        completedDrills: a.completedDrills,
        hasDrills: a.hasDrills,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [overview]);

  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);

  return (
    <div className="coach-dark min-h-screen bg-background">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.18_0.01_25)] via-[oklch(0.15_0.005_0)] to-[oklch(0.12_0.01_20)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.45_0.15_250/0.15),transparent_60%)]" />
        <div className="container relative z-10 py-6">
          <Link href="/coach-dashboard">
            <Button variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground hover:bg-muted mb-3 gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-heading font-black text-foreground">Athlete Assessment Reports</h1>
          <p className="text-muted-foreground mt-1">Auto-generated progress reports for each athlete</p>
        </div>
      </header>

      <main className="container py-8">
        {/* Athlete Selector */}
        <div className="glass-card rounded-xl mb-8">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground whitespace-nowrap">
                <User className="h-4 w-4" />
                Select Athlete:
              </div>
              <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Choose an athlete..." />
                </SelectTrigger>
                <SelectContent>
                  {athletes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        {a.name}
                        <span className="text-xs text-muted-foreground">
                          ({a.completedDrills}/{a.totalDrills} drills)
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {selectedAthlete ? (
          <AssessmentReport
            athleteId={parseInt(selectedAthlete.id)}
            athleteName={selectedAthlete.name}
          />
        ) : (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#DC143C]/10 to-purple-500/10 border border-border/60 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-10 w-10 text-[#E8425A]/60" />
            </div>
            <h3 className="text-xl font-heading font-bold mb-2">Select an Athlete</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Choose an athlete from the dropdown above to generate their assessment report with drill completion rates, weekly activity, and personalized recommendations.
            </p>

            {/* Quick Overview Cards */}
            {overview && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 max-w-2xl mx-auto">
                <StatCard
                  icon={<User className="h-5 w-5 text-secondary" />}
                  label="Total Athletes"
                  value={overview.summary?.totalAthletes ?? 0}
                />
                <StatCard
                  icon={<Target className="h-5 w-5 text-green-500" />}
                  label="With Drills"
                  value={overview.summary?.athletesWithDrills ?? 0}
                />
                <StatCard
                  icon={<BarChart3 className="h-5 w-5 text-yellow-500" />}
                  label="Total Assigned"
                  value={overview.summary?.totalDrillsAssigned ?? 0}
                />
                <StatCard
                  icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
                  label="Completion Rate"
                  value={`${overview.summary?.completionRate ?? 0}%`}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
