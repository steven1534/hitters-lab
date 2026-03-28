import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CheckCircle, Clock, Play, Home, LogOut,
  MessageCircle, Star, Flame, Target, Trophy, FileText,
  ChevronDown, ChevronUp, Dumbbell, Coffee, Zap, User, Video, Upload,
  ChevronRight, BarChart3, BookOpen, Mic2, TrendingUp, Award
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { getCategoryConfig } from "@/lib/categoryColors";
import { trpc } from "@/lib/trpc";
import { CompletionModal } from "@/components/CompletionModal";
import { DrillCoachFocus, DrillQuickNotes } from "@/components/DrillActionComponents";
import { AthletePortalSkeleton } from "@/components/Skeleton";
import { useAllDrills } from "@/hooks/useAllDrills";
import { AthleteVideoFeedback } from "@/components/AthleteVideoFeedback";
import { SwingAnalyzer } from "@/components/SwingAnalyzer";
import { DrillSubmissionForm } from "@/components/DrillSubmissionForm";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { AthleteSessionNotes } from "@/components/AthleteSessionNotes";
import { AthleteBlastMetrics } from "@/components/AthleteBlastMetrics";
import { AthletePlayerReports } from "@/components/AthletePlayerReports";
import { DrillModalRedesigned } from "@/components/DrillModalRedesigned";
import { AthleteBadgesRedesigned } from "@/components/AthleteBadgesRedesigned";

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

