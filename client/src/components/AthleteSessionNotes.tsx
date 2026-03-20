import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { BlastMetricsBadge } from "./BlastMetricsBadge";
import { InlineEdit } from "@/components/InlineEdit";
import {
  FileText,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  TrendingUp,
  TrendingDown,
  Zap,
  Loader2,
} from "lucide-react";

const SKILL_COLORS: Record<string, string> = {
  "Swing Mechanics": "bg-[#DC143C]/20 text-[#E8425A] border-[#DC143C]/30",
  "Pitch Recognition": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Plate Approach": "bg-[#DC143C]/20 text-[#E8425A] border-[#DC143C]/30",
  "Bat Speed Development": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Exit Velocity": "bg-green-500/20 text-green-400 border-green-500/30",
  "Timing & Rhythm": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Game IQ / Situational Awareness": "bg-rose-500/20 text-rose-400 border-rose-500/30",
  "Confidence / Mindset": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Contact Quality": "bg-teal-500/20 text-teal-400 border-teal-500/30",
};

export function AthleteSessionNotes() {
  const { data: notes = [], isLoading } = trpc.sessionNotes.getMyNotes.useQuery();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-[#E8425A]" />
          <h3 className="font-bold text-foreground">Session Notes</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#E8425A]" />
        </div>
      </div>
    );
  }

  if (notes.length === 0) return null;

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#E8425A]" />
          Session Notes
        </h3>
        <Badge className="bg-[#DC143C]/20 text-[#E8425A] border border-[#DC143C]/30">
          {notes.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {notes.map((note: any) => {
          const isExpanded = expandedId === note.id;
          const skills = (note.skillsWorked as string[]) || [];
          const homework = (note.homeworkDrills as Array<{ drillId: string; drillName: string }>) || [];

          return (
            <div
              key={note.id}
              className="glass-card rounded-xl overflow-hidden border border-white/5"
            >
              {/* Header - always visible */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : note.id)}
                className="w-full text-left p-4 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-lg bg-[#DC143C]/10 border border-[#DC143C]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#E8425A]">#{note.sessionNumber}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate text-sm">
                    {note.sessionLabel || `Session #${note.sessionNumber}`}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(note.sessionDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "America/New_York",
                      })}
                    </span>
                    {note.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {note.duration} min
                      </span>
                    )}
                    {note.blastSessionId && (
                      <span className="flex items-center gap-1 text-violet-400">
                        <Zap className="h-3 w-3" />
                        Blast
                      </span>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                  {/* Skills worked */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                            SKILL_COLORS[skill] || "bg-white/10 text-white/60 border-white/20"
                          }`}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Blast notes show metrics only; regular notes show improved/needs work */}
                  {note.blastSessionId ? (
                    <div className="bg-[#DC143C]/5 border border-[#DC143C]/15 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Zap className="h-3.5 w-3.5 text-[#DC143C]" />
                        <span className="text-xs font-semibold text-[#DC143C]"><InlineEdit contentKey="sessionHistory.heading.blastMetrics" defaultValue="Session Blast Metrics" /></span>
                      </div>
                      <p className="text-xs text-white/70 leading-relaxed">{note.whatImproved}</p>
                    </div>
                  ) : (
                    <>
                      {/* What improved */}
                      {note.whatImproved && (
                        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-xs font-semibold text-emerald-400"><InlineEdit contentKey="sessionHistory.heading.whatImproved" defaultValue="What Improved" /></span>
                          </div>
                          <p className="text-xs text-white/70 leading-relaxed">{note.whatImproved}</p>
                        </div>
                      )}

                      {/* What needs work */}
                      {note.whatNeedsWork && (
                        <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <TrendingDown className="h-3.5 w-3.5 text-amber-400" />
                            <span className="text-xs font-semibold text-amber-400"><InlineEdit contentKey="sessionHistory.heading.whatNeedsWork" defaultValue="What to Work On" /></span>
                          </div>
                          <p className="text-xs text-white/70 leading-relaxed">{note.whatNeedsWork}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Homework drills */}
                  {homework.length > 0 && (
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Dumbbell className="h-3.5 w-3.5 text-electric" />
                        <span className="text-xs font-semibold text-electric"><InlineEdit contentKey="sessionHistory.heading.homeworkDrills" defaultValue="Homework Drills" /></span>
                      </div>
                      <div className="space-y-1">
                        {homework.map((drill, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs text-white/60"
                          >
                            <div className="w-1 h-1 rounded-full bg-electric/60" />
                            {drill.drillName}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Linked Blast metrics */}
                  {note.blastSessionId && (
                    <BlastMetricsBadge blastSessionId={note.blastSessionId} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
