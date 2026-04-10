import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Users, Dumbbell, Target, ExternalLink, Lock, LogIn, ChevronDown, AlertCircle, TrendingUp, Lightbulb, Star, AlertTriangle, Eye, MessageSquare } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { getDrillLevelLabel } from "@/data/drills";
import { getLoginUrl, PREVIEW_MODE } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useRoute, useSearch } from "wouter";
import { useState, useMemo, useEffect } from "react";
import drillsData from "@/data/drills";
import { mergeDrillWithCatalogOverride, type MergeableDrill } from "@shared/drillCatalogMerge";
import { filterOptions } from "@/data/drills";
import { VideoPlayer } from "@/components/VideoPlayer";
import { EditDrillDetailsModal } from "@/components/EditDrillDetailsModal";
import { TiptapEditor, TiptapRenderer } from "@/components/TiptapEditor";
import { EditableStatBar, type StatCard } from "@/components/EditableStatBar";
import { trpc } from "@/lib/trpc";
import { Edit, Trash2, Pencil, Check, X } from "lucide-react";
import { DrillQAForm } from "@/components/DrillQAForm";
import { DrillPageBuilderNotion } from "@/components/DrillPageBuilderNotion";
import { CustomDrillLayout } from "@/components/CustomDrillLayout";
import { Layout } from "lucide-react";
import { usePreviewLimit, MAX_FREE_PREVIEWS } from "@/hooks/usePreviewLimit";
import { DrillPreviewWall } from "@/components/DrillPreviewWall";
import { InlineEdit } from "@/components/InlineEdit";

// Collapsible section component
function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: { title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors font-semibold text-left"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-secondary" />
          {title}
        </div>
        <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-4 bg-background border-t">
          {children}
        </div>
      )}
    </div>
  );
}


// Legacy hardcoded drillDetails object removed.
// All drill content now comes from Manus data (staticDrill enriched fields) + DB overrides.

