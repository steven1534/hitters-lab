import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CheckCircle, Clock, AlertCircle, Play, Home, LogOut, 
  MessageCircle, Star, Flame, Target, X, Trophy, FileText, ChevronDown, ChevronUp, Dumbbell, Coffee, Zap, User, Video, Upload
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo, useEffect, useRef } from "react";
import { getCategoryConfig } from "@/lib/categoryColors";
import { trpc } from "@/lib/trpc";
import { CompletionModal } from "@/components/CompletionModal";
import { DrillCoachFocus, DrillQuickNotes } from "@/components/DrillActionComponents";
import { AthletePortalSkeleton } from "@/components/Skeleton";
import { useAllDrills } from "@/hooks/useAllDrills";
import { AthleteVideoFeedback } from "@/components/AthleteVideoFeedback";
import { SwingAnalyzer } from "@/components/SwingAnalyzer";
import { DrillSubmissionForm } from "@/components/DrillSubmissionForm";
import { NotificationBell } from "@/components/NotificationBell";
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

// Circular Progress Component with glow effect
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

// Skill Icon Component with glow
function SkillIcon({ category }: { category: string }) {
  const config = getCategoryConfig(category);
  return (
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-electric/20 border border-electric/30`}>
      <Target className="w-6 h-6 text-electric" />
    </div>
  );
}

export default function AthletePortal() {
  useScrollRestoration();
  const { user, loading, logout } = useAuth();
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showDrillModal, setShowDrillModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Fetch user's assignments
  const { data: userAssignments = [], isLoading: assignmentsLoading } = trpc.drillAssignments.getUserAssignments.useQuery(
    undefined,
    { enabled: !!user?.id }
  );

  // Fetch user's streak
  const { data: streak = 0 } = trpc.drillAssignments.getStreak.useQuery(
    undefined,
    { enabled: !!user?.id }
  );

  // Fetch user's favorite drills
  const { data: favoritesData } = trpc.favorites.getAll.useQuery(
    undefined,
    { enabled: !!user?.id }
  );
  const favoriteIds = favoritesData?.drillIds || [];

  // Toggle favorite mutation
  const utils = trpc.useUtils();
  const toggleFavorite = trpc.favorites.toggle.useMutation({
    onSuccess: () => {
      utils.favorites.getAll.invalidate();
    },
  });

  // Update status mutation
  const updateStatusMutation = trpc.drillAssignments.updateStatus.useMutation({
    onSuccess: () => {
      utils.drillAssignments.getUserAssignments.invalidate();
    },
  });

  // Activity logging mutation
  const logActivityMutation = trpc.activity.logActivity.useMutation();
  const hasLoggedActivity = useRef(false);

  // Log portal login on mount — fire once when the user id is first known
  useEffect(() => {
    if (user?.id && !hasLoggedActivity.current) {
      hasLoggedActivity.current = true;
      logActivityMutation.mutate({ activityType: "portal_login" });
    }
    // logActivityMutation.mutate is stable; hasLoggedActivity is a ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Calculate progress stats
  const progressStats = useMemo(() => {
    const total = userAssignments.length;
    const completed = userAssignments.filter((a: any) => a.status === "completed").length;
    const inProgress = userAssignments.filter((a: any) => a.status === "in-progress").length;
    const assigned = userAssignments.filter((a: any) => a.status === "assigned").length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, assigned, streak, percentage };
  }, [userAssignments, streak]);

  // Get the most urgent drill
  const upNextDrill = useMemo(() => {
    const assignedDrills = userAssignments.filter((a: any) => a.status === "assigned");
    const inProgressDrills = userAssignments.filter((a: any) => a.status === "in-progress");
    return inProgressDrills[0] || assignedDrills[0] || null;
  }, [userAssignments]);

  // Get pending assignments
  const pendingAssignments = useMemo(() => {
    return userAssignments.filter((a: any) => a.status !== "completed");
  }, [userAssignments]);

  // Get completed assignments
  const completedAssignments = useMemo(() => {
    return userAssignments.filter((a: any) => a.status === "completed");
  }, [userAssignments]);

  // Get all drills including custom drills
  const allDrills = useAllDrills();

  // Get drill details
  const getDrill = (drillId: string): Drill | undefined => {
    return (allDrills as Drill[]).find(d => d.id === drillId);
  };

  // Handle status update
  const handleStatusUpdate = async (assignmentId: number, newStatus: "assigned" | "in-progress" | "completed") => {
    try {
      await updateStatusMutation.mutateAsync({ assignmentId, status: newStatus });
      if (selectedAssignment?.id === assignmentId) {
        setSelectedAssignment({ ...selectedAssignment, status: newStatus });
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  // Open drill modal
  const openDrillModal = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowDrillModal(true);
  };

  // Get difficulty styles
  const getDifficultyStyles = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy": return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      case "medium": return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
      case "hard": return "bg-rose-500/20 text-rose-400 border border-rose-500/30";
      default: return "bg-slate-500/20 text-slate-400 border border-slate-500/30";
    }
  };

  if (loading || assignmentsLoading) {
    return <AthletePortalSkeleton />;
  }

  if (!user) {
    return (
      <div className="coach-dark min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-electric/10 rounded-full blur-3xl" />
        <div className="glass-card max-w-md w-full p-8 rounded-2xl animate-fade-in-up">
          <div className="w-16 h-16 bg-electric/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-electric" />
          </div>
          <h2 className="text-xl font-bold text-center mb-2">Please Log In</h2>
          <p className="text-muted-foreground text-center mb-6">You need to be logged in to view your training.</p>
          <Link href="/">
            <Button variant="outline" className="w-full glass hover:bg-white/5">Back to Directory</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if user is an active athlete
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
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="coach-dark min-h-screen bg-background">
      {/* Header with glassmorphism */}
      <header className="glass sticky top-0 z-40 border-b border-white/10">
        <div className="flex items-center justify-between max-w-lg mx-auto px-4 py-3">
          <Link href="/">
            <button className="flex items-center gap-1 text-muted-foreground hover:text-electric text-sm transition-colors hover-lift">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Directory</span>
            </button>
          </Link>
          <h1 className="font-bold text-lg text-gradient">My Training</h1>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link href="/my-profile">
              <button className="flex items-center gap-1 text-muted-foreground hover:text-electric text-sm transition-colors hover-lift">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </button>
            </Link>
            <Link href="/athlete-messaging">
              <button className="flex items-center gap-1 text-muted-foreground hover:text-electric text-sm transition-colors hover-lift">
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Messages</span>
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Up Next Hero Card */}
        {upNextDrill ? (
          <div className="glass-card rounded-2xl overflow-hidden border-glow animate-fade-in-up">
            <div className="relative p-6">
              {/* Background glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-electric/20 rounded-full blur-3xl" />
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-electric rounded-full animate-pulse shadow-[0_0_10px_rgba(0,191,255,0.8)]" />
                  <span className="text-sm font-medium text-electric uppercase tracking-wide">Up Next</span>
                </div>
                
                <h2 className="text-2xl font-bold mb-3 text-foreground">{upNextDrill.drillName}</h2>
                
                {(() => {
                  const drill = getDrill(upNextDrill.drillId);
                  return drill && (
                    <div className="flex items-center gap-3 mb-5 flex-wrap">
                      <Badge className="bg-white/10 text-foreground border border-white/20">
                        <Clock className="w-3 h-3 mr-1" />
                        {drill.duration || "10 min"}
                      </Badge>
                      <Badge className={getDifficultyStyles(drill.difficulty)}>
                        {drill.difficulty}
                      </Badge>
                      {drill.categories[0] && (
                        <Badge className="bg-[#DC143C]/20 text-[#E8425A] border border-[#DC143C]/30">
                          {drill.categories[0]}
                        </Badge>
                      )}
                    </div>
                  );
                })()}

                <Button 
                  onClick={() => openDrillModal(upNextDrill)}
                  className="w-full btn-glow bg-electric hover:bg-electric/90 text-white font-bold py-6 text-lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Let's Go!
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-6 text-center border-glow animate-fade-in-up">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
              <Trophy className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-foreground">All Caught Up!</h2>
            <p className="text-muted-foreground">No pending drills. Check back soon for new assignments!</p>
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
            
            {/* Streak with glow */}
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="font-bold text-orange-400">{progressStats.streak}</span>
              <span className="text-sm text-orange-400">Day Streak</span>
              {progressStats.streak > 0 && <span className="text-lg">🔥</span>}
            </div>
          </div>
        </div>

        {/* Pending Drills Playlist */}
        {pendingAssignments.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground">Your Playlist</h3>
              <Badge className="bg-electric/20 text-electric border border-electric/30">
                {pendingAssignments.length} remaining
              </Badge>
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
                    style={{ animationDelay: `${0.3 + index * 0.05}s` }}
                  >
                    <SkillIcon category={drill?.categories[0] || "General"} />
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{assignment.drillName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {isInProgress && (
                          <Badge className="bg-electric/20 text-electric border border-electric/30 text-xs">
                            In Progress
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(assignment.assignedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-10 h-10 bg-electric/20 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-electric/30 transition-colors">
                      <Play className="w-5 h-5 text-electric ml-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* My Favorites Section */}
        {favoriteIds.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                My Favorites
              </h3>
              <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                {favoriteIds.length}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {favoriteIds.map((drillId: number) => {
                let drill = allDrills.find((d: any) => d.id === drillId || d.id === String(drillId));
                if (!drill) {
                  drill = allDrills.find((d: any) => parseInt(d.id) === drillId);
                }
                
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
                          <Badge className={`text-xs ${getDifficultyStyles(drillDifficulty)}`}>
                            {drillDifficulty}
                          </Badge>
                          <Badge className="bg-white/10 text-muted-foreground text-xs border border-white/10">
                            {drillCategory}
                          </Badge>
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

        {/* Session Notes from Coach */}
        <AthleteSessionNotes />

        {/* Player Reports from Coach */}
        <AthletePlayerReports />

        {/* Blast Motion Metrics */}
        <AthleteBlastMetrics />

        {/* Shared Practice Plans */}
        <SharedPracticePlans />

        {/* Completed Drills */}
        {completedAssignments.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Completed
              </h3>
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {completedAssignments.length}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {completedAssignments.slice(0, 3).map((assignment: any) => {
                return (
                  <div
                    key={assignment.id}
                    className="glass rounded-xl p-4 flex items-center gap-4 opacity-70"
                  >
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
                );
              })}
            </div>
          </div>
        )}

        {/* Swing Analyzer — standalone video upload */}
        <SwingAnalyzer />

        {/* Video Feedback from Coach */}
        <AthleteVideoFeedback />

        {/* Badges & Gamification */}
        <AthleteBadgesRedesigned />
      </main>

      {/* Redesigned Drill Modal */}
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

// ─── Shared Practice Plans Component ─────────────────────────────────────────

const BLOCK_TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  drill: { icon: Target, label: "Drill", color: "text-[#E8425A]", bg: "bg-[#DC143C]/10 border-[#DC143C]/20" },
  warmup: { icon: Zap, label: "Warm-Up", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  cooldown: { icon: Coffee, label: "Cool-Down", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  break: { icon: Coffee, label: "Break", color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/20" },
  custom: { icon: Dumbbell, label: "Custom", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
};

function SharedPracticePlans() {
  const { data: sharedPlans = [], isLoading } = trpc.practicePlans.getMySharedPlans.useQuery();
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);

  if (isLoading) return null;
  if (sharedPlans.length === 0) return null;

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#E8425A]" />
          Practice Plans
        </h3>
        <Badge className="bg-[#DC143C]/20 text-[#E8425A] border border-[#DC143C]/30">
          {sharedPlans.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {sharedPlans.map((plan: any) => {
          const isExpanded = expandedPlan === plan.id;
          const focusAreas = (plan.focusAreas as string[]) || [];
          const blocks = plan.blocks || [];
          let runningTime = 0;

          return (
            <div key={plan.id} className="bg-card/50 border border-border/50 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                className="w-full text-left p-4 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-lg bg-[#DC143C]/10 border border-[#DC143C]/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-[#E8425A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">{plan.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{plan.duration} min</span>
                    {plan.sessionDate && (
                      <span>{new Date(plan.sessionDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    )}
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
                  {focusAreas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {focusAreas.map((area) => (
                        <span key={area} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#DC143C]/10 text-[#E8425A]">{area}</span>
                      ))}
                    </div>
                  )}

                  {plan.sessionNotes && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground italic">{plan.sessionNotes}</p>
                    </div>
                  )}

                  {blocks.length > 0 && (
                    <div className="space-y-1.5">
                      {blocks.map((block: any, idx: number) => {
                        const startTime = runningTime;
                        runningTime += block.duration;
                        const config = BLOCK_TYPE_CONFIG[block.blockType] || BLOCK_TYPE_CONFIG.custom;
                        const Icon = config.icon;
                        return (
                          <div key={block.id || idx} className={`rounded-lg border p-3 ${config.bg}`}>
                            <div className="flex items-center gap-2">
                              <Icon className={`h-3.5 w-3.5 ${config.color} flex-shrink-0`} />
                              <span className="text-sm font-medium text-foreground flex-1 truncate">{block.title}</span>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{startTime}–{runningTime}m</span>
                            </div>
                            {(block.sets || block.reps) && (
                              <div className="flex gap-3 mt-1 ml-5.5 text-[10px] text-muted-foreground">
                                {block.sets && <span>{block.sets} sets</span>}
                                {block.reps && <span>{block.reps} reps</span>}
                              </div>
                            )}
                            {block.notes && <p className="text-[10px] text-muted-foreground mt-1 ml-5.5 italic">{block.notes}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <span className="text-xs text-muted-foreground">Total Duration</span>
                    <span className="text-sm font-bold text-foreground">{plan.duration} min</span>
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
