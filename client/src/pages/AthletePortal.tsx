import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CheckCircle, Clock, AlertCircle, Play, Home, LogOut,
  MessageCircle, Star, Flame, Target, X, Trophy, FileText, ChevronDown, ChevronUp,
  Dumbbell, Coffee, Zap, User, Video, Upload, BarChart3, Beaker, ClipboardList,
  TrendingUp, Award, Medal, ChevronRight
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo, useEffect, useRef } from "react";
import { getCategoryConfig } from "@/lib/categoryColors";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CompletionModal } from "@/components/CompletionModal";
import { DrillCoachFocus, DrillQuickNotes } from "@/components/DrillActionComponents";
import { AthletePortalSkeleton } from "@/components/Skeleton";
import { MyPlanContextCard } from "@/components/MyPlanContextCard";
import { MyRoutines } from "@/components/MyRoutines";
import { useAllDrills } from "@/hooks/useAllDrills";
import { DrillSubmissionForm } from "@/components/DrillSubmissionForm";
import { NotificationBell } from "@/components/NotificationBell";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { AthleteBlastMetrics } from "@/components/AthleteBlastMetrics";
import { AthletePlayerReports } from "@/components/AthletePlayerReports";
import { DrillModalRedesigned } from "@/components/DrillModalRedesigned";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

interface Drill {
  id: string;
  name: string;
  difficulty: string;
  categories: string[];
  duration: string;
  skillSet?: string;
  url?: string;
  is_direct_link?: boolean;
}

interface Assignment {
  id: number;
  userId: number | null;
  inviteId?: number | null;
  drillId: string;
  drillName: string;
  status: "assigned" | "in-progress" | "completed";
  notes: string | null;
  assignedAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
}

// ── Tab configuration ────────────────────────────────────────
// "This Week" = the assigned-work landing surface (drills coach assigned + today's reps).
// Other tabs are secondary reference / history surfaces.
const TABS = [
  { id: "training", label: "This Week", icon: Target },
  { id: "progress", label: "Progress", icon: BarChart3 },
  { id: "swinglab", label: "Swing Lab", icon: Beaker },
  { id: "coach", label: "Coach Notes", icon: ClipboardList },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── Circular progress ────────────────────────────────────────
function CircularProgress({ percentage, size = 80 }: { percentage: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-white/10"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-electric transition-all duration-500"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ filter: 'drop-shadow(0 0 8px rgba(0, 191, 255, 0.5))' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-foreground">{percentage}%</span>
      </div>
    </div>
  );
}

function SkillIcon({ category }: { category: string }) {
  return (
    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-electric/20 border border-electric/30">
      <Target className="w-6 h-6 text-electric" />
    </div>
  );
}

// ── Progression tier ─────────────────────────────────────────
const TIERS = [
  { name: "Bronze Hitter", min: 0, color: "from-amber-700 to-amber-500", text: "text-amber-400", border: "border-amber-500/30" },
  { name: "Silver Hitter", min: 25, color: "from-slate-400 to-slate-300", text: "text-slate-300", border: "border-slate-400/30" },
  { name: "Gold Hitter", min: 75, color: "from-yellow-500 to-yellow-300", text: "text-yellow-400", border: "border-yellow-400/30" },
  { name: "Elite Hitter", min: 150, color: "from-purple-500 to-pink-400", text: "text-purple-400", border: "border-purple-400/30" },
];

function getTier(totalDrills: number) {
  let current = TIERS[0];
  let next = TIERS[1];
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (totalDrills >= TIERS[i].min) {
      current = TIERS[i];
      next = TIERS[i + 1] || null;
      break;
    }
  }
  return { current, next };
}

