import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Clock,
  Users,
  Dumbbell,
  Target,
  ExternalLink,
  Lock,
  LogIn,
  AlertCircle,
  TrendingUp,
  Lightbulb,
  Star,
  AlertTriangle,
  Eye,
  MessageSquare,
  Edit,
  Trash2,
  Check,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useRoute, useSearch } from "wouter";
import { useEffect, useMemo, useState } from "react";
import drillsData, { filterOptions } from "@/data/drills";
import {
  mergeDrillWithCatalogOverride,
  type MergeableDrill,
} from "@shared/drillCatalogMerge";
import { VideoPlayer } from "@/components/VideoPlayer";
import { EditDrillDetailsModal } from "@/components/EditDrillDetailsModal";
import { TiptapEditor, TiptapRenderer } from "@/components/TiptapEditor";
import { trpc } from "@/lib/trpc";
import { usePreviewLimit } from "@/hooks/usePreviewLimit";
import { InlineEdit } from "@/components/InlineEdit";

/**
 * DrillDetail — lean static drill display.
 *
 * Phase 1 rebuild: page-builder, stat-card editor, Q&A, and custom
 * drill layouts are intentionally removed. Drills render from Manus
 * static data + catalog overrides + coach-edited description fields.
 */
export default function DrillDetail() {
  const { user, loading } = useAuth();
  const [, params] = useRoute("/drill/:id");
  const id = params?.id;

  // Back navigation preserves directory query params.
  const searchString = useSearch();
  const backHref = searchString ? `/?${searchString}` : "/";

  // Free preview gating for anonymous visitors.
  const { isLimitReached, recordView } = usePreviewLimit();

  const { data: customDrills = [] } = trpc.drillDetails.getCustomDrills.useQuery();
  const { data: catalogOverrides = [] } = trpc.drillCatalog.getAll.useQuery();

  const staticDrill = drillsData.find((d) => d.id.toString() === id);
  const customDrill = customDrills.find((cd: any) => cd.drillId === id);

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

  const { data: dbDetails } = trpc.drillDetails.getDrillDetail.useQuery(
    { drillId: id || "" },
    { enabled: !!id }
  );

  const details = dbDetails || (drill
    ? {
        skillSet: (drill as any).skillSet || drill.categories?.[0] || "Hitting",
        difficulty: drill.difficulty,
        athletes: (drill as any).athletes || "",
        time: drill.duration,
        equipment: (drill as any).equipment || "",
        goal: (drill as any).purpose || "",
        description: (drill as any).description || [],
        videoUrl: (drill as any).videoUrl || drill.url || null,
      }
    : null);

  const { data: videoData } = trpc.videos.getVideo.useQuery(
    { drillId: id || "" },
    { enabled: !!id }
  );
  const videoUrl =
    videoData?.videoUrl ||
    (details && "videoUrl" in details && details.videoUrl) ||
    null;

  const [customInstructions, setCustomInstructions] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLogDrill, setShowLogDrill] = useState(false);
  const [logNotes, setLogNotes] = useState("");
  const [logRating, setLogRating] = useState(0);

  useEffect(() => {
    if (dbDetails?.instructions) {
      setCustomInstructions(dbDetails.instructions);
    }
  }, [dbDetails]);

  const saveInstructionsMutation = trpc.drillDetails.saveDrillInstructions.useMutation();
  const saveCustomInstructions = async () => {
    if (!id || !customInstructions.trim()) return;
    try {
      await saveInstructionsMutation.mutateAsync({
        drillId: id,
        instructions: customInstructions,
      });
    } catch (err) {
      console.error("Failed to save instructions:", err);
    }
  };

  // Favorites
  const trpcUtils = trpc.useUtils();
  const { data: favoritesData } = trpc.favorites.getAll.useQuery(undefined, {
    enabled: !!user?.id,
  });
  const toggleFavoriteMutation = trpc.favorites.toggle.useMutation({
    onSuccess: () => {
      trpcUtils.favorites.getAll.invalidate();
    },
  });
  const isFavorited = useMemo(() => {
    if (!favoritesData?.drillIds || !id) return false;
    return favoritesData.drillIds.includes(id);
  }, [favoritesData?.drillIds, id]);
  const handleToggleFavorite = () => {
    if (!id) return;
    toggleFavoriteMutation.mutate({ drillId: id });
  };

  // Log drill completion
  const logProgressMutation = trpc.progress.log.useMutation({
    onSuccess: () => {
      setShowLogDrill(false);
      setLogNotes("");
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

  // Record anonymous preview view.
  const isAnonymous = !user && !loading;
  useEffect(() => {
    if (isAnonymous && id && drill && !isLimitReached) {
      recordView();
    }
  }, [isAnonymous, id, drill?.name, isLimitReached]);

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
          <p className="text-muted-foreground">
            The drill you're looking for doesn't exist or has been removed.
          </p>
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

  const isCoach = !!(user && (user.role === "admin" || user.role === "coach"));

  return (
    <div className="film-room min-h-screen bg-background pt-14 pb-24 md:pb-12">
      <SiteNav />

      {/* Anonymous preview limit overlay */}
      {isAnonymous && isLimitReached && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#0f0f13] border border-white/[0.12] rounded-2xl p-8 max-w-md w-full text-center shadow-2xl space-y-5">
            <div className="h-16 w-16 rounded-full bg-[#DC143C]/10 border border-[#DC143C]/20 flex items-center justify-center mx-auto">
              <Lock className="h-8 w-8 text-[#DC143C]" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold text-white mb-2">
                Free Preview Limit Reached
              </h2>
              <p className="text-white/50 text-sm leading-relaxed">
                You've viewed your free drills. Log in to access the full library.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <a href={getLoginUrl()} className="w-full">
                <Button
                  size="lg"
                  className="w-full bg-[#DC143C] hover:bg-[#DC143C]/90 text-white font-semibold gap-2"
                >
                  <LogIn className="h-5 w-5" />
                  Log In
                </Button>
              </a>
              <Link href={backHref}>
                <Button
                  variant="ghost"
                  className="w-full text-white/40 hover:text-white/70"
                >
                  Back to Directory
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative overflow-hidden mb-0 md:mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.16_0.020_40)] via-[oklch(0.12_0.008_260)] to-[oklch(0.09_0.010_250)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.22_0.04_55/0.18),transparent_60%)]" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="container relative z-10 pt-4 pb-6 md:py-10">
          <Link href={backHref}>
            <Button
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10 mb-3 md:mb-4 pl-0 gap-2 text-sm h-9"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Directory</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
            <div className="flex-1 w-full min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <Badge
                  variant="outline"
                  className={`font-bold text-[10px] px-2.5 py-0.5 ${
                    drill.difficulty === "Easy"
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : drill.difficulty === "Medium"
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}
                >
                  {drill.difficulty}
                </Badge>
                {drill.categories.map((cat) => (
                  <Badge
                    key={cat}
                    variant="outline"
                    className="bg-white/[0.06] text-white/70 border-white/[0.1] font-medium text-[10px] px-2.5 py-0.5"
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
              <InlineEdit
                contentKey={`drill.detail.${id}.title`}
                defaultValue={drill.name}
                as="h1"
                className="text-2xl sm:text-3xl md:text-5xl font-heading font-black text-white leading-tight tracking-tight"
              />
            </div>

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

              {isCoach && (
                <>
                  <Button
                    onClick={() => setEditModalOpen(true)}
                    variant="outline"
                    className="bg-white/[0.06] hover:bg-white/[0.12] text-white/80 border-white/[0.12] gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="outline"
                    className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20 gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}

              {!details && !customDrill && (
                <a href={drill.url} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    className="bg-white/[0.06] hover:bg-white/[0.12] text-white/80 border-white/[0.12] gap-2"
                  >
                    View on USA Baseball
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-4xl px-0 md:px-4">
        {/* Video */}
        <div className="md:rounded-xl overflow-hidden mb-6">
          {videoUrl ? (
            <VideoPlayer videoUrl={videoUrl as string} title={`${drill.name} Video`} />
          ) : (
            <div className="bg-muted aspect-video flex items-center justify-center border-y border-dashed border-muted-foreground/20 md:border md:rounded-xl w-full">
              <div className="text-center p-4">
                <p className="text-muted-foreground font-medium text-sm">
                  No video available
                </p>
                <p className="text-xs text-muted-foreground/50 mt-1">
                  Video will appear here when added
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Goal */}
        {details?.goal && (
          <div className="glass-card rounded-none md:rounded-xl border-l-4 border-l-[#DC143C] overflow-hidden mb-6">
            <div className="p-4 md:p-6">
              <h3 className="flex items-center gap-2 text-xl md:text-2xl font-heading font-black mb-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#DC143C]/20 to-[#DC143C]/20 flex items-center justify-center">
                  <Lightbulb className="h-4 w-4 text-[#E8425A]" />
                </div>
                Goal of Drill
              </h3>
              <p className="text-base md:text-lg font-medium text-foreground/90 leading-relaxed">
                {details.goal}
              </p>
            </div>
          </div>
        )}

        {/* Stat strip */}
        {details && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 px-4 md:px-0">
            <StatCard icon={Clock} label="Time" value={details.time} />
            <StatCard
              icon={Users}
              label="Athletes"
              value={details.athletes?.split(",")[0] || "—"}
            />
            <StatCard
              icon={Dumbbell}
              label="Equipment"
              value={details.equipment?.split(",")[0] || "—"}
            />
            <StatCard icon={Target} label="Skill" value={details.skillSet} />
          </div>
        )}

        {/* Instructions */}
        <section className="px-4 md:px-0 mb-8">
          <h2 className="text-2xl md:text-3xl font-heading font-black mb-3 md:mb-4 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
              <Target className="h-4 w-4 text-green-400" />
            </div>
            Instructions
          </h2>
          <div className="glass-card rounded-xl p-4 md:p-6">
            {isCoach ? (
              <TiptapEditor
                value={customInstructions}
                onChange={setCustomInstructions}
                onSave={saveCustomInstructions}
                isSaving={saveInstructionsMutation.isPending}
                placeholder="Write drill instructions here..."
              />
            ) : customInstructions ? (
              <TiptapRenderer content={customInstructions} />
            ) : (
              <p className="text-muted-foreground italic">
                No instructions provided for this drill yet.
              </p>
            )}
          </div>
        </section>

        {/* Coaching content */}
        {hasCoachingContent && (
          <div className="grid gap-5 mb-8 px-4 md:px-0">
            <h2 className="text-xl font-heading font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal" />
              Coaching Notes
            </h2>

            {((drill as any)?.whatThisFixes?.length ?? 0) > 0 && (
              <CoachSection
                title="What This Drill Helps Fix"
                tone="advanced"
                items={(drill as any).whatThisFixes as string[]}
              />
            )}
            {((drill as any)?.whatToFeel?.length ?? 0) > 0 && (
              <CoachSection
                title="What to Feel"
                tone="teal"
                items={(drill as any).whatToFeel as string[]}
              />
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
                  {((drill as any).commonMistakes as string[]).map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[0.8rem] text-film-fg"
                    >
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
                  {((drill as any).nextSteps as string[]).map((stepId) => (
                    <Link key={stepId} href={`/drill/${stepId}`}>
                      <span className="inline-flex items-center gap-1 rounded-[2px] border border-film-border bg-surface px-3 py-1.5 text-[0.72rem] text-teal transition-colors hover:border-teal/30 hover:bg-surface-raised cursor-pointer">
                        &rarr;{" "}
                        {stepId
                          .replace(/-/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metadata chips */}
        {staticDrill && (
          <div className="grid gap-4 px-4 md:px-0 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {staticDrill.drillType && (
                <MetadataBox title="Drill Type">
                  <span className="inline-flex items-center px-3 py-1 rounded-[2px] text-[0.78rem] font-semibold bg-teal/10 text-teal border border-teal/20">
                    {staticDrill.drillType}
                  </span>
                </MetadataBox>
              )}
              {(staticDrill.ageLevel?.length ?? 0) > 0 && (
                <MetadataBox title="Age / Level">
                  <div className="flex flex-wrap gap-2">
                    {(staticDrill.ageLevel ?? [])
                      .filter((v) => v !== "all")
                      .map((level) => {
                        const label =
                          filterOptions.ageLevel.find((o) => o.value === level)
                            ?.label ?? level;
                        return (
                          <span
                            key={level}
                            className="inline-flex items-center px-2.5 py-1 rounded-[2px] text-[0.72rem] font-medium bg-gold/10 text-gold border border-gold/20"
                          >
                            {label}
                          </span>
                        );
                      })}
                  </div>
                </MetadataBox>
              )}
            </div>

            {(drill?.tags?.length ?? 0) > 0 && (
              <MetadataBox title="Focus Areas">
                <div className="flex flex-wrap gap-2">
                  {(drill?.tags ?? []).map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-1 rounded-[2px] text-[0.72rem] font-medium bg-white/[0.06] text-film-fg/80 border border-film-border"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </MetadataBox>
            )}
          </div>
        )}

        {/* Log drill CTA */}
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

      {/* Log-drill modal */}
      {showLogDrill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-[2px] border border-film-border bg-surface p-6">
            <h3 className="font-heading text-lg font-bold text-film-fg">
              Log This Drill
            </h3>
            <p className="mt-1 text-[0.75rem] text-film-muted">
              Record that you completed {drill?.name}.
            </p>
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
                    <Star
                      className={`h-5 w-5 transition-colors ${
                        n <= logRating
                          ? "text-gold fill-gold"
                          : "text-film-muted"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
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
            <div className="mt-5 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowLogDrill(false);
                  setLogNotes("");
                  setLogRating(0);
                }}
                className="rounded-[2px] px-4 py-2 text-[0.7rem] font-heading font-semibold uppercase tracking-[0.1em] text-film-muted hover:text-film-fg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogDrill}
                disabled={logProgressMutation.isPending}
                className="rounded-[2px] bg-gold px-4 py-2 text-[0.7rem] font-heading font-bold uppercase tracking-[0.1em] text-canvas transition-colors hover:bg-gold-dim disabled:opacity-50"
              >
                {logProgressMutation.isPending ? "Logging..." : "Log Complete"}
              </button>
            </div>
            {logProgressMutation.isSuccess && (
              <p className="mt-3 text-center text-[0.7rem] text-foundation font-medium">
                Drill logged successfully!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mobile bottom bar */}
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
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-card/80 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Star className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
              {isFavorited ? "Favorited" : "Add to Favorites"}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Delete Drill Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Delete details for "{drill?.name}"? This cannot be undone.
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

      <EditDrillDetailsModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        drillId={id || ""}
        drillName={drill?.name || ""}
      />
    </div>
  );
}

// ── Local helpers ──────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[2px] border border-film-border bg-surface p-3 flex items-center gap-3">
      <Icon className="h-4 w-4 text-gold" />
      <div className="min-w-0">
        <p className="font-heading text-[0.6rem] font-bold uppercase tracking-[0.12em] text-film-muted">
          {label}
        </p>
        <p className="text-[0.8rem] text-film-fg font-semibold truncate">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function MetadataBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[2px] border border-film-border bg-surface p-4">
      <div className="font-heading text-[0.6rem] font-bold uppercase tracking-[0.12em] text-film-muted mb-2.5">
        {title}
      </div>
      {children}
    </div>
  );
}

function CoachSection({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "advanced" | "teal";
  items: string[];
}) {
  const bulletTone = tone === "advanced" ? "bg-advanced" : "bg-teal";
  const headingTone = tone === "advanced" ? "text-advanced" : "text-teal";
  return (
    <div className="rounded-[2px] border border-film-border bg-surface p-5">
      <h3
        className={`mb-3 font-heading text-[0.7rem] font-bold uppercase tracking-[0.12em] ${headingTone}`}
      >
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[0.8rem] text-film-fg">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${bulletTone}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Messaging icon import retained for parity with older dead refs; unused now.
void MessageSquare;
