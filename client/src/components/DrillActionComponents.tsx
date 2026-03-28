import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Target, ChevronDown, ChevronUp, CheckCircle, Loader2, MessageCircle } from "lucide-react";

/**
 * DrillCoachFocus — Shows the coach's goal/focus for this drill.
 * Pulls from drillDetails.goal in the database.
 */
export function DrillCoachFocus({ drillId }: { drillId: string }) {
  const { data: drillDetail, isLoading } = trpc.drillDetails.getDrillDetail.useQuery(
    { drillId },
    { enabled: !!drillId }
  );

  if (isLoading) {
    return (
      <div className="bg-electric/10 border border-electric/20 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4" />
      </div>
    );
  }

  if (!drillDetail?.goal) return null;

  return (
    <div className="bg-electric/10 border border-electric/20 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Target className="w-5 h-5 text-electric flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-electric uppercase tracking-wider mb-1">
            Coach's Focus
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {drillDetail.goal}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * DrillQuickNotes — The "I Did It!" completion flow.
 * Big completion button up top, optional collapsible notes below.
 */
export function DrillQuickNotes({
  assignmentId,
  onComplete,
}: {
  assignmentId: number;
  onComplete: () => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  const utils = trpc.useUtils();
  const updateStatus = trpc.drillAssignments.updateStatus.useMutation({
    onSuccess: () => {
      utils.drillAssignments.getUserAssignments.invalidate();
      onComplete();
    },
    onError: () => {
      setIsCompleting(false);
    },
  });

  const handleComplete = () => {
    setIsCompleting(true);
    updateStatus.mutate({
      assignmentId,
      status: "completed",
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-3">
      {/* Big "I Did It!" Button */}
      <Button
        onClick={handleComplete}
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
            I Did It!
          </>
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Tap when you've completed this drill
      </p>

      {/* Optional Notes Toggle */}
      <button
        onClick={() => setShowNotes(!showNotes)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        {showNotes ? "Hide notes" : "Add a note (optional)"}
        {showNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* Collapsible Notes Area */}
      {showNotes && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it feel? Any questions for Coach?"
            className="w-full h-20 bg-muted/50 border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-electric/50"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {notes.length}/500
          </p>
        </div>
      )}
    </div>
  );
}
