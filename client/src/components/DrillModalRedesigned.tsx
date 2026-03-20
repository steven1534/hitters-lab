import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  X, Clock, Target, Play, CheckCircle, ChevronDown, ChevronUp,
  Loader2, MessageCircle, Sparkles, ListChecks, AlertTriangle,
  ArrowUp, Video, Upload, ThumbsUp, Meh, HelpCircle
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { DrillSubmissionForm } from "@/components/DrillSubmissionForm";

interface DrillModalRedesignedProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: {
    id: number;
    drillId: string;
    drillName: string;
    status: "assigned" | "in-progress" | "completed";
    completedAt: Date | null;
  } | null;
  drill?: {
    id: string;
    name: string;
    difficulty: string;
    categories: string[];
    duration: string;
  };
  onComplete: () => void;
  getDifficultyStyles: (difficulty: string) => string;
}

const FEEDBACK_OPTIONS = [
  { id: "felt_easy", label: "Felt Easy", icon: ThumbsUp, color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30" },
  { id: "challenging", label: "Challenging", icon: Meh, color: "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30" },
  { id: "need_help", label: "Need Help", icon: HelpCircle, color: "bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30" },
] as const;

export function DrillModalRedesigned({
  isOpen,
  onClose,
  assignment,
  drill,
  onComplete,
  getDifficultyStyles,
}: DrillModalRedesignedProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState("");
  const [showCustomNote, setShowCustomNote] = useState(false);
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const utils = trpc.useUtils();

  // Fetch drill details (instructions, description, etc.)
  const { data: drillDetail } = trpc.drillDetails.getDrillDetail.useQuery(
    { drillId: assignment?.drillId || "" },
    { enabled: !!assignment?.drillId }
  );

  const updateStatus = trpc.drillAssignments.updateStatus.useMutation({
    onSuccess: () => {
      utils.drillAssignments.getUserAssignments.invalidate();
      utils.badges.getMyProgress.invalidate();
      onComplete();
    },
    onError: () => {
      setIsCompleting(false);
    },
  });

  const handleMarkDone = () => {
    if (!assignment) return;
    setIsCompleting(true);

    const notes = [
      selectedFeedback ? `Feedback: ${FEEDBACK_OPTIONS.find(f => f.id === selectedFeedback)?.label}` : "",
      customNote.trim(),
    ].filter(Boolean).join(" | ");

    updateStatus.mutate({
      assignmentId: assignment.id,
      status: "completed",
      notes: notes || undefined,
    });
  };

  const resetState = () => {
    setSelectedFeedback(null);
    setCustomNote("");
    setShowCustomNote(false);
    setShowVideoUpload(false);
    setIsCompleting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!assignment) return null;

  const isCompleted = assignment.status === "completed";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg mx-auto max-h-[90vh] flex flex-col p-0 gap-0 glass-card border-white/10">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-white/10 bg-gradient-to-r from-navy to-charcoal flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold pr-8 text-foreground leading-tight">
              {assignment.drillName}
            </DialogTitle>
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Meta badges */}
          {drill && (
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <Badge className="bg-white/10 text-foreground border border-white/20 text-xs px-2.5 py-1">
                <Clock className="w-3 h-3 mr-1" />
                {drill.duration || "10 min"}
              </Badge>
              <Badge className={`${getDifficultyStyles(drill.difficulty)} text-xs px-2.5 py-1`}>
                {drill.difficulty}
              </Badge>
              {drill.categories[0] && (
                <Badge className="bg-[#DC143C]/20 text-[#E8425A] border border-[#DC143C]/30 text-xs px-2.5 py-1">
                  {drill.categories[0]}
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-background">

          {/* 1. Coach's Motivational Message */}
          <div className="bg-electric/10 border border-electric/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-electric/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-electric" />
              </div>
              <div>
                <p className="text-xs font-semibold text-electric uppercase tracking-wider mb-1">
                  Coach Steve says
                </p>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {drillDetail?.goal
                    ? `Focus on: ${drillDetail.goal}. You've got this — let's see some great reps today!`
                    : "You're doing great! Stay focused and give it your best effort today. Every rep counts!"}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Drill Instructions */}
          {drillDetail?.description && drillDetail.description.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-[#E8425A]" />
                <h3 className="font-semibold text-foreground text-sm">How to Do This Drill</h3>
              </div>
              <div className="space-y-2">
                {drillDetail.description.map((step: string, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="w-6 h-6 bg-[#DC143C]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-[#E8425A]">{idx + 1}</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Custom Instructions from Coach */}
          {drillDetail?.instructions && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Target className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
                    Special Instructions
                  </p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {drillDetail.instructions}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Common Mistakes to Avoid */}
          {drillDetail?.commonMistakes && drillDetail.commonMistakes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-foreground text-sm">Watch Out For</h3>
              </div>
              <div className="space-y-1.5">
                {drillDetail.commonMistakes.map((mistake: string, idx: number) => (
                  <div key={idx} className="flex gap-2 items-start bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
                    <span className="text-amber-400 text-xs mt-0.5">•</span>
                    <p className="text-xs text-foreground/70">{mistake}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Progressions */}
          {drillDetail?.progressions && drillDetail.progressions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ArrowUp className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-foreground text-sm">Level Up</h3>
              </div>
              <div className="space-y-1.5">
                {drillDetail.progressions.map((prog: string, idx: number) => (
                  <div key={idx} className="flex gap-2 items-start bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2">
                    <span className="text-emerald-400 text-xs mt-0.5">→</span>
                    <p className="text-xs text-foreground/70">{prog}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Watch Video Button */}
          <Link href={`/drill/${assignment.drillId}`}>
            <Button variant="outline" className="w-full gap-2 border-white/20 hover:bg-white/10 text-foreground">
              <Play className="w-4 h-4" />
              Watch Video Instructions
            </Button>
          </Link>

          {/* DIVIDER — Submission Section */}
          {!isCompleted && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground uppercase tracking-wider">
                    Your Turn
                  </span>
                </div>
              </div>

              {/* 7. Quick Feedback Options */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">How did it go?</p>
                <div className="grid grid-cols-3 gap-2">
                  {FEEDBACK_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedFeedback === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setSelectedFeedback(isSelected ? null : option.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                          isSelected
                            ? `${option.color} ring-2 ring-white/20 scale-[1.02]`
                            : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08] text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 8. Optional Note */}
              <button
                onClick={() => setShowCustomNote(!showCustomNote)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {showCustomNote ? "Hide note" : "Add a note for Coach (optional)"}
                {showCustomNote ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showCustomNote && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <textarea
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="What went well? What was tough? Any questions?"
                    className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-electric/50"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right mt-1">{customNote.length}/500</p>
                </div>
              )}

              {/* 9. Mark as Done — Primary CTA */}
              <Button
                onClick={handleMarkDone}
                disabled={isCompleting}
                className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 gap-3 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 active:scale-[0.98]"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Mark as Done
                  </>
                )}
              </Button>

              {/* 10. Optional Video Upload — De-emphasized */}
              <div className="pt-2">
                <button
                  onClick={() => setShowVideoUpload(!showVideoUpload)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
                >
                  <Video className="w-3.5 h-3.5" />
                  {showVideoUpload ? "Hide video upload" : "Want to upload a video for analysis?"}
                  {showVideoUpload ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showVideoUpload && (
                  <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                    <DrillSubmissionForm
                      assignmentId={assignment.id}
                      drillId={assignment.drillId}
                      onSubmitSuccess={() => {
                        utils.drillAssignments.getUserAssignments.invalidate();
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Already Completed State */}
          {isCompleted && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="font-bold text-emerald-400 text-lg">Drill Completed!</p>
              {assignment.completedAt && (
                <p className="text-sm text-emerald-400/70 mt-1">
                  {new Date(assignment.completedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