// ── Difficulty pill ───────────────────────────────────────────────────────────
function DifficultyPill({ difficulty }: { difficulty: string }) {
  const d = difficulty?.toLowerCase();
  const styles =
    d === "easy"   ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
    d === "hard"   ? "bg-red-50 text-red-700 border border-red-200" :
                     "bg-amber-50 text-amber-700 border border-amber-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles}`}>
      {difficulty}
    </span>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  if (status === "in-progress")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />In Progress</span>;
  if (status === "completed")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3" />Done</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"><Clock className="w-3 h-3" />Assigned</span>;
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, count, accent = false }: {
  icon: any; title: string; count?: number; accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent ? "bg-red-50" : "bg-slate-100"}`}>
          <Icon className={`w-4 h-4 ${accent ? "text-red-600" : "text-slate-600"}`} />
        </div>
        <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
      </div>
      {count !== undefined && (
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export default function AthletePortal() {
  useScrollRestoration();
  const { user, loading, logout } = useAuth();
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showDrillModal, setShowDrillModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const { data: userAssignments = [], isLoading: assignmentsLoading } = trpc.drillAssignments.getUserAssignments.useQuery(
    undefined, { enabled: !!user?.id }
  );
  const { data: streak = 0 } = trpc.drillAssignments.getStreak.useQuery(
    undefined, { enabled: !!user?.id }
  );
  const { data: favoritesData } = trpc.favorites.getAll.useQuery(
    undefined, { enabled: !!user?.id }
  );
  const favoriteIds = favoritesData?.drillIds || [];

  const utils = trpc.useUtils();
  const toggleFavorite = trpc.favorites.toggle.useMutation({
    onSuccess: () => utils.favorites.getAll.invalidate(),
  });
  const updateStatusMutation = trpc.drillAssignments.updateStatus.useMutation({
    onSuccess: () => utils.drillAssignments.getUserAssignments.invalidate(),
  });
  const logActivityMutation = trpc.activity.logActivity.useMutation();

  useEffect(() => {
    if (user?.id) logActivityMutation.mutate({ activityType: "portal_login" });
  }, [user?.id]);

  const progressStats = useMemo(() => {
    const total = userAssignments.length;
    const completed = userAssignments.filter((a: any) => a.status === "completed").length;
    const inProgress = userAssignments.filter((a: any) => a.status === "in-progress").length;
    const assigned = userAssignments.filter((a: any) => a.status === "assigned").length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, assigned, streak, percentage };
  }, [userAssignments, streak]);

  const upNextDrill = useMemo(() => {
    const inProgressDrills = userAssignments.filter((a: any) => a.status === "in-progress");
    const assignedDrills = userAssignments.filter((a: any) => a.status === "assigned");
    return inProgressDrills[0] || assignedDrills[0] || null;
  }, [userAssignments]);

  const pendingAssignments = useMemo(() =>
    userAssignments.filter((a: any) => a.status !== "completed"), [userAssignments]);

  const completedAssignments = useMemo(() =>
    userAssignments.filter((a: any) => a.status === "completed"), [userAssignments]);

  const allDrills = useAllDrills();

  const getDrill = (drillId: string): Drill | undefined =>
    (allDrills as Drill[]).find(d => d.id === drillId);

  const handleStatusUpdate = async (assignmentId: number, status: "assigned" | "in-progress" | "completed") => {
    await updateStatusMutation.mutateAsync({ assignmentId, status });
  };

  const openDrillModal = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowDrillModal(true);
  };

  if (loading || assignmentsLoading) return <AthletePortalSkeleton />;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-6 h-6 text-slate-500" />
          </div>
          <h2 className="font-bold text-slate-900 mb-1">Sign in required</h2>
          <p className="text-slate-500 text-sm mb-5">Please log in to access your training portal.</p>
          <Link href="/login">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white">Log In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const firstName = user.name?.split(" ")[0] || "Athlete";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/">
            <button className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm transition-colors">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Drills</span>
            </button>
          </Link>

          {/* Logo wordmark */}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-red-600 rounded-md flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">Hitters Lab</span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/athlete-messaging">
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
                <MessageCircle className="w-4 h-4" />
              </button>
            </Link>
            <button
              onClick={logout}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-10">

        {/* ── Greeting banner ── */}
        <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-5 text-white shadow-sm">
          <p className="text-red-200 text-sm font-medium mb-0.5">{greeting},</p>
          <h1 className="text-2xl font-bold tracking-tight">{firstName} 👋</h1>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-300" />
              <span className="text-sm font-semibold text-white">{progressStats.streak} day streak</span>
            </div>
            <div className="w-px h-4 bg-red-500" />
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-300" />
              <span className="text-sm font-semibold text-white">{progressStats.completed} completed</span>
            </div>
          </div>
        </div>

        {/* ── Progress card ── */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-900">Overall Progress</span>
              <span className="text-sm font-bold text-red-600">{progressStats.percentage}%</span>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-700"
                style={{ width: `${progressStats.percentage}%` }}
              />
            </div>
            {/* Stat pills row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Assigned", value: progressStats.assigned, color: "text-slate-700", bg: "bg-slate-50" },
                { label: "In Progress", value: progressStats.inProgress, color: "text-blue-700", bg: "bg-blue-50" },
                { label: "Done", value: progressStats.completed, color: "text-emerald-700", bg: "bg-emerald-50" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center`}>
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* ── Up Next hero card ── */}
        {upNextDrill ? (() => {
          const drill = getDrill(upNextDrill.drillId);
          return (
            <Card>
              <div className="p-1">
                {/* Top accent strip */}
                <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-xl p-4 mb-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">Up Next</span>
                  </div>
                  <h2 className="text-lg font-bold text-white leading-tight mb-3">
                    {upNextDrill.drillName}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {drill?.duration && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-medium">
                        <Clock className="w-3 h-3" />{drill.duration}
                      </span>
                    )}
                    {drill?.difficulty && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-medium capitalize">
                        {drill.difficulty}
                      </span>
                    )}
                    {drill?.categories?.[0] && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-medium">
                        {drill.categories[0]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4 pt-3">
                <Button
                  onClick={() => openDrillModal(upNextDrill)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-11 rounded-xl text-sm gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start Drill
                </Button>
              </div>
            </Card>
          );
        })() : (
          <Card>
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="font-bold text-slate-900 mb-1">All caught up!</h2>
              <p className="text-slate-500 text-sm">No pending drills. Check back for new assignments.</p>
            </div>
          </Card>
        )}

        {/* ── Pending drills playlist ── */}
        {pendingAssignments.length > 0 && (
          <Card>
            <div className="px-4 pt-4 pb-2">
              <SectionHeader icon={Target} title="Your Playlist" count={pendingAssignments.length} accent />
            </div>
            <div className="divide-y divide-slate-100">
              {pendingAssignments.map((assignment: any, index: number) => {
                const drill = getDrill(assignment.drillId);
                return (
                  <button
                    key={assignment.id}
                    onClick={() => openDrillModal(assignment)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group"
                  >
                    {/* Index number */}
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-500 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate leading-tight">
                        {assignment.drillName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <StatusPill status={assignment.status} />
                        {drill?.duration && (
                          <span className="text-xs text-slate-400 flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />{drill.duration}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-red-50 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Play className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-600 ml-0.5 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* ── Favorites ── */}
        {favoriteIds.length > 0 && (
          <Card>
            <div className="px-4 pt-4 pb-2">
              <SectionHeader icon={Star} title="Saved Drills" count={favoriteIds.length} />
            </div>
            <div className="divide-y divide-slate-100">
              {favoriteIds.map((drillId: number) => {
                let drill = allDrills.find((d: any) => d.id === drillId || d.id === String(drillId));
                if (!drill) drill = allDrills.find((d: any) => parseInt(d.id) === drillId);
                const drillName = drill?.name || `Drill #${drillId}`;
                const drillDifficulty = drill?.difficulty || "Medium";
                const drillCategory = drill?.categories?.[0] || "General";
                return (
                  <Link key={drillId} href={`/drill/${drill?.id || drillId}`}>
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Star className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{drillName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <DifficultyPill difficulty={drillDifficulty} />
                          <span className="text-xs text-slate-400">{drillCategory}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        )}

        {/* ── Session Notes ── */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-1 mb-1">
            <BookOpen className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From Coach</h3>
          </div>
          <AthleteSessionNotes />
        </div>

        {/* ── Player Reports ── */}
        <AthletePlayerReports />

        {/* ── Blast Metrics ── */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-1 mb-1">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Blast Metrics</h3>
          </div>
          <AthleteBlastMetrics />
        </div>

        {/* ── Practice Plans ── */}
        <SharedPracticePlans />

        {/* ── Completed drills ── */}
        {completedAssignments.length > 0 && (
          <Card>
            <div className="px-4 pt-4 pb-2">
              <SectionHeader icon={CheckCircle} title="Completed" count={completedAssignments.length} />
            </div>
            <div className="divide-y divide-slate-100">
              {completedAssignments.slice(0, 5).map((assignment: any) => (
                <div key={assignment.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{assignment.drillName}</p>
                    {assignment.completedAt && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(assignment.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">Done</span>
                </div>
              ))}
              {completedAssignments.length > 5 && (
                <div className="px-4 py-3 text-center text-xs text-slate-400">
                  +{completedAssignments.length - 5} more completed
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── Swing Analyzer ── */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-1 mb-1">
            <Video className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Swing Analyzer</h3>
          </div>
          <SwingAnalyzer />
        </div>

        {/* ── Video Feedback ── */}
        <AthleteVideoFeedback />

        {/* ── Badges ── */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-1 mb-1">
            <Award className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Achievements</h3>
          </div>
          <AthleteBadgesRedesigned />
        </div>

      </main>

      {/* ── Drill Modal ── */}
      <DrillModalRedesigned
        isOpen={showDrillModal}
        onClose={() => setShowDrillModal(false)}
        assignment={selectedAssignment}
        drill={selectedAssignment ? getDrill(selectedAssignment.drillId) : undefined}
        onComplete={() => {
          setShowDrillModal(false);
          setShowCompletionModal(true);
        }}
        getDifficultyStyles={(d: string) => {
          const dl = d?.toLowerCase();
          if (dl === "easy") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
          if (dl === "hard") return "bg-red-50 text-red-700 border border-red-200";
          return "bg-amber-50 text-amber-700 border border-amber-200";
        }}
      />

      {/* ── Completion Modal ── */}
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

// ─── Shared Practice Plans ────────────────────────────────────────────────────

const BLOCK_TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  drill:    { icon: Target,   label: "Drill",     color: "text-red-600",    bg: "bg-red-50 border-red-100" },
  warmup:   { icon: Zap,      label: "Warm-Up",   color: "text-amber-600",  bg: "bg-amber-50 border-amber-100" },
  cooldown: { icon: Coffee,   label: "Cool-Down", color: "text-emerald-600",bg: "bg-emerald-50 border-emerald-100" },
  break:    { icon: Coffee,   label: "Break",     color: "text-slate-500",  bg: "bg-slate-50 border-slate-200" },
  custom:   { icon: Dumbbell, label: "Custom",    color: "text-purple-600", bg: "bg-purple-50 border-purple-100" },
};

function SharedPracticePlans() {
  const { data: sharedPlans = [], isLoading } = trpc.practicePlans.getMySharedPlans.useQuery();
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);

  if (isLoading || sharedPlans.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 px-1 mb-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Practice Plans</h3>
        <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{sharedPlans.length}</span>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {sharedPlans.map((plan: any) => {
          const isExpanded = expandedPlan === plan.id;
          const focusAreas = (plan.focusAreas as string[]) || [];
          const blocks = plan.blocks || [];
          let runningTime = 0;

          return (
            <div key={plan.id}>
              <button
                onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{plan.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{plan.duration} min</span>
                    {plan.sessionDate && (
                      <span>{new Date(plan.sessionDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    )}
                  </div>
                </div>
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 bg-slate-50 border-t border-slate-100">
                  {focusAreas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-3">
                      {focusAreas.map((area) => (
                        <span key={area} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">{area}</span>
                      ))}
                    </div>
                  )}
                  {plan.sessionNotes && (
                    <div className="bg-white rounded-xl p-3 border border-slate-200">
                      <p className="text-xs text-slate-600 italic leading-relaxed">{plan.sessionNotes}</p>
                    </div>
                  )}
                  {blocks.length > 0 && (
                    <div className="space-y-2">
                      {blocks.map((block: any, idx: number) => {
                        const startTime = runningTime;
                        runningTime += block.duration;
                        const config = BLOCK_TYPE_CONFIG[block.blockType] || BLOCK_TYPE_CONFIG.custom;
                        const Icon = config.icon;
                        return (
                          <div key={block.id || idx} className={`rounded-xl border p-3 ${config.bg} bg-white`}>
                            <div className="flex items-center gap-2">
                              <Icon className={`w-3.5 h-3.5 ${config.color} flex-shrink-0`} />
                              <span className="text-sm font-medium text-slate-900 flex-1 truncate">{block.title}</span>
                              <span className="text-xs text-slate-400 whitespace-nowrap font-mono">{startTime}–{runningTime}m</span>
                            </div>
                            {(block.sets || block.reps) && (
                              <div className="flex gap-3 mt-1.5 ml-5 text-xs text-slate-500">
                                {block.sets && <span>{block.sets} sets</span>}
                                {block.reps && <span>{block.reps} reps</span>}
                              </div>
                            )}
                            {block.notes && (
                              <p className="text-xs text-slate-400 mt-1 ml-5 italic">{block.notes}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="text-xs text-slate-500">Total</span>
                    <span className="text-sm font-bold text-slate-900">{plan.duration} min</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
