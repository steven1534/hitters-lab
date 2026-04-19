import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Play, Clock, MapPin, Dumbbell, ChevronRight, CheckCircle,
  SkipForward, ArrowLeft, Target, Repeat,
} from "lucide-react";
import { Link } from "wouter";

export function MyRoutines() {
  const { data: myRoutines = [], isLoading } = trpc.routines.getMyRoutines.useQuery();
  const [activeSession, setActiveSession] = useState<any | null>(null);

  if (isLoading) return null;

  // Always show this block so athletes (and parents) see that routines exist —
  // otherwise the feature is invisible until the first assignment.
  if (myRoutines.length === 0) {
    return (
      <div className="glass-card rounded-xl p-4 animate-fade-in-up border border-white/10" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-electric/15 flex items-center justify-center flex-shrink-0">
            <Repeat className="w-5 h-5 text-electric" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm">Practice routines</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              When Coach Steve assigns a full session (ordered drills, reps, and cues), it shows up here so you can walk through it step by step. Nothing assigned yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-electric" />
          <h3 className="font-bold text-foreground">My Routines</h3>
        </div>
        {myRoutines.map((item: any) => {
          const r = item.routine;
          if (!r) return null;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSession(item)}
              className="w-full glass-card rounded-xl p-4 card-hover flex items-center gap-4 text-left transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#DC143C]/20 border border-[#DC143C]/30">
                <Target className="w-6 h-6 text-[#DC143C]" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground truncate">{r.name}</h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {r.durationMinutes && (
                    <Badge className="bg-white/10 text-muted-foreground text-xs border border-white/10 gap-1">
                      <Clock className="h-2.5 w-2.5" />{r.durationMinutes} min
                    </Badge>
                  )}
                  {r.location && (
                    <Badge className="bg-white/10 text-muted-foreground text-xs border border-white/10 gap-1">
                      <MapPin className="h-2.5 w-2.5" />{r.location}
                    </Badge>
                  )}
                  {item.frequency && (
                    <Badge className="bg-electric/15 text-electric text-xs border border-electric/20">{item.frequency}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{item.drills?.length || 0} drills</span>
                </div>
              </div>
              <div className="w-10 h-10 bg-[#DC143C]/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Play className="w-5 h-5 text-[#DC143C] ml-0.5" />
              </div>
            </button>
          );
        })}
      </div>

      {activeSession && (
        <SessionWalker
          routine={activeSession.routine}
          drills={activeSession.drills || []}
          onClose={() => setActiveSession(null)}
        />
      )}
    </>
  );
}

// ── Session Walker ──────────────────────────────────────────────
function SessionWalker({
  routine,
  drills,
  onClose,
}: {
  routine: any;
  drills: any[];
  onClose: () => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completedSet, setCompletedSet] = useState<Set<number>>(new Set());
  const total = drills.length;
  const drill = drills[currentIdx];
  const done = completedSet.size;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = done === total;

  function markDone() {
    setCompletedSet((prev) => new Set(prev).add(currentIdx));
    if (currentIdx < total - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  }

  function goTo(idx: number) {
    setCurrentIdx(idx);
  }

  if (!drill) return null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="p-4 pb-0">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </button>
              {routine.name}
            </DialogTitle>
          </DialogHeader>

          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#DC143C] to-electric rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">{done}/{total}</span>
          </div>
        </div>

        {/* Current drill */}
        <div className="p-4 space-y-4">
          {allDone ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">Session Complete!</h3>
              <p className="text-sm text-muted-foreground">You finished all {total} drills in this routine.</p>
              <Button onClick={onClose} className="mt-4 bg-electric hover:bg-electric/90">Done</Button>
            </div>
          ) : (
            <>
              <div className="glass rounded-xl p-5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-electric uppercase tracking-wide">Step {currentIdx + 1} of {total}</span>
                  {completedSet.has(currentIdx) && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">Done</Badge>
                  )}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{drill.drillName}</h3>

                <div className="flex flex-wrap gap-2 mb-3">
                  {drill.reps && (
                    <Badge variant="outline" className="text-xs">{drill.reps} reps</Badge>
                  )}
                  {drill.sets && (
                    <Badge variant="outline" className="text-xs">{drill.sets} sets</Badge>
                  )}
                  {drill.durationSeconds && (
                    <Badge variant="outline" className="text-xs gap-1"><Clock className="h-2.5 w-2.5" />{drill.durationSeconds}s</Badge>
                  )}
                </div>

                {drill.coachNotes && (
                  <div className="bg-[#DC143C]/10 rounded-lg px-3 py-2 border border-[#DC143C]/20">
                    <p className="text-xs text-[#DC143C] font-medium mb-0.5">Coach says:</p>
                    <p className="text-sm text-foreground">{drill.coachNotes}</p>
                  </div>
                )}

                <Link href={`/drill/${drill.drillId}`}>
                  <span className="text-xs text-electric hover:underline mt-2 inline-block">View full drill details →</span>
                </Link>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={markDone}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {completedSet.has(currentIdx) ? "Already Done" : "Mark Done & Next"}
                </Button>
                {currentIdx < total - 1 && (
                  <Button variant="outline" onClick={() => setCurrentIdx(currentIdx + 1)} className="gap-1">
                    Skip <SkipForward className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Drill list / stepper */}
        {!allDone && (
          <div className="border-t border-white/10 p-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium">All steps</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {drills.map((d: any, idx: number) => {
                const isDone = completedSet.has(idx);
                const isCurrent = idx === currentIdx;
                return (
                  <button
                    key={`${d.drillId}-${idx}`}
                    onClick={() => goTo(idx)}
                    className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                      isCurrent ? "bg-electric/15 text-electric" : isDone ? "text-emerald-400 opacity-60" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    ) : (
                      <span className="w-3.5 text-center text-xs flex-shrink-0">{idx + 1}</span>
                    )}
                    <span className="truncate">{d.drillName}</span>
                    {isCurrent && <ChevronRight className="h-3 w-3 ml-auto flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