// ── Main component ───────────────────────────────────────────
export default function AthletePortal() {
  useScrollRestoration();
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("training");
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showDrillModal, setShowDrillModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const { data: userAssignments = [], isLoading: assignmentsLoading } = trpc.drillAssignments.getUserAssignments.useQuery(
    undefined, { enabled: !!user?.id }
  );
  const { data: favoritesData } = trpc.favorites.getAll.useQuery(undefined, { enabled: !!user?.id });
  const favoriteIds = favoritesData?.drillIds || [];

  const utils = trpc.useUtils();
  const toggleFavorite = trpc.favorites.toggle.useMutation({ onSuccess: () => utils.favorites.getAll.invalidate() });
  const updateStatusMutation = trpc.drillAssignments.updateStatus.useMutation({
    onSuccess: () => utils.drillAssignments.getUserAssignments.invalidate(),
    onError: (err) => {
      toast.error("Could not save progress", { description: err.message });
    },
  });
  const progressStats = useMemo(() => {
    const total = userAssignments.length;
    const completed = userAssignments.filter((a: any) => a.status === "completed").length;
    const inProgress = userAssignments.filter((a: any) => a.status === "in-progress").length;
    const assigned = userAssignments.filter((a: any) => a.status === "assigned").length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, assigned, percentage };
  }, [userAssignments]);

  const upNextDrill = useMemo(() => {
    const assignedDrills = userAssignments.filter((a: any) => a.status === "assigned");
    const inProgressDrills = userAssignments.filter((a: any) => a.status === "in-progress");
    return inProgressDrills[0] || assignedDrills[0] || null;
  }, [userAssignments]);

  const pendingAssignments = useMemo(() => userAssignments.filter((a: any) => a.status !== "completed"), [userAssignments]);
  const completedAssignments = useMemo(() => userAssignments.filter((a: any) => a.status === "completed"), [userAssignments]);

  const allDrills = useAllDrills();
  const getDrill = (drillId: string): Drill | undefined => (allDrills as Drill[]).find(d => d.id === drillId);

  const handleStatusUpdate = async (assignmentId: number, newStatus: "assigned" | "in-progress" | "completed") => {
    try {
      await updateStatusMutation.mutateAsync({ assignmentId, status: newStatus });
      if (selectedAssignment?.id === assignmentId) {
        setSelectedAssignment({ ...selectedAssignment, status: newStatus });
      }
      if (newStatus === "completed") {
        toast.success("Nice work — drill marked complete");
      } else if (newStatus === "in-progress") {
        toast.success("Marked in progress");
      } else {
        toast.success("Status updated");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const openDrillModal = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowDrillModal(true);
  };

  const getDifficultyStyles = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy": return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      case "medium": return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
      case "hard": return "bg-rose-500/20 text-rose-400 border border-rose-500/30";
      default: return "bg-slate-500/20 text-slate-400 border border-slate-500/30";
    }
  };

  if (loading || assignmentsLoading) return <AthletePortalSkeleton />;

  if (!user) {
    return (
      <div className="coach-dark min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-electric/10 rounded-full blur-3xl" />
        <div className="glass-card max-w-md w-full p-8 rounded-2xl animate-fade-in-up">
          <div className="w-16 h-16 bg-electric/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-electric" />
          </div>
          <h2 className="text-xl font-bold text-center mb-2">Please Log In</h2>
          <p className="text-muted-foreground text-center mb-6">You need to be logged in to view your plan.</p>
          <Link href="/drills"><Button variant="outline" className="w-full glass hover:bg-white/5">Back to Library</Button></Link>
        </div>
      </div>
    );
  }

  if (user?.role === 'athlete' && !user?.isActiveClient) {
    return (
      <div className="coach-dark min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-destructive/10 rounded-full blur-3xl" />
        <div className="glass-card max-w-md w-full p-8 rounded-2xl animate-fade-in-up">
          <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-center mb-2">Account Inactive</h2>
          <p className="text-muted-foreground text-center mb-6">Your account has been deactivated. Please contact your coach.</p>
          <Button onClick={() => logout()} variant="outline" className="w-full glass hover:bg-white/5 gap-2">
            <LogOut className="h-4 w-4" />Log Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="coach-dark min-h-screen bg-background pb-20 md:pb-6">
      {/* Header */}
      <header className="glass sticky top-0 z-40 border-b border-white/10">
        <div className="flex items-center justify-between max-w-lg mx-auto px-4 py-3">
          <Link href="/drills">
            <button className="flex items-center gap-1 text-muted-foreground hover:text-electric text-sm transition-colors hover-lift">
              <Home className="w-4 h-4" /><span className="hidden sm:inline">Library</span>
            </button>
          </Link>
          <div className="flex flex-col items-center leading-tight">
            <h1 className="font-bold text-lg text-gradient">My Plan</h1>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Coach Steve&apos;s assignments</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link href="/my-profile">
              <button className="flex items-center gap-1 text-muted-foreground hover:text-electric text-sm transition-colors hover-lift">
                <User className="w-4 h-4" /><span className="hidden sm:inline">Profile</span>
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Desktop Tab Bar */}
      <div className="hidden md:block glass border-b border-white/10">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive ? "border-electric text-electric" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />{tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {activeTab === "training" && (
          <TrainingTab
            upNextDrill={upNextDrill}
            pendingAssignments={pendingAssignments}
            completedAssignments={completedAssignments}
            progressStats={progressStats}
            favoriteIds={favoriteIds}
            allDrills={allDrills}
            getDrill={getDrill}
            getDifficultyStyles={getDifficultyStyles}
            openDrillModal={openDrillModal}
          />
        )}
        {activeTab === "progress" && <ProgressTab stats={progressStats} completedCount={completedAssignments.length} />}
        {activeTab === "swinglab" && <SwingLabTab />}
        {activeTab === "coach" && <CoachNotesTab />}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10 safe-area-bottom">
        <div className="flex justify-around items-center px-2 py-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-0 ${
                  isActive ? "text-electric" : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_6px_rgba(0,191,255,0.6)]" : ""}`} />
                <span className="text-[10px] font-medium truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Drill Modal */}
      <DrillModalRedesigned
        isOpen={showDrillModal}
        onClose={() => setShowDrillModal(false)}
        assignment={selectedAssignment}
        drill={selectedAssignment ? getDrill(selectedAssignment.drillId) : undefined}
        onComplete={() => {
          setShowDrillModal(false);
          setShowCompletionModal(true);
        }}
        getDifficultyStyles={getDifficultyStyles}
      />

      {/* Completion Modal */}
      {selectedAssignment && (
        <CompletionModal
          isOpen={showCompletionModal}
          drillName={selectedAssignment.drillName}
          onClose={() => setShowCompletionModal(false)}
          onConfirm={() => {
            handleStatusUpdate(selectedAssignment.id, "completed");
            setShowCompletionModal(false);
            setShowDrillModal(false);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: Training
// ═══════════════════════════════════════════════════════════════
function TrainingTab({
  upNextDrill, pendingAssignments, completedAssignments, progressStats,
  favoriteIds, allDrills, getDrill, getDifficultyStyles, openDrillModal,
}: any) {
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const displayedCompleted = showAllCompleted ? completedAssignments : completedAssignments.slice(0, 5);

  return (
    <>
      {/* Coach-set plan context: weekly focus directive + active pathway link.
          Renders nothing if neither has been set yet. */}
      <MyPlanContextCard />

      {/* Assigned routines — structured sessions to follow step by step.
          Renders nothing if no routines are assigned. */}
      <MyRoutines />

      {/* Today's Reps Hero — the next drill to actually work on right now */}
      {upNextDrill ? (
        <div className="glass-card rounded-2xl overflow-hidden border-glow animate-fade-in-up">
          <div className="relative p-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-electric/20 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-electric rounded-full animate-pulse shadow-[0_0_10px_rgba(0,191,255,0.8)]" />
                <span className="text-sm font-medium text-electric uppercase tracking-wide">Today&apos;s Reps</span>
              </div>
              <h2 className="text-2xl font-bold mb-1 text-foreground">{upNextDrill.drillName}</h2>
              <p className="text-sm text-muted-foreground mb-3">Up next from your assigned plan</p>
              {(() => {
                const drill = getDrill(upNextDrill.drillId);
                return drill && (
                  <div className="flex items-center gap-3 mb-5 flex-wrap">
                    <Badge className="bg-white/10 text-foreground border border-white/20">
                      <Clock className="w-3 h-3 mr-1" />{drill.duration || "10 min"}
                    </Badge>
                    <Badge className={getDifficultyStyles(drill.difficulty)}>{drill.difficulty}</Badge>
                    {drill.categories[0] && (
                      <Badge className="bg-[#DC143C]/20 text-[#E8425A] border border-[#DC143C]/30">{drill.categories[0]}</Badge>
                    )}
                  </div>
                );
              })()}
              <Button onClick={() => openDrillModal(upNextDrill)} className="w-full btn-glow bg-electric hover:bg-electric/90 text-white font-bold py-6 text-lg">
                <Play className="w-5 h-5 mr-2" />Let's Go!
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-6 text-center border-glow animate-fade-in-up">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
            <Trophy className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-foreground">Plan Complete!</h2>
          <p className="text-muted-foreground">You&apos;ve finished this week&apos;s assigned work. Coach Steve will set your next focus soon.</p>
        </div>
      )}

      {/* Compact Progress Row */}
      <div className="glass-card rounded-2xl p-4 flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <CircularProgress percentage={progressStats.percentage} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="text-sm font-medium text-foreground">{progressStats.completed}/{progressStats.total} done</span>
          </div>

        </div>
      </div>

      {/* Assigned Drills */}
      {pendingAssignments.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground">Assigned Drills</h3>
            <Badge className="bg-electric/20 text-electric border border-electric/30">{pendingAssignments.length} remaining</Badge>
          </div>
          <div className="space-y-2">
            {pendingAssignments.map((assignment: any, index: number) => {
              const drill = getDrill(assignment.drillId);
              const isInProgress = assignment.status === "in-progress";
              return (
                <button
                  key={assignment.id}
                  onClick={() => openDrillModal(assignment)}
                  className="w-full glass-card rounded-xl p-4 card-hover flex items-center gap-4 text-left transition-all duration-300"
                >
                  <SkillIcon category={drill?.categories[0] || "General"} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground truncate">{assignment.drillName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {isInProgress && (
                        <Badge className="bg-electric/20 text-electric border border-electric/30 text-xs">In Progress</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{new Date(assignment.assignedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-electric/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Play className="w-5 h-5 text-electric ml-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Favorites */}
      {favoriteIds.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />My Favorites
            </h3>
            <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">{favoriteIds.length}</Badge>
          </div>
          <div className="space-y-2">
            {favoriteIds.map((drillId: number) => {
              let drill = allDrills.find((d: any) => d.id === drillId || d.id === String(drillId));
              if (!drill) drill = allDrills.find((d: any) => parseInt(d.id) === drillId);
              const drillName = drill?.name || `Drill #${drillId}`;
              const drillDifficulty = drill?.difficulty || "Medium";
              const drillCategory = drill?.categories?.[0] || "General";
              return (
                <Link key={drillId} href={`/drill/${drill?.id || drillId}`}>
                  <div className="w-full glass-card rounded-xl p-4 card-hover flex items-center gap-4 transition-all duration-300">
                    <SkillIcon category={drillCategory} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{drillName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${getDifficultyStyles(drillDifficulty)}`}>{drillDifficulty}</Badge>
                        <Badge className="bg-white/10 text-muted-foreground text-xs border border-white/10">{drillCategory}</Badge>
                      </div>
                    </div>
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed History */}
      {completedAssignments.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />Completed
            </h3>
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{completedAssignments.length}</Badge>
          </div>
          <div className="space-y-2">
            {displayedCompleted.map((assignment: any) => (
              <div key={assignment.id} className="glass rounded-xl p-4 flex items-center gap-4 opacity-70">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">{assignment.drillName}</h4>
                  <span className="text-xs text-muted-foreground">
                    Completed {assignment.completedAt ? new Date(assignment.completedAt).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {completedAssignments.length > 5 && (
            <button
              onClick={() => setShowAllCompleted(!showAllCompleted)}
              className="w-full mt-3 text-sm text-electric hover:underline flex items-center justify-center gap-1"
            >
              {showAllCompleted ? "Show less" : `Show all ${completedAssignments.length} completed`}
              <ChevronDown className={`w-4 h-4 transition-transform ${showAllCompleted ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2: Progress
// ═══════════════════════════════════════════════════════════════
function ProgressTab({ stats, completedCount }: { stats: any; completedCount: number }) {
  const { data: progressStats } = trpc.progress.stats.useQuery();
  const { data: weeklyActivity = [] } = trpc.progress.weeklyActivity.useQuery();

  const totalDrills = progressStats?.uniqueDrills ?? completedCount;
  const { current: tier, next: nextTier } = getTier(totalDrills);
  const tierProgress = nextTier ? Math.min(100, Math.round(((totalDrills - tier.min) / (nextTier.min - tier.min)) * 100)) : 100;

  const chartData = useMemo(() => {
    if (weeklyActivity.length === 0) {
      const data = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i * 7);
        data.push({ week: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count: 0 });
      }
      return data;
    }
    return weeklyActivity.map((w: any) => ({
      week: new Date(w.week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: w.count,
    }));
  }, [weeklyActivity]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Tier Card */}
      <div className="glass-card rounded-2xl p-6 border-glow">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center shadow-lg`}>
            <Medal className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className={`text-xl font-bold ${tier.text}`}>{tier.name}</h3>
            <p className="text-sm text-muted-foreground">{totalDrills} drills completed</p>
          </div>
        </div>
        {nextTier && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{tier.name}</span>
              <span>{nextTier.name} ({nextTier.min} drills)</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${tier.color} rounded-full transition-all duration-1000`}
                style={{ width: `${tierProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{nextTier.min - totalDrills} more to reach {nextTier.name}</p>
          </div>
        )}
        {!nextTier && (
          <p className="text-sm text-purple-400 font-medium">You've reached the highest tier!</p>
        )}
      </div>

      {/* Weekly Activity Chart */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-electric" />Weekly Activity
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15,15,20,0.95)', border: '1px solid rgba(0,191,255,0.2)', borderRadius: '12px', fontSize: '12px' }}
                labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                itemStyle={{ color: '#00BFFF' }}
              />
              <Bar dataKey="count" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00BFFF" />
                  <stop offset="100%" stopColor="#0066FF" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Drills Done", value: progressStats?.uniqueDrills ?? 0, icon: Target, color: "text-electric" },
          { label: "Sessions", value: progressStats?.totalSessions ?? 0, icon: Zap, color: "text-yellow-400" },
          { label: "This Week", value: progressStats?.thisWeek ?? 0, icon: BarChart3, color: "text-emerald-400" },
          { label: "Favorites", value: progressStats?.favoritesCount ?? 0, icon: Star, color: "text-yellow-400" },
          { label: "Submissions", value: progressStats?.submissionsCount ?? 0, icon: Upload, color: "text-purple-400" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="glass-card rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 3: Swing Lab
// ═══════════════════════════════════════════════════════════════
function SwingLabTab() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <VideoComparisonTool />
      <AthleteBlastMetrics />
    </div>
  );
}

// ── Side-by-side video comparison ────────────────────────────
function VideoComparisonTool() {
  const { data: submissions = [] } = trpc.submissions.drillSubmissions.getSubmissionsByUser.useQuery();
  const [videoA, setVideoA] = useState<string | null>(null);
  const [videoB, setVideoB] = useState<string | null>(null);

  const videoSubmissions = submissions.filter((s: any) => s.videoUrl);

  if (videoSubmissions.length < 2) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-bold text-foreground flex items-center gap-2 mb-3">
          <Video className="w-5 h-5 text-electric" />Side-by-Side Comparison
        </h3>
        <p className="text-sm text-muted-foreground">
          Upload at least 2 swing videos to compare your progress over time.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
        <Video className="w-5 h-5 text-electric" />Side-by-Side Comparison
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Video A (older)</label>
          <select
            value={videoA || ""}
            onChange={(e) => setVideoA(e.target.value || null)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground"
          >
            <option value="">Select video...</option>
            {videoSubmissions.map((s: any) => (
              <option key={s.id} value={s.videoUrl}>
                {s.drillName || "Swing"} — {new Date(s.submittedAt || s.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Video B (newer)</label>
          <select
            value={videoB || ""}
            onChange={(e) => setVideoB(e.target.value || null)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground"
          >
            <option value="">Select video...</option>
            {videoSubmissions.map((s: any) => (
              <option key={s.id} value={s.videoUrl}>
                {s.drillName || "Swing"} — {new Date(s.submittedAt || s.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>
      {videoA && videoB && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl overflow-hidden bg-black aspect-video">
            <video src={videoA} controls className="w-full h-full object-contain" />
          </div>
          <div className="rounded-xl overflow-hidden bg-black aspect-video">
            <video src={videoB} controls className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 4: Coach Notes
// ═══════════════════════════════════════════════════════════════
function CoachNotesTab() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <AthletePlayerReports />
    </div>
  );
}