export default function DrillDetail() {
  const { user, loading } = useAuth();
  const [match, params] = useRoute("/drill/:id");
  const id = params?.id;
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'coaching' | 'notes' | 'submit'>('overview');

  // Free preview tracking for unauthenticated visitors
  const { viewCount, isLimitReached, recordView } = usePreviewLimit();

  // Preserve query params for back navigation to drill list
  // wouter's useSearch() strips the '?' prefix, returning e.g. 'page=2&category=Hitting'
  const searchString = useSearch();
  const backHref = searchString ? `/?${searchString}` : '/';
  
  // Fetch custom drills from database
  const { data: customDrills = [] } = trpc.drillDetails.getCustomDrills.useQuery();
  const { data: catalogOverrides = [] } = trpc.drillCatalog.getAll.useQuery();
  
  // Look for drill in static data first, then in custom drills
  const staticDrill = drillsData.find(d => d.id.toString() === id);
  const customDrill = customDrills.find((cd: any) => cd.drillId === id);
  
  // Unified drill + Phase 1 catalog overrides (same drillId; hidden â†’ not found)
  const drill = useMemo(() => {
    if (!id) return null;
    let base: MergeableDrill | null = null;
    if (staticDrill) {
      base = {
        id: String(staticDrill.id),
        name: staticDrill.name,
        difficulty: staticDrill.difficulty,
        categories: staticDrill.categories,
        duration: staticDrill.duration,
        url: staticDrill.url,
        is_direct_link: staticDrill.is_direct_link,
        isCustom: false,
        ageLevel: staticDrill.ageLevel,
        tags: staticDrill.tags,
        problem: staticDrill.problem,
        goal: staticDrill.goal,
        drillType: staticDrill.drillType,
        purpose: staticDrill.purpose,
        bestFor: staticDrill.bestFor,
        equipment: staticDrill.equipment,
        athletes: staticDrill.athletes,
        description: staticDrill.description,
        videoUrl: staticDrill.videoUrl,
        whatThisFixes: staticDrill.whatThisFixes,
        whatToFeel: staticDrill.whatToFeel,
        commonMistakes: staticDrill.commonMistakes,
        coachCue: staticDrill.coachCue,
        watchFor: staticDrill.watchFor,
        nextSteps: staticDrill.nextSteps,
        howToDoIt: staticDrill.howToDoIt,
        foundationOrAdvanced: staticDrill.foundationOrAdvanced,
      };
    } else if (customDrill) {
      const cd = customDrill as typeof customDrill & { drillType?: string };
      base = {
        id: customDrill.drillId,
        name: customDrill.name,
        difficulty: customDrill.difficulty,
        categories: [customDrill.category],
        duration: customDrill.duration,
        url: `/drill/${customDrill.drillId}`,
        is_direct_link: true,
        isCustom: true,
        ageLevel: [],
        tags: [],
        problem: [],
        goal: [],
        drillType: cd.drillType || "Game Simulation",
      };
    }
    if (!base) return null;
    const ov = catalogOverrides.find((o) => o.drillId === id);
    return mergeDrillWithCatalogOverride(base, ov, { skipHiddenCheck: true });
  }, [id, staticDrill, customDrill, catalogOverrides]);
  
  // Try to load from database first, fallback to hardcoded details
  const { data: dbDetails } = trpc.drillDetails.getDrillDetail.useQuery(
    { drillId: id || '' },
    { enabled: !!id }
  );
  
  // DB details (coach-edited) override Manus static data
  const details = dbDetails || (drill ? {
    skillSet: (drill as any).skillSet || drill.categories?.[0] || 'Hitting',
    difficulty: drill.difficulty,
    athletes: (drill as any).athletes || '',
    time: drill.duration,
    equipment: (drill as any).equipment || '',
    goal: (drill as any).purpose || '',
    description: (drill as any).description || [],
    videoUrl: (drill as any).videoUrl || drill.url || null,
  } : null);
  
  const [savedVideos, setSavedVideos] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [customInstructions, setCustomInstructions] = useState('');
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  const [showPageBuilder, setShowPageBuilder] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editGoalText, setEditGoalText] = useState('');
  const [showLogDrill, setShowLogDrill] = useState(false);
  const [logNotes, setLogNotes] = useState('');
  const [logRating, setLogRating] = useState(0);
  
  // Load video from database
  const { data: videoData } = trpc.videos.getVideo.useQuery(
    { drillId: id || '' },
    { enabled: !!id }
  );
  
  // Load instructions from database
  const { data: drillDetailData } = trpc.drillDetails.getDrillDetail.useQuery(
    { drillId: id || '' },
    { enabled: !!id }
  );
  
  // Load custom page layout
  const { data: pageLayout } = trpc.drillDetails.getPageLayout.useQuery(
    { drillId: id || '' },
    { enabled: !!id }
  );
  
  useEffect(() => {
    if (videoData) {
      setSavedVideos({ [videoData.drillId]: videoData.videoUrl });
    }
  }, [videoData]);
  
  useEffect(() => {
    if (drillDetailData?.instructions) {
      setCustomInstructions(drillDetailData.instructions);
    }
  }, [drillDetailData]);

  // Favorites functionality
  const { data: favoritesData } = trpc.favorites.getAll.useQuery(undefined, {
    enabled: !!user?.id
  });
  const toggleFavoriteMutation = trpc.favorites.toggle.useMutation({
    onSuccess: () => {
      trpcUtils.favorites.getAll.invalidate();
    }
  });
  const trpcUtils = trpc.useUtils();
  
  // Check if current drill is favorited
  const isFavorited = useMemo(() => {
    if (!favoritesData?.drillIds || !id) return false;
    const numericId = parseInt(id);
    return favoritesData.drillIds.includes(numericId) || favoritesData.drillIds.includes(id as any);
  }, [favoritesData?.drillIds, id]);
  
  const handleToggleFavorite = () => {
    if (!id) return;
    const numericId = parseInt(id) || 0;
    toggleFavoriteMutation.mutate({ drillId: numericId });
  };

  // Activity logging mutation
  const logActivityMutation = trpc.activity.logActivity.useMutation();

  const logProgressMutation = trpc.progress.log.useMutation({
    onSuccess: () => {
      setShowLogDrill(false);
      setLogNotes('');
      setLogRating(0);
    },
  });

  const handleLogDrill = () => {
    if (!id) return;
    logProgressMutation.mutate({
      drillId: id,
      notes: logNotes || undefined,
      rating: logRating > 0 ? logRating : undefined,
    });
  };

  // Track scroll for sticky header
  useEffect(() => {
    const handleScroll = () => setHeaderScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Log drill view when athlete views the page
  useEffect(() => {
    if (user?.id && user?.role === 'athlete' && drill && id) {
      logActivityMutation.mutate({
        activityType: "drill_view",
        relatedId: id,
        relatedType: "drill",
        metadata: { drillName: drill.name }
      });
    }
  }, [user?.id, user?.role, id, drill?.name]);

  // Save custom instructions
  const saveInstructionsMutation = trpc.drillDetails.saveDrillInstructions.useMutation();
  
  const saveCustomInstructions = async () => {
    if (!id || !customInstructions.trim()) return;
    try {
      await saveInstructionsMutation.mutateAsync({
        drillId: id,
        instructions: customInstructions
      });
    } catch (error) {
      console.error('Failed to save instructions:', error);
    }
  };

  // Save goal inline
  const saveGoalMutation = trpc.drillDetails.saveDrillInstructions.useMutation({
    onSuccess: () => {
      trpcUtils.drillDetails.getDrillDetail.invalidate({ drillId: id || '' });
    }
  });

  const handleStartEditGoal = () => {
    const goalText = details && typeof details === 'object' && 'goal' in details ? details.goal : '';
    setEditGoalText(goalText || '');
    setIsEditingGoal(true);
  };

  const handleSaveGoal = async () => {
    if (!id) return;
    try {
      await saveGoalMutation.mutateAsync({
        drillId: id,
        goal: editGoalText,
      });
      setIsEditingGoal(false);
    } catch (error) {
      console.error('Failed to save goal:', error);
    }
  };

  const handleCancelEditGoal = () => {
    setIsEditingGoal(false);
    setEditGoalText('');
  };

  // All logged-in users have full access â€” no isActiveClient gate
  const hasAccess = !!user;

  const isAnonymous = !user && !loading;

  // Track anonymous views. After MAX_FREE_PREVIEWS, show login prompt (not redirect).
  useEffect(() => {
    if (isAnonymous && id && drill && !isLimitReached) {
      recordView();
    }
  }, [isAnonymous, id, drill?.name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-[#DC143C]/30 border-t-[#DC143C] animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading drill...</p>
        </div>
      </div>
    );
  }

  if (!drill) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-heading font-bold">Drill not found</h2>
          <p className="text-muted-foreground">The drill you're looking for doesn't exist or has been removed.</p>
          <Link href={backHref}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Directory
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const hasCoachingContent = !!(
    (drill as any)?.whatThisFixes?.length ||
    (drill as any)?.whatToFeel?.length ||
    (drill as any)?.coachCue ||
    (drill as any)?.commonMistakes?.length ||
    (drill as any)?.watchFor ||
    (drill as any)?.nextSteps?.length
  );

  const DETAIL_TABS = [
    { key: 'overview' as const, label: 'Overview', icon: Lightbulb },
    { key: 'coaching' as const, label: 'Coaching', icon: TrendingUp },
    { key: 'notes' as const, label: 'My Notes', icon: MessageSquare },
    { key: 'submit' as const, label: 'Submit Work', icon: Target },
  ];

  return (
    <div className="film-room min-h-screen bg-background pb-24 md:pb-12">
      <SiteNav />

      {/* Sticky mini-header â€” appears on mobile scroll */}
      <div className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 md:hidden ${
        headerScrolled ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      } bg-background/95 backdrop-blur-md border-b border-border/20`}>
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={backHref}>
            <button className="p-2 -ml-1 rounded-lg hover:bg-accent active:scale-95 transition-all">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <span className="font-heading font-bold text-sm truncate flex-1">{drill?.name || 'Drill'}</span>
          {user && (
            <button
              onClick={handleToggleFavorite}
              disabled={toggleFavoriteMutation.isPending}
              className={`p-2 rounded-lg transition-all active:scale-95 ${
                isFavorited ? 'text-amber-400 bg-amber-500/10' : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Star className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Login prompt overlay â€” shown after 2 free views for anonymous users */}
      {isAnonymous && isLimitReached && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#0f0f13] border border-white/[0.12] rounded-2xl p-8 max-w-md w-full text-center shadow-2xl space-y-5">
            <div className="h-16 w-16 rounded-full bg-[#DC143C]/10 border border-[#DC143C]/20 flex items-center justify-center mx-auto">
              <Lock className="h-8 w-8 text-[#DC143C]" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Free Preview Limit Reached</h2>
              <p className="text-white/50 text-sm leading-relaxed">
                You've viewed your 2 free drills. Log in to access all 200+ professional training drills.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <a href={getLoginUrl()} className="w-full">
                <Button size="lg" className="w-full bg-[#DC143C] hover:bg-[#DC143C]/90 text-white font-semibold gap-2">
                  <LogIn className="h-5 w-5" />
                  Log In
                </Button>
              </a>
              <Link href={backHref}>
                <Button variant="ghost" className="w-full text-white/40 hover:text-white/70">
                  Back to Directory
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Header â€” always rendered (blurred behind modal when limit reached) */}
      <>
      <header className="relative overflow-hidden mb-0 md:mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.18_0.01_25)] via-[oklch(0.15_0.005_0)] to-[oklch(0.12_0.01_20)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.45_0.15_250/0.15),transparent_60%)]" />
        <div className="container relative z-10 pt-4 pb-6 md:py-10">
          <Link href={backHref}>
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 mb-3 md:mb-4 pl-0 gap-2 text-sm h-9">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Directory</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
            <div className="flex-1 w-full min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <Badge className={`font-bold text-[10px] px-2.5 py-0.5 ${
                  drill.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                  drill.difficulty === 'Medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  'bg-red-500/20 text-red-400 border-red-500/30'
                }`} variant="outline">
                  {drill.difficulty}
                </Badge>
                {drill.categories.map(cat => (
                  <Badge key={cat} variant="outline" className="bg-white/[0.06] text-white/70 border-white/[0.1] font-medium text-[10px] px-2.5 py-0.5">
                    {cat}
                  </Badge>
                ))}
              </div>
              <InlineEdit contentKey={`drill.detail.${id}.title`} defaultValue={drill.name} as="h1" className="text-2xl sm:text-3xl md:text-5xl font-heading font-black text-white leading-tight tracking-tight" />
            </div>

            {/* Desktop action buttons only â€” mobile uses bottom bar */}
            <div className="hidden md:flex gap-2">
              {user && (
                <Button
                  onClick={handleToggleFavorite}
                  disabled={toggleFavoriteMutation.isPending}
                  variant="outline"
                  className={`gap-2 ${
                    isFavorited
                      ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/30"
                      : "bg-white/[0.06] hover:bg-white/[0.12] text-white/80 border-white/[0.12]"
                  }`}
                >
                  <Star className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
                  {isFavorited ? "Favorited" : "Favorite"}
                </Button>
              )}

              {!details && !customDrill && (
                <a href={drill.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="bg-white/[0.06] hover:bg-white/[0.12] text-white/80 border-white/[0.12] gap-2">
                    View on USA Baseball
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="border-b border-film-border bg-canvas/50">
        <div className="container max-w-4xl flex gap-1 px-4 md:px-4">
          {DETAIL_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setDetailTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-3 font-heading text-[0.65rem] font-semibold uppercase tracking-[0.1em] transition-colors border-b-2 ${
                  detailTab === tab.key
                    ? "border-gold text-gold"
                    : "border-transparent text-film-muted hover:text-film-fg"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="container max-w-4xl px-0 md:px-4">
        {/* Coaching tab â€” Manus-style coaching sections */}
        {detailTab === 'coaching' && (
          <div className="grid gap-5 py-6 px-4 md:px-0">
            {hasCoachingContent ? (
              <>
                {((drill as any)?.whatThisFixes?.length ?? 0) > 0 && (
                  <div className="rounded-[2px] border border-film-border bg-surface p-5">
                    <h3 className="mb-3 font-heading text-[0.7rem] font-bold uppercase tracking-[0.12em] text-advanced">
                      What This Drill Helps Fix
                    </h3>
                    <ul className="space-y-2">
                      {((drill as any).whatThisFixes as string[]).map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-[0.8rem] text-film-fg">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-film-muted" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {((drill as any)?.whatToFeel?.length ?? 0) > 0 && (
                  <div className="rounded-[2px] border border-film-border bg-surface p-5">
                    <h3 className="mb-3 font-heading text-[0.7rem] font-bold uppercase tracking-[0.12em] text-teal">
                      What to Feel
                    </h3>
                    <ul className="space-y-2">
                      {((drill as any).whatToFeel as string[]).map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-[0.8rem] text-film-fg">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(drill as any)?.coachCue && (
                  <div className="rounded-[2px] border-l-[3px] border-l-gold border border-film-border bg-surface-raised p-5">
                    <h3 className="mb-2 font-heading text-[0.65rem] font-bold uppercase tracking-[0.12em] text-gold">
                      Coach Cue
                    </h3>
                    <p className="text-[0.9rem] font-medium italic text-film-fg">
                      &ldquo;{(drill as any).coachCue}&rdquo;
                    </p>
                  </div>
                )}

                {((drill as any)?.commonMistakes?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="mb-3 font-heading text-[0.7rem] font-bold uppercase tracking-[0.12em] text-advanced">
                      Common Mistakes
                    </h3>
                    <ul className="space-y-2">
                      {((drill as any).commonMistakes as string[]).map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-[0.8rem] text-film-fg">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-advanced" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(drill as any)?.watchFor && (
                  <div className="rounded-[2px] border border-film-border bg-surface p-5">
                    <h3 className="mb-2 flex items-center gap-1.5 font-heading text-[0.65rem] font-bold uppercase tracking-[0.12em] text-film-muted">
                      <Eye className="h-3.5 w-3.5" /> Watch For
                    </h3>
                    <p className="text-[0.8rem] leading-relaxed text-film-fg">
                      {(drill as any).watchFor}
                    </p>
                  </div>
                )}

                {((drill as any)?.nextSteps?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="mb-3 font-heading text-[0.7rem] font-bold uppercase tracking-[0.12em] text-teal">
                      Next Steps &mdash; Build on This Drill
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {((drill as any).nextSteps as string[]).map((stepId: string) => (
                        <Link key={stepId} href={`/drill/${stepId}`}>
                          <span className="inline-flex items-center gap-1 rounded-[2px] border border-film-border bg-surface px-3 py-1.5 text-[0.72rem] text-teal transition-colors hover:border-teal/30 hover:bg-surface-raised cursor-pointer">
                            &rarr; {stepId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center">
                <TrendingUp className="mx-auto mb-3 h-8 w-8 text-film-muted" />
                <h3 className="font-heading text-lg font-bold text-film-fg">Coaching Content Coming Soon</h3>
                <p className="mt-1 max-w-sm mx-auto text-[0.8rem] text-film-muted">
                  Detailed coaching cues, common mistakes, and progression steps will be added for this drill.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Notes tab */}
        {detailTab === 'notes' && (
          <div className="py-6 px-4 md:px-0">
            <div className="rounded-[2px] border border-film-border bg-surface p-5">
              {user && (user.role === 'admin' || user.role === 'coach') ? (
                <TiptapEditor
                  value={customInstructions}
                  onChange={setCustomInstructions}
                  onSave={saveCustomInstructions}
                  isSaving={saveInstructionsMutation.isPending}
                  placeholder="Write your personal notes for this drill..."
                />
              ) : customInstructions ? (
                <TiptapRenderer content={customInstructions} />
              ) : (
                <p className="text-film-muted italic text-[0.8rem]">No notes yet. Log in as a coach to add notes.</p>
              )}
            </div>
          </div>
        )}

        {/* Submit Work tab */}
        {detailTab === 'submit' && (
          <div className="py-6 px-4 md:px-0">
            {user?.role === 'athlete' ? (
              <DrillQAForm drillId={id || ''} drillName={drill?.name || ''} />
            ) : (
              <div className="py-12 text-center">
                <Target className="mx-auto mb-3 h-8 w-8 text-film-muted" />
                <h3 className="font-heading text-lg font-bold text-film-fg">Submit Your Work</h3>
                <p className="mt-1 max-w-sm mx-auto text-[0.8rem] text-film-muted">
                  {user ? "This section is available for athletes to submit drill work for coach review." : "Log in as an athlete to submit your drill work for review."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Overview tab â€” existing content */}
        {detailTab === 'overview' && <>
        {/* Check if custom page layout exists - if so, render ONLY that */}
        {pageLayout?.blocks && Array.isArray(pageLayout.blocks) && pageLayout.blocks.length > 0 ? (
          <div className="grid gap-6 md:gap-8">
            {/* Admin/Coach edit buttons */}
            {user && (user.role === 'admin' || user.role === 'coach') && (
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowPageBuilder(true)}
                  className="flex items-center gap-1 px-3 py-2 rounded-md bg-secondary/10 hover:bg-secondary/20 text-secondary transition-colors text-sm font-medium"
                >
                  <Layout className="h-4 w-4" />
                  Edit Page
                </button>
              </div>
            )}
            {/* Render the custom page layout */}
            <CustomDrillLayout blocks={pageLayout.blocks as any[]} />

            {/* Editable Stat Cards Bar - shown on custom layouts too */}
            {details && (
              <EditableStatBar
                drillId={id || "unknown"}
                isCoach={!!(user && (user.role === 'admin' || user.role === 'coach'))}
                defaultCards={[
                  { id: `${id}-time`, label: "Time", value: details.time, icon: "clock" },
                  { id: `${id}-athletes`, label: "Athletes", value: details.athletes.split(',')[0], icon: "users" },
                  { id: `${id}-equipment`, label: "Equipment", value: details.equipment.split(',')[0], icon: "dumbbell" },
                  { id: `${id}-skill`, label: "Skill Set", value: details.skillSet, icon: "target" },
                ]}
              />
            )}

            {/* Instructions Editor - shown on custom layouts too */}
            <section>
              <h2 className="text-2xl md:text-3xl font-heading font-black mb-3 md:mb-4 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                  <Target className="h-4 w-4 text-green-400" />
                </div>
                <InlineEdit contentKey={`drill.detail.${id}.instructionsHeading`} defaultValue="Instructions" as="span" />
              </h2>
              <div className="glass-card rounded-xl p-4 md:p-6">
                {user && (user.role === 'admin' || user.role === 'coach') ? (
                  <TiptapEditor
                    value={customInstructions}
                    onChange={setCustomInstructions}
                    onSave={saveCustomInstructions}
                    isSaving={saveInstructionsMutation.isPending}
                    placeholder="Write drill instructions here..."
                  />
                ) : (
                  <div className="min-h-[60px]">
                    {customInstructions ? (
                      <TiptapRenderer content={customInstructions} />
                    ) : (
                      <p className="text-muted-foreground italic">No instructions provided for this drill yet.</p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Q&A Section for Athletes - also show on custom layouts */}
            {user?.role === 'athlete' && (
              <DrillQAForm drillId={id || ''} drillName={drill?.name || ''} />
            )}
          </div>
        ) : details ? (
          <div className="grid gap-6 md:gap-8">
            {/* Video Section - Full bleed on mobile */}
            <div className="md:rounded-xl overflow-hidden">
              {(savedVideos[drill.id] || (details && 'videoUrl' in details && details.videoUrl)) ? (
                <VideoPlayer videoUrl={(savedVideos[drill.id] || (details && 'videoUrl' in details && details.videoUrl)) as string} title={`${drill.name} Video`} />
              ) : (
                <div className="bg-muted aspect-video flex items-center justify-center border-y border-dashed border-muted-foreground/20 md:border md:rounded-xl w-full">
                  <div className="text-center p-4">
                    <p className="text-muted-foreground font-medium text-sm">No video available</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">Video will appear here when added</p>
                  </div>
                </div>
              )}
            </div>

            {/* Coaching Cues - Above the Fold */}
            <div className="glass-card rounded-none md:rounded-xl border-l-4 border-l-[#DC143C] overflow-hidden">
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="flex items-center gap-2 text-xl md:text-2xl font-heading font-black">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#DC143C]/20 to-[#DC143C]/20 flex items-center justify-center">
                      <Lightbulb className="h-4 w-4 text-[#E8425A]" />
                    </div>
                    <InlineEdit contentKey={`drill.detail.${id}.goalHeading`} defaultValue="Goal of Drill" as="span" />
                  </h3>
                  {user && (user.role === 'admin' || user.role === 'coach') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPageBuilder(true)}
                        className="flex items-center gap-1 px-3 py-2 rounded-md bg-secondary/10 hover:bg-secondary/20 text-secondary transition-colors text-sm font-medium"
                      >
                        <Layout className="h-4 w-4" />
                        Page Builder
                      </button>
                      <button
                        onClick={() => setEditModalOpen(true)}
                        className="flex items-center gap-1 px-3 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-sm font-medium"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-1 px-3 py-2 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors text-sm font-medium"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                {isEditingGoal ? (
                  <div className="space-y-3">
                    <textarea
                      value={editGoalText}
                      onChange={(e) => setEditGoalText(e.target.value)}
                      className="w-full min-h-[80px] p-3 rounded-lg bg-background/80 border border-border text-base md:text-lg font-medium text-foreground/90 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[#DC143C]/50 focus:border-[#DC143C]"
                      placeholder="Enter the goal of this drill..."
                      autoFocus
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={handleCancelEditGoal}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors text-sm font-medium"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveGoal}
                        disabled={saveGoalMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#DC143C] hover:bg-[#DC143C]/90 text-white transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {saveGoalMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group/goal relative">
                    <p className="text-base md:text-lg font-medium text-foreground/90 leading-relaxed pr-8">{details.goal}</p>
                    {user && (user.role === 'admin' || user.role === 'coach') && (
                      <button
                        onClick={handleStartEditGoal}
                        className="absolute top-0 right-0 p-1.5 rounded-md opacity-0 group-hover/goal:opacity-100 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all"
                        title="Edit goal"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Editable Stat Cards Bar */}
            <EditableStatBar
              drillId={id || "unknown"}
              isCoach={!!(user && (user.role === 'admin' || user.role === 'coach'))}
              defaultCards={[
                { id: `${id}-time`, label: "Time", value: details.time, icon: "clock" },
                { id: `${id}-athletes`, label: "Athletes", value: details.athletes.split(',')[0], icon: "users" },
                { id: `${id}-equipment`, label: "Equipment", value: details.equipment.split(',')[0], icon: "dumbbell" },
                { id: `${id}-skill`, label: "Skill Set", value: details.skillSet, icon: "target" },
              ]}
            />

            {/* Custom Instructions */}
            <section className="px-4 md:px-0">
              <h2 className="text-2xl md:text-3xl font-heading font-black mb-3 md:mb-4 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                  <Target className="h-4 w-4 text-green-400" />
                </div>
                <InlineEdit contentKey={`drill.detail.${id}.instructionsHeading`} defaultValue="Instructions" as="span" />
              </h2>
              <div className="glass-card rounded-xl p-4 md:p-6">
                {user && (user.role === 'admin' || user.role === 'coach') ? (
                  <TiptapEditor
                    value={customInstructions}
                    onChange={setCustomInstructions}
                    onSave={saveCustomInstructions}
                    isSaving={saveInstructionsMutation.isPending}
                    placeholder="Write drill instructions here... Use the toolbar for bold, headings, lists, and more. Toggle &lt;/&gt; to paste raw HTML."
                  />
                ) : (
                  <div className="min-h-[60px]">
                    {customInstructions ? (
                      <TiptapRenderer content={customInstructions} />
                    ) : (
                      <p className="text-muted-foreground italic">No instructions provided for this drill yet.</p>
                    )}
                  </div>
                )}
              </div>
            </section>


          </div>
        ) : (
          <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
            {customDrill ? (
              <>
                <h3 className="text-xl font-bold mb-2">{customDrill.name}</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-2">
                  {customDrill.category} Â· {customDrill.difficulty} Â· {customDrill.duration}
                </p>
                <p className="text-muted-foreground/60 text-sm max-w-md mx-auto">
                  Add a goal and instructions by clicking the edit button above.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-2">Content Not Available</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  We haven't extracted the detailed content for this drill yet. You can view it on the official website.
                </p>
                <a href={drill.url} target="_blank" rel="noopener noreferrer">
                  <Button>
                    View on USA Baseball <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </>
            )}
          </div>
        )}

        {/* â”€â”€ New Metadata Fields: always shown for static drills â”€â”€ */}
        {staticDrill && (staticDrill.drillType || (staticDrill.ageLevel?.length ?? 0) > 0 || (drill?.tags?.length ?? 0) > 0 || (staticDrill.problem?.length ?? 0) > 0 || (staticDrill.goal?.length ?? 0) > 0) && (
          <div className="grid gap-4 mt-6 px-4 md:px-0">

            {/* Drill Type + Age Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {staticDrill.drillType && (
                <div className="glass-card rounded-xl p-4">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Drill Type</div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                    {staticDrill.drillType}
                  </span>
                </div>
              )}
              {(staticDrill.ageLevel?.length ?? 0) > 0 && (
                <div className="glass-card rounded-xl p-4">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Age / Level</div>
                  <div className="flex flex-wrap gap-2">
                    {(staticDrill.ageLevel ?? []).filter((v: string) => v !== 'all').map((level: string) => {
                      const label = filterOptions.ageLevel.find(o => o.value === level)?.label ?? level;
                      return (
                        <span key={level} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 border border-teal-200">
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Focus Area Tags */}
            {(drill?.tags?.length ?? 0) > 0 && (
              <div className="glass-card rounded-xl p-4">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Focus Areas</div>
                <div className="flex flex-wrap gap-2">
                  {(drill?.tags ?? []).map((tag: string) => (
                    <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Problems + Goals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(staticDrill.problem?.length ?? 0) > 0 && (
                <div className="glass-card rounded-xl p-4">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fixes These Problems</div>
                  <div className="flex flex-wrap gap-2">
                    {(staticDrill.problem ?? []).map((p: string) => {
                      const label = filterOptions.problem.find(o => o.value === p)?.label ?? p;
                      return (
                        <span key={p} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {(staticDrill.goal?.length ?? 0) > 0 && (
                <div className="glass-card rounded-xl p-4">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Helps You</div>
                  <div className="flex flex-wrap gap-2">
                    {(staticDrill.goal ?? []).map((g: string) => {
                      const label = filterOptions.goal.find(o => o.value === g)?.label ?? g;
                      return (
                        <span key={g} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </>}

      {/* Log This Drill button — shown for authenticated users */}
      {user && drill && (
        <div className="mt-6 flex justify-center px-4 md:px-0">
          <button
            onClick={() => setShowLogDrill(true)}
            className="flex items-center gap-2 rounded-[2px] bg-gold px-5 py-2.5 font-heading text-[0.7rem] font-bold uppercase tracking-[0.1em] text-canvas transition-colors hover:bg-gold-dim"
          >
            <Check className="h-4 w-4" />
            Log This Drill
          </button>
        </div>
      )}

      </div>
      </>

      {/* Log Drill Modal */}
      {showLogDrill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-[2px] border border-film-border bg-surface p-6">
            <h3 className="font-heading text-lg font-bold text-film-fg">Log This Drill</h3>
            <p className="mt-1 text-[0.75rem] text-film-muted">Record that you completed {drill?.name}.</p>

            {/* Star rating */}
            <div className="mt-4">
              <span className="block font-heading text-[0.6rem] font-bold uppercase tracking-[0.12em] text-film-muted mb-1.5">
                Rating (optional)
              </span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setLogRating(logRating === n ? 0 : n)}
                    className="p-0.5"
                  >
                    <Star className={`h-5 w-5 transition-colors ${n <= logRating ? 'text-gold fill-gold' : 'text-film-muted'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <span className="block font-heading text-[0.6rem] font-bold uppercase tracking-[0.12em] text-film-muted mb-1.5">
                Notes (optional)
              </span>
              <textarea
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder="How did it feel? What did you focus on?"
                className="w-full rounded-[2px] border border-film-border bg-canvas px-3 py-2 text-[0.8rem] text-film-fg placeholder:text-film-muted focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-3 justify-end">
              <button
                onClick={() => { setShowLogDrill(false); setLogNotes(''); setLogRating(0); }}
                className="rounded-[2px] px-4 py-2 text-[0.7rem] font-heading font-semibold uppercase tracking-[0.1em] text-film-muted hover:text-film-fg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogDrill}
                disabled={logProgressMutation.isPending}
                className="rounded-[2px] bg-gold px-4 py-2 text-[0.7rem] font-heading font-bold uppercase tracking-[0.1em] text-canvas transition-colors hover:bg-gold-dim disabled:opacity-50"
              >
                {logProgressMutation.isPending ? 'Logging...' : 'Log Complete'}
              </button>
            </div>
            {logProgressMutation.isSuccess && (
              <p className="mt-3 text-center text-[0.7rem] text-foundation font-medium">Drill logged successfully!</p>
            )}
          </div>
        </div>
      )}

      {/* Sticky Bottom Action Bar â€” mobile only */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-background/95 backdrop-blur-md border-t border-border/20 px-4 py-3 safe-area-bottom">
          <div className="flex gap-3">
            <Link href={backHref} className="flex-none">
              <button className="h-12 w-12 rounded-xl border border-border/40 bg-card/80 flex items-center justify-center hover:bg-accent active:scale-95 transition-all">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <button
              onClick={handleToggleFavorite}
              disabled={toggleFavoriteMutation.isPending}
              className={`flex-1 h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                isFavorited
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-card/80 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Star className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
              {isFavorited ? 'Favorited' : 'Add to Favorites'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Delete Drill Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete the drill details for "{drill?.name}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    // Delete mutation would go here
                    alert("Delete functionality coming soon");
                    setShowDeleteConfirm(false);
                  }}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Q&A moved to Submit Work tab */}
      
      {/* Edit Drill Details Modal */}
      <EditDrillDetailsModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        drillId={id || ''}
        drillName={drill?.name || ''}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1);
          // Refetch drill details
        }}
      />
      
      {/* Drill Page Builder - Notion Style */}
      {showPageBuilder && (
        <DrillPageBuilderNotion
          drillId={id || ''}
          drillName={drill?.name || ''}
          onClose={() => setShowPageBuilder(false)}
        />
      )}
    </div>
  );
}
