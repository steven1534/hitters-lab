import { useState, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Edit3,
  RotateCcw,
  Eye,
  Search,
  Video,
  Loader2,
  ChevronLeft,
  Mail,
  Star,
  ArrowRight,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { InlineEdit } from "./InlineEdit";

// DB status enum: pending | analyzing | complete | failed
type AnalysisStatus = "pending" | "analyzing" | "complete" | "failed";

interface AiFeedback {
  overallAssessment: string;
  mechanicsBreakdown: { phase: string; observation: string; rating: number }[];
  strengths: string[];
  areasForImprovement: string[];
  drillRecommendations: string[];
  coachingCues: string[];
  confidenceScore: number;
}

interface AnalysisRecord {
  id: number;
  athleteId: number;
  athleteName: string;
  title: string | null;
  analysisType: string | null;
  videoUrl: string;
  status: AnalysisStatus;
  // aiAnalysis is stored as JSON string in DB — parsed client-side
  aiAnalysis: string | null;
  coachFeedbackText: string | null;
  analyzedAt: Date | null;
  reviewedAt: Date | null;
  approvedAt: Date | null;
  sentAt: Date | null;
  sentToEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Helper: parse aiAnalysis JSON string into typed object
function parseAiFeedback(record: AnalysisRecord): AiFeedback | null {
  if (!record.aiAnalysis) return null;
  try {
    return typeof record.aiAnalysis === "string"
      ? JSON.parse(record.aiAnalysis)
      : record.aiAnalysis as AiFeedback;
  } catch { return null; }
}

const STATUS_CONFIG: Record<AnalysisStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending:   { label: "Pending",   color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",  icon: Clock },
  analyzing: { label: "Analyzing", color: "bg-[#DC143C]/20 text-[#E8425A] border-[#DC143C]/30",    icon: Loader2 },
  complete:  { label: "Complete",  color: "bg-purple-500/20 text-purple-400 border-purple-500/30",  icon: Sparkles },
  failed:    { label: "Failed",    color: "bg-red-500/20 text-red-400 border-red-500/30",           icon: AlertCircle },
};

export function VideoAnalysisTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AnalysisStatus | "all">("all");
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisRecord | null>(null);
  const [editedFeedback, setEditedFeedback] = useState("");
  const [, setCoachNotes] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");

  const utils = trpc.useUtils();

  const { data: analyses = [], isLoading } = trpc.videoAnalysis.getAllAnalyses.useQuery();

  const analyzeMutation = trpc.videoAnalysis.analyzeVideo.useMutation({
    onSuccess: () => {
      toast.success("Analysis complete — review the AI feedback below.");
      utils.videoAnalysis.getAllAnalyses.invalidate();
      utils.videoAnalysis.getPendingReviews.invalidate();
    },
    onError: (err) => {
      toast.error(`Analysis failed: ${err.message}`);
    },
  });

  const updateFeedbackMutation = trpc.videoAnalysis.updateFeedback.useMutation({
    onSuccess: () => {
      utils.videoAnalysis.getAllAnalyses.invalidate();
    },
  });

  const approveMutation = trpc.videoAnalysis.approveFeedback.useMutation({
    onSuccess: () => {
      utils.videoAnalysis.getAllAnalyses.invalidate();
    },
  });

  const sendMutation = trpc.videoAnalysis.sendFeedback.useMutation({
    onSuccess: () => {
      utils.videoAnalysis.getAllAnalyses.invalidate();
      setEmailDialogOpen(false);
      setSelectedAnalysis(null);
    },
  });

  const retryMutation = trpc.videoAnalysis.retryAnalysis.useMutation({
    onSuccess: () => {
      utils.videoAnalysis.getAllAnalyses.invalidate();
    },
  });

  // Filter analyses
  const filteredAnalyses = useMemo(() => {
    return (analyses as AnalysisRecord[]).filter((a) => {
      const matchesSearch =
        a.athleteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.analysisType || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [analyses, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const all = analyses as AnalysisRecord[];
    return {
      total: all.length,
      pending: all.filter((a) => a.status === "pending").length,
      needsReview: all.filter((a) => a.status === "complete").length,
      sent: all.filter((a) => a.sentAt != null).length,
      failed: all.filter((a) => a.status === "failed").length,
    };
  }, [analyses]);

  // Open detail view
  const openDetail = (analysis: AnalysisRecord) => {
    setSelectedAnalysis(analysis);
    setEditedFeedback(analysis.coachFeedbackText || "");
    
  };

  // Handle analyze
  const handleAnalyze = (analysisId: number) => {
    analyzeMutation.mutate({ analysisId });
  };

  // Handle save feedback
  const handleSaveFeedback = () => {
    if (!selectedAnalysis) return;
    updateFeedbackMutation.mutate({
      analysisId: selectedAnalysis.id,
      coachEditedFeedback: editedFeedback, // mapped to coachFeedbackText server-side
      
    });
  };

  // Handle approve
  const handleApprove = () => {
    if (!selectedAnalysis) return;
    approveMutation.mutate({ analysisId: selectedAnalysis.id });
  };

  // Handle send
  const handleSend = () => {
    if (!selectedAnalysis) return;
    sendMutation.mutate({
      analysisId: selectedAnalysis.id,
      recipientEmail: recipientEmail || undefined,
    });
  };

  // Handle retry
  const handleRetry = (analysisId: number) => {
    retryMutation.mutate({ analysisId });
  };

  // ── Detail View ──────────────────────────────────────────
  if (selectedAnalysis) {
    const statusCfg = STATUS_CONFIG[selectedAnalysis.status];
    const StatusIcon = statusCfg.icon;
    const aiFeedback = parseAiFeedback(selectedAnalysis);

    return (
      <div className="space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => setSelectedAnalysis(null)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to All Analyses
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{selectedAnalysis.athleteName}</h2>
            <p className="text-muted-foreground mt-1">
              {("Type")}: <span className="text-foreground font-medium">{selectedAnalysis.title || selectedAnalysis.analysisType || "Swing Analysis"}</span>
            </p>
          </div>
          <Badge variant="outline" className={`${statusCfg.color} border px-3 py-1.5`}>
            <StatusIcon className={`h-4 w-4 mr-1.5 ${selectedAnalysis.status === "analyzing" ? "animate-spin" : ""}`} />
            {statusCfg.label}
          </Badge>
        </div>

        {/* Video Player */}
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-0">
            {selectedAnalysis.videoUrl ? (
              <video
                src={selectedAnalysis.videoUrl}
                controls
                className="w-full max-h-[400px] bg-black"
                preload="metadata"
              />
            ) : (
              <div className="w-full h-48 bg-muted flex items-center justify-center">
                <p className="text-muted-foreground text-sm">No video available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {selectedAnalysis.status === "pending" && (
            <Button
              onClick={() => handleAnalyze(selectedAnalysis.id)}
              disabled={analyzeMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Run AI Analysis
            </Button>
          )}
          {(selectedAnalysis.status === "complete") && (
            <>
              <Button
                onClick={handleSaveFeedback}
                disabled={updateFeedbackMutation.isPending}
                variant="outline"
              >
                {updateFeedbackMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Edit3 className="h-4 w-4 mr-2" />
                )}
                Save Edits
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve
              </Button>
            </>
          )}
          {(selectedAnalysis.status === "complete") && (
            <Button
              onClick={() => {
                setRecipientEmail("");
                setEmailDialogOpen(true);
              }}
              className="bg-[#DC143C] hover:bg-[#B91030]"
            >
              <Send className="h-4 w-4 mr-2" />
              Send to Athlete
            </Button>
          )}
          {selectedAnalysis.status === "failed" && (
            <Button
              onClick={() => handleRetry(selectedAnalysis.id)}
              disabled={retryMutation.isPending}
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Analysis
            </Button>
          )}
        </div>

        {/* Error Message */}
        {selectedAnalysis.status === "failed" && (
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-400">Analysis Failed</p>
                  <p className="text-sm text-red-400/80 mt-1">{"Analysis failed. Click Retry to try again."}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Feedback (structured view) */}
        {aiFeedback && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-purple-400" />
                AI Analysis
                {aiFeedback.confidenceScore > 0 && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    Confidence: {aiFeedback.confidenceScore}%
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Assessment */}
              <div>
                <h4 className="font-semibold text-foreground mb-2">Overall Assessment</h4>
                <p className="text-muted-foreground leading-relaxed">{aiFeedback.overallAssessment}</p>
              </div>

              {/* Mechanics Breakdown */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">Mechanics Breakdown</h4>
                <div className="grid gap-3">
                  {aiFeedback.mechanicsBreakdown.map((phase, i) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-4 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-foreground">{phase.phase}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-4 w-4 ${s <= phase.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{phase.observation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths */}
              {aiFeedback.strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-400 mb-2">Strengths</h4>
                  <ul className="space-y-1.5">
                    {aiFeedback.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Areas for Improvement */}
              {aiFeedback.areasForImprovement.length > 0 && (
                <div>
                  <h4 className="font-semibold text-amber-400 mb-2">Areas for Improvement</h4>
                  <ul className="space-y-1.5">
                    {aiFeedback.areasForImprovement.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ArrowRight className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Drill Recommendations */}
              {aiFeedback.drillRecommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-[#E8425A] mb-2">Recommended Drills</h4>
                  <div className="flex flex-wrap gap-2">
                    {aiFeedback.drillRecommendations.map((d, i) => (
                      <Badge key={i} variant="secondary" className="bg-[#DC143C]/10 text-[#E8425A] border-[#DC143C]/20">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Coaching Cues */}
              {aiFeedback.coachingCues.length > 0 && (
                <div>
                  <h4 className="font-semibold text-purple-400 mb-2">Coaching Cues</h4>
                  <div className="flex flex-wrap gap-2">
                    {aiFeedback.coachingCues.map((c, i) => (
                      <Badge key={i} variant="outline" className="border-purple-500/30 text-purple-400">
                        &ldquo;{c}&rdquo;
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Editable Feedback */}
        {(selectedAnalysis.status === "complete") && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Edit3 className="h-5 w-5 text-[#E8425A]" />
                Edit Feedback for Athlete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Edit the AI-generated feedback below. This is what will be sent to the athlete.
              </p>
              <Textarea
                value={editedFeedback}
                onChange={(e) => setEditedFeedback(e.target.value)}
                className="min-h-[300px] font-mono text-sm bg-muted/30"
                placeholder="Feedback content..."
              />
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Coach Notes (private — not sent to athlete)
                </label>
                <Textarea
                  value={editedFeedback}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  className="min-h-[100px] bg-muted/30"
                  placeholder="Your private notes about this analysis..."
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sent feedback preview */}
        {(selectedAnalysis.sentAt != null) && selectedAnalysis.coachFeedbackText && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="h-5 w-5 text-emerald-400" />
                {selectedAnalysis.sentAt ? "Sent Feedback" : "Approved Feedback"}
                {selectedAnalysis.sentToEmail && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    <Mail className="h-3 w-3 mr-1" />
                    {selectedAnalysis.sentToEmail}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm prose-invert max-w-none">
                <Streamdown>{selectedAnalysis.coachFeedbackText}</Streamdown>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Send Email Dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Feedback to Athlete</DialogTitle>
              <DialogDescription>
                Send the reviewed feedback to {selectedAnalysis.athleteName} via email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Recipient Email (optional — will use athlete&apos;s email if blank)
                </label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="athlete@example.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={sendMutation.isPending}
                className="bg-[#DC143C] hover:bg-[#B91030]"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── List View ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-400" />
            <InlineEdit contentKey="coach.videoAnalysis.title" defaultValue="AI Video Analysis" as="span" />
          </h2>
          <InlineEdit contentKey="coach.videoAnalysis.desc" defaultValue="Review AI-generated feedback on athlete video submissions" as="p" className="text-muted-foreground mt-1" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { key: "total", label: "Total", value: stats.total, color: "text-foreground" },
          { key: "pending", label: "Pending", value: stats.pending, color: "text-yellow-400" },
          { key: "needsReview", label: "Needs Review", value: stats.needsReview, color: "text-purple-400" },
          { key: "sent", label: "Sent", value: stats.sent, color: "text-emerald-400" },
          { key: "failed", label: "Failed", value: stats.failed, color: "text-red-400" },
        ].map((stat) => (
          <Card key={stat.key} className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <InlineEdit contentKey={`coach.videoAnalysis.stat.${stat.key}`} defaultValue={stat.label} as="p" className="text-xs text-muted-foreground mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by athlete or drill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "pending", "analyzing", "complete", "failed"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className={statusFilter === s ? "bg-primary" : ""}
            >
              {s === "all" ? "All" : STATUS_CONFIG[s].label}
            </Button>
          ))}
        </div>
      </div>

      {/* Analysis List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAnalyses.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="py-16 text-center">
            <Video className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No video analyses yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              When athletes submit videos for their drills, they&apos;ll appear here for AI analysis and your review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAnalyses.map((analysis) => {
            const statusCfg = STATUS_CONFIG[analysis.status];
            const StatusIcon = statusCfg.icon;
            return (
              <Card
                key={analysis.id}
                className="bg-card border-border hover:border-border/80 transition-all cursor-pointer group"
                onClick={() => openDetail(analysis)}
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center gap-4">
                    {/* Video thumbnail placeholder */}
                    <div className="h-16 w-24 md:h-20 md:w-32 bg-muted rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative">
                      {analysis.videoUrl ? (
                        <video
                          src={analysis.videoUrl}
                          className="h-full w-full object-cover"
                          preload="metadata"
                          muted
                        />
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">{analysis.athleteName}</h3>
                        <Badge variant="outline" className={`${statusCfg.color} border text-xs shrink-0`}>
                          <StatusIcon className={`h-3 w-3 mr-1 ${analysis.status === "analyzing" ? "animate-spin" : ""}`} />
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{analysis.title || analysis.analysisType || "Swing Analysis"}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {(analysis.createdAt instanceof Date ? analysis.createdAt : new Date(analysis.createdAt)).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {analysis.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnalyze(analysis.id);
                          }}
                          disabled={analyzeMutation.isPending}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1" />
                          <span className="hidden sm:inline">Analyze</span>
                        </Button>
                      )}
                      {analysis.status === "failed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(analysis.id);
                          }}
                          className="border-red-500/30 text-red-400"
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          Retry
                        </Button>
                      )}
                      {(analysis.status === "complete") && (
                        <Button size="sm" variant="outline">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Review
                        </Button>
                      )}
                      <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
