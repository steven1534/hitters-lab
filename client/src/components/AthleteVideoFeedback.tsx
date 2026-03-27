/**
 * AthleteVideoFeedback — Full-featured feedback hub for athletes.
 *
 * Shows ALL video submissions (drill-specific + standalone) with:
 *   - Status tracking for every stage of the pipeline
 *   - Inline expandable cards for quick review
 *   - Full detail view with video player + structured AI feedback
 *   - Mobile-optimized dark theme design
 *
 * Athletes only see the coach-approved feedback content (not raw AI output
 * or coach private notes) for approved/sent analyses. For other statuses
 * they see a status indicator so they know where their submission stands.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Video,
  CheckCircle,
  Star,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  Clock,
  AlertCircle,
  Eye,
  Target,
  Lightbulb,
  Dumbbell,
  X,
} from "lucide-react";
import { Streamdown } from "streamdown";

// ── Swing type labels ────────────────────────────────────────
const SWING_TYPE_LABELS: Record<string, string> = {
  "batting-practice": "Batting Practice",
  "game-at-bat": "Game At-Bat",
  "tee-work": "Tee Work",
  "soft-toss": "Soft Toss",
  "front-toss": "Front Toss",
  "live-pitching": "Live Pitching",
  "cage-session": "Cage Session",
  "dry-swings": "Dry Swings",
  other: "Other",
};

function getSwingLabel(swingType?: string | null, drillId?: string | null, isStandalone?: number | null): string {
  if (isStandalone && swingType) {
    return SWING_TYPE_LABELS[swingType] || swingType;
  }
  if (drillId) return drillId;
  if (swingType) return SWING_TYPE_LABELS[swingType] || swingType;
  return "Swing Video";
}

// ── Status config ────────────────────────────────────────────
function getStatusConfig(status: string) {
  switch (status) {
    case "pending":
      return {
        label: "Queued",
        description: "Your video is in the queue for AI analysis.",
        icon: Clock,
        color: "text-yellow-400",
        bg: "bg-yellow-500/20 border-yellow-500/30",
        dotColor: "bg-yellow-400",
      };
    case "analyzing":
      return {
        label: "AI Analyzing",
        description: "Our AI is reviewing your swing mechanics right now.",
        icon: Loader2,
        color: "text-[#E8425A]",
        bg: "bg-[#DC143C]/20 border-[#DC143C]/30",
        dotColor: "bg-[#DC143C]",
        spin: true,
      };
    case "analyzed":
    case "reviewed":
      return {
        label: "Coach Reviewing",
        description: "AI analysis complete. Coach is reviewing before sending feedback.",
        icon: Eye,
        color: "text-orange-400",
        bg: "bg-orange-500/20 border-orange-500/30",
        dotColor: "bg-orange-400",
      };
    case "approved":
    case "sent":
      return {
        label: "Feedback Ready",
        description: "Coach-approved feedback is ready to view!",
        icon: CheckCircle,
        color: "text-emerald-400",
        bg: "bg-emerald-500/20 border-emerald-500/30",
        dotColor: "bg-emerald-400",
      };
    case "failed":
      return {
        label: "Error",
        description: "Something went wrong. Coach has been notified.",
        icon: AlertCircle,
        color: "text-red-400",
        bg: "bg-red-500/20 border-red-500/30",
        dotColor: "bg-red-400",
      };
    default:
      return {
        label: status,
        description: "",
        icon: Clock,
        color: "text-gray-400",
        bg: "bg-gray-500/20 border-gray-500/30",
        dotColor: "bg-gray-400",
      };
  }
}

function formatDate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Main component ───────────────────────────────────────────
export function AthleteVideoFeedback() {
  const { data: analyses = [], isLoading } = trpc.videoAnalysis.getMyAllAnalyses.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const selectedAnalysis = analyses.find((a: any) => a.id === selectedId);
  const parsedAiFeedback = selectedAnalysis?.aiAnalysis
    ? (() => { try { return JSON.parse(selectedAnalysis.aiAnalysis as string); } catch { return null; } })()
    : null;

  // Categorize
  const feedbackReady = analyses.filter((a: any) => a.status === "approved" || a.status === "sent");
  const inProgress = analyses.filter((a: any) =>
    ["pending", "analyzing", "analyzed", "reviewed"].includes(a.status)
  );
  const failed = analyses.filter((a: any) => a.status === "failed");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
      </div>
    );
  }

  if (analyses.length === 0) {
    return null; // Don't show section if no submissions at all
  }

  const hasFeedback = feedbackReady.length > 0;
  const hasInProgress = inProgress.length > 0;

  // Decide how many to show initially
  const INITIAL_SHOW = 4;
  const allItems = [...feedbackReady, ...inProgress, ...failed];
  const displayItems = showAll ? allItems : allItems.slice(0, INITIAL_SHOW);

  return (
    <>
      <div className="animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
        {/* Section Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            My Swing Feedback
          </h3>
          <div className="flex items-center gap-2">
            {hasFeedback && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                {feedbackReady.length} ready
              </Badge>
            )}
            {hasInProgress && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs animate-pulse">
                {inProgress.length} pending
              </Badge>
            )}
          </div>
        </div>

        {/* Feedback Cards */}
        <div className="space-y-2">
          {displayItems.map((analysis: any) => {
            const statusConfig = getStatusConfig(analysis.status);
            const StatusIcon = statusConfig.icon;
            const isFeedbackReady = analysis.status === "approved" || analysis.status === "sent";
            const label = getSwingLabel(analysis.swingType, analysis.drillId, analysis.isStandalone);

            return (
              <button
                key={analysis.id}
                onClick={() => isFeedbackReady ? setSelectedId(analysis.id) : undefined}
                disabled={!isFeedbackReady}
                className={`w-full glass-card rounded-xl p-4 flex items-center gap-3 text-left transition-all duration-300 ${
                  isFeedbackReady
                    ? "card-hover cursor-pointer border-emerald-500/20 hover:border-emerald-500/40"
                    : "opacity-75 cursor-default"
                }`}
              >
                {/* Video thumbnail / icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isFeedbackReady
                    ? "bg-gradient-to-br from-purple-500/30 to-electric/20 border border-purple-500/30"
                    : "bg-white/5 border border-white/10"
                }`}>
                  {isFeedbackReady ? (
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  ) : (
                    <Video className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground truncate text-sm">{label}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatShortDate(analysis.createdAt)}
                    </span>
                    {analysis.isStandalone ? (
                      <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] px-1.5 py-0">
                        Standalone
                      </Badge>
                    ) : analysis.drillId ? (
                      <Badge className="bg-[#DC143C]/10 text-[#E8425A] border border-[#DC143C]/20 text-[10px] px-1.5 py-0">
                        Drill
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`${statusConfig.bg} ${statusConfig.color} border text-xs`}>
                    <StatusIcon className={`w-3 h-3 mr-1 ${(statusConfig as any).spin ? "animate-spin" : ""}`} />
                    {statusConfig.label}
                  </Badge>
                  {isFeedbackReady && (
                    <ChevronRight className="h-4 w-4 text-white/30" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Show more / less */}
        {allItems.length > INITIAL_SHOW && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full mt-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
          >
            {showAll ? (
              <>Show Less <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>Show All ({allItems.length}) <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        )}
      </div>

      {/* ── Full Feedback Detail Dialog ──────────────────────────── */}
      <Dialog open={!!selectedAnalysis} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 glass-card border-white/10 overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-5 pb-4 border-b border-white/10 bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-foreground pr-8">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <span className="truncate">
                  {selectedAnalysis && getSwingLabel(
                    selectedAnalysis.swingType,
                    selectedAnalysis.drillId,
                    selectedAnalysis.isStandalone
                  )}
                </span>
              </DialogTitle>
            </div>
            {selectedAnalysis && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">
                  {formatDate(selectedAnalysis.createdAt)}
                </span>
                {selectedAnalysis.isStandalone ? (
                  <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px]">
                    Standalone Swing
                  </Badge>
                ) : (
                  <Badge className="bg-[#DC143C]/10 text-[#E8425A] border border-[#DC143C]/20 text-[10px]">
                    Drill Submission
                  </Badge>
                )}
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Coach Approved
                </Badge>
              </div>
            )}
          </DialogHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-background">
            {selectedAnalysis && (
              <>
                {/* Video Player */}
                {selectedAnalysis.videoUrl ? (
                  <div className="rounded-xl overflow-hidden bg-black/50 border border-white/10">
                    <video
                      src={selectedAnalysis.videoUrl}
                      controls
                      className="w-full max-h-[280px]"
                      preload="metadata"
                      playsInline
                    />
                  </div>
                ) : (
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] h-28 flex items-center justify-center">
                    <p className="text-white/40 text-sm">Video not available</p>
                  </div>
                )}

                {/* Athlete's original notes */}
                {selectedAnalysis.athleteNotes && (
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Your Notes</p>
                    <p className="text-sm text-foreground/80">{selectedAnalysis.athleteNotes}</p>
                  </div>
                )}

                {/* AI Feedback structured view — only for approved/sent */}
                {parsedAiFeedback && (
                  <div className="space-y-4">
                    {/* Overall Assessment */}
                    <div className="bg-gradient-to-br from-purple-500/10 to-electric/5 rounded-xl p-4 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-purple-400" />
                        <h4 className="font-bold text-foreground text-sm">Overall Assessment</h4>
                        {(parsedAiFeedback as any).confidenceScore && (
                          <Badge className="ml-auto bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px]">
                            {(parsedAiFeedback as any).confidenceScore}% confidence
                          </Badge>
                        )}
                      </div>
                      <p className="text-foreground/80 text-sm leading-relaxed">
                        {(parsedAiFeedback as any).overallAssessment}
                      </p>
                    </div>

                    {/* Mechanics Breakdown */}
                    {(parsedAiFeedback as any).mechanicsBreakdown?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Dumbbell className="w-4 h-4 text-[#E8425A]" />
                          <h4 className="font-bold text-foreground text-sm">Mechanics Breakdown</h4>
                        </div>
                        <div className="grid gap-2">
                          {(parsedAiFeedback as any).mechanicsBreakdown.map((phase: any, i: number) => (
                            <div key={i} className="bg-white/[0.04] rounded-xl p-3.5 border border-white/[0.06]">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-semibold text-foreground text-sm">{phase.phase}</span>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                      key={s}
                                      className={`h-3.5 w-3.5 ${
                                        s <= phase.rating
                                          ? "text-yellow-400 fill-yellow-400"
                                          : "text-white/15"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-xs text-foreground/60 leading-relaxed">{phase.observation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Strengths */}
                    {(parsedAiFeedback as any).strengths?.length > 0 && (
                      <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/15">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <h4 className="font-bold text-emerald-400 text-sm">What You're Doing Well</h4>
                        </div>
                        <ul className="space-y-2">
                          {(parsedAiFeedback as any).strengths.map((s: string, i: number) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/75">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Areas for Improvement */}
                    {(parsedAiFeedback as any).areasForImprovement?.length > 0 && (
                      <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/15">
                        <div className="flex items-center gap-2 mb-3">
                          <ArrowRight className="w-4 h-4 text-amber-400" />
                          <h4 className="font-bold text-amber-400 text-sm">Focus Areas</h4>
                        </div>
                        <ul className="space-y-2">
                          {(parsedAiFeedback as any).areasForImprovement.map((a: string, i: number) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/75">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Drill Recommendations */}
                    {(parsedAiFeedback as any).drillRecommendations?.length > 0 && (
                      <div className="bg-[#DC143C]/5 rounded-xl p-4 border border-[#DC143C]/15">
                        <div className="flex items-center gap-2 mb-3">
                          <Dumbbell className="w-4 h-4 text-[#E8425A]" />
                          <h4 className="font-bold text-[#E8425A] text-sm">Recommended Drills</h4>
                        </div>
                        <ul className="space-y-2">
                          {(parsedAiFeedback as any).drillRecommendations.map((d: string, i: number) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/75">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#DC143C] mt-2 flex-shrink-0" />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Coaching Cues */}
                    {(parsedAiFeedback as any).coachingCues?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="w-4 h-4 text-purple-400" />
                          <h4 className="font-bold text-purple-400 text-sm">Remember These Cues</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(parsedAiFeedback as any).coachingCues.map((c: string, i: number) => (
                            <div
                              key={i}
                              className="bg-purple-500/10 border border-purple-500/25 rounded-lg px-3 py-2 text-sm text-purple-300"
                            >
                              &ldquo;{c}&rdquo;
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Coach edited feedback (markdown) — fallback when no structured AI feedback */}
                {selectedAnalysis.coachFeedbackText && !parsedAiFeedback && (
                  <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.08]">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <h4 className="font-bold text-foreground text-sm">Coach Feedback</h4>
                    </div>
                    <div className="prose prose-sm prose-invert max-w-none">
                      <Streamdown>{selectedAnalysis.coachFeedbackText}</Streamdown>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
