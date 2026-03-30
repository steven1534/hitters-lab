import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  FileText,
  Dumbbell,
  Loader2,
  Plus,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BlastMetricsBadge } from "./BlastMetricsBadge";
import { InlineEdit } from "@/components/InlineEdit";

// Skill category colors (matching SessionNotesForm)
const SKILL_COLORS: Record<string, string> = {
  "Swing Mechanics": "bg-[#DC143C]/20 text-[#E8425A] border-[#DC143C]/30",
  "Pitch Recognition": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Plate Approach": "bg-[#DC143C]/20 text-[#E8425A] border-[#DC143C]/30",
  "Bat Speed Development": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Exit Velocity": "bg-green-500/20 text-green-300 border-green-500/30",
  "Timing & Rhythm": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Game IQ / Situational Awareness": "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "Confidence / Mindset": "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "Contact Quality": "bg-teal-500/20 text-teal-300 border-teal-500/30",
};

interface SessionHistoryProps {
  athleteId: number;
  athleteName: string;
  onNewNote?: () => void;
  onEditNote?: (note: any) => void;
  onGenerateReport?: (noteId: number) => void;
}

export function SessionHistory({
  athleteId,
  athleteName,
  onNewNote,
  onEditNote,
  onGenerateReport,
}: SessionHistoryProps) {
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);

  const { data, isLoading } = trpc.sessionNotes.getForAthlete.useQuery({
    athleteId,
  });

  const utils = trpc.useUtils();

  const deleteMutation = trpc.sessionNotes.delete.useMutation({
    onSuccess: () => {
      toast.success("Session note deleted");
      utils.sessionNotes.getForAthlete.invalidate({ athleteId });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete");
    },
  });

  const bulkToggleMutation = trpc.sessionNotes.bulkToggleSharing.useMutation({
    onMutate: async ({ shared }) => {
      await utils.sessionNotes.getForAthlete.cancel({ athleteId });
      const prev = utils.sessionNotes.getForAthlete.getData({ athleteId });
      utils.sessionNotes.getForAthlete.setData({ athleteId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          notes: old.notes.map((n: any) => ({ ...n, sharedWithAthlete: shared })),
        };
      });
      return { prev };
    },
    onSuccess: (_data, { shared }) => {
      toast.success(shared ? "All notes shared with athlete" : "All notes hidden from athlete");
    },
    onError: (err, _vars, context) => {
      if (context?.prev) {
        utils.sessionNotes.getForAthlete.setData({ athleteId }, context.prev);
      }
      toast.error(err.message || "Failed to update sharing");
    },
    onSettled: () => {
      utils.sessionNotes.getForAthlete.invalidate({ athleteId });
    },
  });

  const toggleSharingMutation = trpc.sessionNotes.toggleSharing.useMutation({
    onMutate: async ({ id, shared }) => {
      // Optimistic update
      await utils.sessionNotes.getForAthlete.cancel({ athleteId });
      const prev = utils.sessionNotes.getForAthlete.getData({ athleteId });
      utils.sessionNotes.getForAthlete.setData({ athleteId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          notes: old.notes.map((n: any) =>
            n.id === id ? { ...n, sharedWithAthlete: shared } : n
          ),
        };
      });
      return { prev };
    },
    onSuccess: (_data, { shared }) => {
      toast.success(shared ? "Note shared with athlete" : "Note hidden from athlete");
    },
    onError: (err, _vars, context) => {
      // Rollback on error
      if (context?.prev) {
        utils.sessionNotes.getForAthlete.setData({ athleteId }, context.prev);
      }
      toast.error(err.message || "Failed to update sharing");
    },
    onSettled: () => {
      utils.sessionNotes.getForAthlete.invalidate({ athleteId });
    },
  });

  const notes = data?.notes ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#DC143C]" />
        <span className="ml-2 text-muted-foreground">Loading sessions...</span>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-heading font-bold text-lg mb-2">No Session Notes Yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
          Start logging session notes for {athleteName} to track progress and generate reports.
        </p>
        {onNewNote && (
          <Button
            onClick={onNewNote}
            className="bg-[#DC143C] hover:bg-[#DC143C]/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Log First Session
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading font-bold text-lg"><InlineEdit contentKey="sessionHistory.heading" defaultValue="Session History" /></h3>
          <p className="text-sm text-muted-foreground">
            {notes.length} session{notes.length !== 1 ? "s" : ""} logged for {athleteName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk sharing buttons */}
          {notes.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  bulkToggleMutation.mutate({ athleteId, shared: true });
                }}
                disabled={bulkToggleMutation.isPending || notes.every((n: any) => n.sharedWithAthlete)}
                className="text-xs gap-1 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline"><InlineEdit contentKey="sessionHistory.btn.shareAll" defaultValue="Share All" /></span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  bulkToggleMutation.mutate({ athleteId, shared: false });
                }}
                disabled={bulkToggleMutation.isPending || notes.every((n: any) => !n.sharedWithAthlete)}
                className="text-xs gap-1 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
              >
                <EyeOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline"><InlineEdit contentKey="sessionHistory.btn.hideAll" defaultValue="Hide All" /></span>
              </Button>
            </div>
          )}
          {onNewNote && (
            <Button
              onClick={onNewNote}
              size="sm"
              className="bg-[#DC143C] hover:bg-[#DC143C]/90"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline"><InlineEdit contentKey="sessionHistory.btn.newNote" defaultValue="New Note" /></span>
              <span className="sm:hidden"><InlineEdit contentKey="sessionHistory.btn.newNoteMobile" defaultValue="Add" /></span>
            </Button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-muted" />

        {notes.map((note: any, index: number) => {
          const isExpanded = expandedNoteId === note.id;
          const skillsWorked = (note.skillsWorked as string[]) ?? [];
          const homeworkDrills = (note.homeworkDrills as Array<{ drillId: string; drillName: string }>) ?? [];
          const sessionDate = new Date(note.sessionDate);

          return (
            <div key={note.id} className="relative pl-10 pb-4">
              {/* Timeline dot */}
              <div
                className={`absolute left-2.5 top-3 h-3 w-3 rounded-full border-2 transition-colors ${
                  isExpanded
                    ? "bg-[#DC143C] border-[#DC143C]"
                    : "bg-background border-border"
                }`}
              />

              {/* Card */}
              <div
                className={`glass-card rounded-xl overflow-hidden transition-all duration-200 ${
                  isExpanded ? "ring-1 ring-[#DC143C]/30" : ""
                }`}
              >
                {/* Collapsed header — always visible */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedNoteId(isExpanded ? null : note.id)
                  }
                  className="w-full text-left p-3 md:p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-bold text-sm md:text-base">
                        {(note as any).sessionLabel || `Session #${note.sessionNumber}`}
                      </span>
                      {note.blastSessionId && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 font-medium">
                          <Zap className="h-2.5 w-2.5" />
                          Blast
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {sessionDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {note.duration && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {note.duration}min
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {skillsWorked.slice(0, 3).map((skill: string) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${
                            SKILL_COLORS[skill] ?? "bg-muted/60 text-muted-foreground"
                          }`}
                        >
                          {skill}
                        </Badge>
                      ))}
                      {skillsWorked.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 bg-muted/40 text-muted-foreground"
                        >
                          +{skillsWorked.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {note.overallRating && note.overallRating > 0 && (
                      <div className="flex items-center gap-0.5">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-medium text-yellow-400">
                          {note.overallRating}
                        </span>
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-3 md:px-4 pb-3 md:pb-4 space-y-3 border-t border-border/60 pt-3 animate-in slide-in-from-top-2 duration-200">
                    {/* Blast notes show metrics only; regular notes show improved/needs work */}
                    {note.blastSessionId ? (
                      <div>
                        <h4 className="text-xs font-semibold text-[#DC143C] uppercase tracking-wider mb-1">
                          <InlineEdit contentKey="sessionHistory.heading.blastMetrics" defaultValue="Session Blast Metrics" />
                        </h4>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          {note.whatImproved}
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* What Improved */}
                        {note.whatImproved && (
                          <div>
                            <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">
                              <InlineEdit contentKey="sessionHistory.heading.whatImproved" defaultValue="What Improved" />
                            </h4>
                            <p className="text-sm text-foreground/80 leading-relaxed">
                              {note.whatImproved}
                            </p>
                          </div>
                        )}

                        {/* What Needs Work */}
                        {note.whatNeedsWork && (
                          <div>
                            <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
                              <InlineEdit contentKey="sessionHistory.heading.whatNeedsWork" defaultValue="What Needs Work" />
                            </h4>
                            <p className="text-sm text-foreground/80 leading-relaxed">
                              {note.whatNeedsWork}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Homework Drills */}
                    {homeworkDrills.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-[#DC143C] uppercase tracking-wider mb-1.5">
                          <InlineEdit contentKey="sessionHistory.heading.homeworkDrills" defaultValue="Homework Drills" />
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {homeworkDrills.map((d: any) => (
                            <Badge
                              key={d.drillId}
                              variant="secondary"
                              className="bg-[#DC143C]/10 text-[#DC143C] border-[#DC143C]/20 text-xs"
                            >
                              <Dumbbell className="h-3 w-3 mr-1" />
                              {d.drillName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Blast Metrics (if linked) */}
                    {note.blastSessionId && (
                      <BlastMetricsBadge blastSessionId={note.blastSessionId} />
                    )}

                    {/* Private Notes */}
                    {note.privateNotes && (
                      <div className="bg-muted/30 rounded-lg p-3 border border-border/60">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          <InlineEdit contentKey="sessionHistory.heading.privateNotes" defaultValue="Private Notes" />
                        </h4>
                        <p className="text-sm text-foreground/60 italic">
                          {note.privateNotes}
                        </p>
                      </div>
                    )}

                    {/* Sharing Toggle */}
                    <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3 border border-border/60">
                      <div className="flex items-center gap-2">
                        {note.sharedWithAthlete ? (
                          <Eye className="h-4 w-4 text-green-400" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <span className="text-sm font-medium">
                            {note.sharedWithAthlete ? "Shared with athlete" : "Hidden from athlete"}
                          </span>
                          <p className="text-[11px] text-muted-foreground">
                            {note.sharedWithAthlete
                              ? "Athlete can see this note on their portal"
                              : "Only visible to coaches"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={!!note.sharedWithAthlete}
                        onCheckedChange={(checked) => {
                          toggleSharingMutation.mutate({ id: note.id, shared: checked });
                        }}
                        disabled={toggleSharingMutation.isPending}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      {onGenerateReport && (
                        <Button
                          size="sm"
                          onClick={() => onGenerateReport(note.id)}
                          className="bg-[#DC143C] hover:bg-[#DC143C]/90 text-xs"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1.5" />
                          <InlineEdit contentKey="sessionHistory.btn.generateReport" defaultValue="Generate Report" />
                        </Button>
                      )}
                      {onEditNote && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditNote(note)}
                          className="text-xs"
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                          <InlineEdit contentKey="sessionHistory.btn.edit" defaultValue="Edit" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm("Delete this session note?")) {
                            deleteMutation.mutate({ id: note.id });
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        <InlineEdit contentKey="sessionHistory.btn.delete" defaultValue="Delete" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
