import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Clock, CheckCircle2, Target } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export interface PathwayDrill {
  drillId: string;
  phase: "Foundation" | "Build" | "Advanced";
  note?: string;
}

export interface Pathway {
  id: string;
  title: string;
  subtitle: string;
  problem: string;
  outcome: string;
  timeframe: string;
  level: "Foundation" | "Intermediate" | "Advanced";
  color: string;
  drills: PathwayDrill[];
}

// Exported so the coach plan editor and athlete My Plan card can both
// reference the static pathway list (slug -> title lookup).
export const PATHWAYS: Pathway[] = [
  {
    id: "barrel-path", title: "Fix Your Barrel Path", subtitle: "Casting / cutting across the ball",
    problem: "Hitter swings around the ball, rolls over, or can't stay on plane",
    outcome: "Cleaner barrel path through the zone with better direction",
    timeframe: "2–3 weeks", level: "Intermediate", color: "#C8A96B",
    drills: [
      { drillId: "belly-button-tee", phase: "Foundation", note: "Build feel for contact point around the body" },
      { drillId: "extended-tee", phase: "Foundation", note: "Train a longer on-plane path" },
      { drillId: "double-tee", phase: "Build", note: "Stay on plane through two contact points" },
      { drillId: "angle-flips", phase: "Build", note: "Stay inside the ball with live feeds" },
      { drillId: "knob-inside-the-ball-toss", phase: "Advanced", note: "Keep hands inside on game-speed feeds" },
    ],
  },
  {
    id: "rhythm-load", title: "Build Rhythm & Load", subtitle: "Rushing / poor sequencing",
    problem: "Hitter rushes through the load and loses timing",
    outcome: "Controlled rhythm with proper load-to-stride sequencing",
    timeframe: "2–3 weeks", level: "Foundation", color: "#3FAE5A",
    drills: [
      { drillId: "1-2-3-drill", phase: "Foundation", note: "Learn the 1-2-3 rhythm pattern" },
      { drillId: "1-2-3-rhythm-tee", phase: "Foundation", note: "Build consistent tempo" },
      { drillId: "rhythm-tee", phase: "Build", note: "Own the rhythm without counting" },
      { drillId: "back-hip-load-tee", phase: "Build", note: "Load into the back hip with control" },
      { drillId: "fastball-front-toss", phase: "Advanced", note: "Transfer rhythm to live timing" },
    ],
  },
  {
    id: "lower-half", title: "Lower Half Engagement", subtitle: "Arms-only swing / weak rotation",
    problem: "Hitter uses only upper body, no hip turn or weight transfer",
    outcome: "Connected lower half driving the swing with rotation and ground force",
    timeframe: "3–4 weeks", level: "Intermediate", color: "#C8A96B",
    drills: [
      { drillId: "no-stride-tee", phase: "Foundation", note: "Feel rotation without stride interference" },
      { drillId: "back-hip-load-tee", phase: "Foundation", note: "Train loading into the back hip" },
      { drillId: "hip-loading-balance-disc-tee", phase: "Build", note: "Activate lower half on unstable surface" },
      { drillId: "separation-progression-tee", phase: "Build", note: "Separate lower and upper half timing" },
      { drillId: "front-hip-toss", phase: "Advanced", note: "Use lower half on inside pitches" },
    ],
  },
  {
    id: "early-commitment", title: "Fix Early Commitment", subtitle: "Flying open / lunging",
    problem: "Hitter opens front side too early or lunges forward",
    outcome: "Stays back and controlled, commits late with adjustability",
    timeframe: "2–3 weeks", level: "Intermediate", color: "#C8A96B",
    drills: [
      { drillId: "9045even-progression-tee", phase: "Foundation", note: "Control shoulder opening from exaggerated angles" },
      { drillId: "back-net-constraint-tee", phase: "Foundation", note: "Constraint prevents lunging forward" },
      { drillId: "change-up-tee", phase: "Build", note: "Stay back on offspeed timing" },
      { drillId: "change-up-front-toss", phase: "Build", note: "React to change of speed" },
      { drillId: "double-tee", phase: "Advanced", note: "Choose inside/outside without committing early" },
    ],
  },
  {
    id: "pitch-recognition", title: "Pitch Recognition & Decisions", subtitle: "Chasing / poor pitch selection",
    problem: "Hitter swings at everything or can't identify pitch type",
    outcome: "Better pitch selection with disciplined quality at-bats",
    timeframe: "3–4 weeks", level: "Advanced", color: "#C74646",
    drills: [
      { drillId: "fastball-front-toss", phase: "Foundation", note: "Build timing with consistent feeds" },
      { drillId: "off-speed-front-toss", phase: "Build", note: "Recognize and adjust to offspeed" },
      { drillId: "color-front-toss", phase: "Build", note: "Identify color cues for go/no-go" },
      { drillId: "random-front-toss", phase: "Advanced", note: "React to random speed and location" },
      { drillId: "three-plate-front-toss", phase: "Advanced", note: "Maintain approach at varying distances" },
    ],
  },
  {
    id: "youth-foundation", title: "Youth Foundation Series", subtitle: "First-year hitters",
    problem: "Young hitter needs basic swing fundamentals",
    outcome: "Solid foundation for contact, balance, and basic mechanics",
    timeframe: "4–6 weeks", level: "Foundation", color: "#3FAE5A",
    drills: [
      { drillId: "belly-button-tee", phase: "Foundation", note: "Learn contact point around the body" },
      { drillId: "1-2-3-drill", phase: "Foundation", note: "Learn load-stride-swing sequence" },
      { drillId: "no-stride-tee", phase: "Foundation", note: "Focus on compact swing" },
      { drillId: "location-tee", phase: "Build", note: "Learn inside/middle/outside contact" },
      { drillId: "bottom-hand-tee", phase: "Build", note: "Strengthen lead hand connection" },
    ],
  },
  {
    id: "vision-tracking", title: "Vision & Tracking", subtitle: "Late recognition / slow eyes",
    problem: "Hitter picks up the ball late, slow to react",
    outcome: "Earlier ball recognition and faster visual processing",
    timeframe: "2–3 weeks", level: "Advanced", color: "#C74646",
    drills: [
      { drillId: "fastball-front-toss", phase: "Foundation", note: "Track consistent feeds out of hand" },
      { drillId: "angle-flips", phase: "Build", note: "Track from a different angle" },
      { drillId: "backside-angle-toss", phase: "Build", note: "Pick up the ball from backside angle" },
      { drillId: "color-front-toss", phase: "Advanced", note: "Identify visual cues in flight" },
      { drillId: "random-front-toss", phase: "Advanced", note: "Process varying speeds and locations" },
    ],
  },
  {
    id: "contact-quality", title: "Contact Quality & Bat Control", subtitle: "Weak contact / poor direction",
    problem: "Hitter makes contact but ball has no carry or direction",
    outcome: "Higher exit velocity with consistent barrel accuracy",
    timeframe: "3–4 weeks", level: "Intermediate", color: "#C8A96B",
    drills: [
      { drillId: "belly-button-tee", phase: "Foundation", note: "Clean up contact point feel" },
      { drillId: "location-tee", phase: "Foundation", note: "Match contact point to location" },
      { drillId: "extended-tee", phase: "Build", note: "Stay through the ball longer" },
      { drillId: "bottom-hand-tee", phase: "Build", note: "Strengthen lead-side control" },
      { drillId: "top-hand-tee", phase: "Advanced", note: "Develop top-hand bat control" },
    ],
  },
  {
    id: "separation-power", title: "Separation & Power Transfer", subtitle: "Disconnected swing / weak power",
    problem: "Upper and lower half fire together, no separation or torque",
    outcome: "Elastic separation creating power through proper sequencing",
    timeframe: "3–4 weeks", level: "Advanced", color: "#C74646",
    drills: [
      { drillId: "back-hip-load-tee", phase: "Foundation", note: "Feel loading into the back hip" },
      { drillId: "separation-progression-tee", phase: "Foundation", note: "Build separation through progression" },
      { drillId: "9045even-progression-tee", phase: "Build", note: "Control front shoulder through angles" },
      { drillId: "front-hip-toss", phase: "Build", note: "Drive with the lower half" },
      { drillId: "three-plate-front-toss", phase: "Advanced", note: "Transfer power at varying timing windows" },
    ],
  },
];

const LEVEL_COLORS: Record<string, { color: string; bg: string }> = {
  Foundation: { color: "#3FAE5A", bg: "rgba(63,174,90,0.08)" },
  Intermediate: { color: "#C8A96B", bg: "rgba(200,169,107,0.08)" },
  Advanced: { color: "#C74646", bg: "rgba(199,70,70,0.08)" },
};

const PHASE_COLORS: Record<string, { color: string; bg: string }> = {
  Foundation: { color: "#3FAE5A", bg: "rgba(63,174,90,0.10)" },
  Build: { color: "#C8A96B", bg: "rgba(200,169,107,0.10)" },
  Advanced: { color: "#C74646", bg: "rgba(199,70,70,0.10)" },
};

export default function Pathways() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const { data: progressList = [] } = trpc.progress.list.useQuery(undefined, { enabled: isAuthenticated });
  const completedDrillIds = useMemo(
    () => new Set(progressList.map((p: { drillId: string }) => p.drillId)),
    [progressList]
  );

  const selectedPathway = PATHWAYS.find((p) => p.id === selectedId);

  return (
    <div className="film-room min-h-screen bg-background pt-14">
      <SiteNav />

      {/* Detail view */}
      {selectedPathway ? (
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 animate-fade-up">
          <button
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-1.5 mb-6 font-heading text-[0.7rem] font-semibold uppercase tracking-wider transition-colors hover:text-gold"
            style={{ color: "#B8BCC4", letterSpacing: "0.1em" }}
          >
            <ArrowLeft size={14} /> Back to Pathways
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="rounded-sm px-2 py-0.5 font-heading text-[0.58rem] font-bold uppercase" style={{ letterSpacing: "0.12em", color: LEVEL_COLORS[selectedPathway.level].color, background: LEVEL_COLORS[selectedPathway.level].bg }}>
                {selectedPathway.level}
              </span>
              <span className="flex items-center gap-1 font-heading text-[0.62rem] text-film-muted" style={{ letterSpacing: "0.08em" }}>
                <Clock size={10} /> {selectedPathway.timeframe}
              </span>
            </div>
            <h1 className="font-heading text-2xl font-black tracking-wide text-film-fg sm:text-3xl">{selectedPathway.title}</h1>
            <p className="mt-1 text-[0.85rem] text-film-muted">{selectedPathway.subtitle}</p>

            {/* Progress bar */}
            {isAuthenticated && (() => {
              const done = selectedPathway.drills.filter((d) => completedDrillIds.has(d.drillId)).length;
              const total = selectedPathway.drills.length;
              return (
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 max-w-xs rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(done / total) * 100}%`, background: selectedPathway.color }} />
                  </div>
                  <span className="font-heading text-[0.65rem] font-semibold" style={{ color: selectedPathway.color }}>{done}/{total} complete</span>
                </div>
              );
            })()}
          </div>

          {/* Problem / Outcome */}
          <div className="grid gap-3 sm:grid-cols-2 mb-8">
            <div className="rounded-sm p-4" style={{ background: "rgba(255,255,255,0.03)", borderLeft: `2px solid ${selectedPathway.color}50` }}>
              <span className="block font-heading text-[0.55rem] font-bold uppercase tracking-widest" style={{ color: "#C74646" }}>Problem</span>
              <p className="mt-1 text-[0.8rem] text-film-fg">{selectedPathway.problem}</p>
            </div>
            <div className="rounded-sm p-4" style={{ background: "rgba(255,255,255,0.03)", borderLeft: "2px solid rgba(63,174,90,0.5)" }}>
              <span className="block font-heading text-[0.55rem] font-bold uppercase tracking-widest" style={{ color: "#3FAE5A" }}>Outcome</span>
              <p className="mt-1 text-[0.8rem] text-film-fg">{selectedPathway.outcome}</p>
            </div>
          </div>

          {/* Drill list */}
          <h2 className="mb-4 font-heading text-[0.65rem] font-bold uppercase tracking-widest text-film-muted">
            Drill Sequence ({selectedPathway.drills.length} drills)
          </h2>
          <div className="space-y-2">
            {selectedPathway.drills.map((pd, idx) => {
              const pc = PHASE_COLORS[pd.phase];
              const done = completedDrillIds.has(pd.drillId);
              return (
                <Link key={pd.drillId} href={`/drill/${pd.drillId}`}>
                  <div className="group flex items-center gap-3 rounded-sm px-4 py-3 transition-all cursor-pointer hover:bg-white/[0.04]" style={{ background: "#151618", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-heading text-[0.6rem] font-bold" style={{ background: "rgba(255,255,255,0.05)", color: "#6B7280" }}>
                      {idx + 1}
                    </span>
                    <span className="shrink-0 rounded-sm px-1.5 py-0.5 font-heading text-[0.5rem] font-bold uppercase" style={{ letterSpacing: "0.1em", color: pc.color, background: pc.bg }}>
                      {pd.phase}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[0.8rem] font-medium text-film-fg group-hover:text-gold transition-colors">
                        {pd.drillId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                      {pd.note && <span className="block text-[0.65rem] text-film-muted">{pd.note}</span>}
                    </div>
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#3FAE5A" }} />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-film-muted opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        /* Card grid view */
        <>
          <header className="relative overflow-hidden border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.14_0.020_40)] via-[oklch(0.11_0.008_260)] to-[oklch(0.08_0.006_250)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_40%,oklch(0.22_0.04_55/0.15),transparent_70%)]" />
            <div className="absolute inset-0 noise-overlay" />
            <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-16">
              <div className="flex items-center gap-3 mb-4 animate-fade-up">
                <div className="h-px w-8 bg-gold/60" />
                <p className="font-heading text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold">
                  Structured Development
                </p>
              </div>
              <h1 className="font-display text-3xl font-black uppercase tracking-wider text-white sm:text-4xl md:text-5xl animate-fade-up stagger-1">
                Training Pathways
              </h1>
              <p className="mt-4 max-w-xl text-[0.85rem] leading-relaxed text-film-muted animate-fade-up stagger-2">
                Follow a structured sequence of drills designed to fix specific issues. Each pathway takes
                you from Foundation to Build to Advanced with 5 carefully selected drills.
              </p>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PATHWAYS.map((pathway, idx) => {
                const lc = LEVEL_COLORS[pathway.level];
                const done = pathway.drills.filter((d) => completedDrillIds.has(d.drillId)).length;
                const total = pathway.drills.length;

                return (
                  <div
                    key={pathway.id}
                    className="rounded-sm cursor-pointer transition-all animate-fade-up hover:-translate-y-0.5"
                    style={{
                      animationDelay: `${idx * 60}ms`,
                      background: "#151618",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderLeft: `3px solid ${pathway.color}`,
                    }}
                    onClick={() => setSelectedId(pathway.id)}
                  >
                    <div className="p-5">
                      {/* Level + timeframe */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="rounded-sm px-1.5 py-0.5 font-heading text-[0.58rem] font-bold uppercase" style={{ letterSpacing: "0.12em", color: lc.color, background: lc.bg }}>
                          {pathway.level}
                        </span>
                        <span className="flex items-center gap-1 font-heading text-[0.62rem]" style={{ letterSpacing: "0.08em", color: "#6B7280" }}>
                          <Clock size={10} /> {pathway.timeframe}
                        </span>
                      </div>

                      {/* Title + subtitle */}
                      <h3 className="mb-1.5 font-heading text-[1.25rem] font-extrabold leading-tight text-film-fg">{pathway.title}</h3>
                      <p className="mb-4 text-[0.78rem] leading-snug text-film-muted">{pathway.subtitle}</p>

                      {/* Problem callout */}
                      <div className="mb-4 rounded-sm px-2.5 py-1.5" style={{ background: "rgba(255,255,255,0.04)", borderLeft: `2px solid ${pathway.color}50` }}>
                        <p className="font-heading text-[0.55rem] font-bold uppercase" style={{ letterSpacing: "0.12em", color: "#6B7280", marginBottom: "2px" }}>FIXES</p>
                        <p className="text-[0.75rem]" style={{ color: "#B8BCC4" }}>{pathway.problem}</p>
                      </div>

                      {/* Phase counts */}
                      <div className="flex items-center gap-1.5 mb-3">
                        {(["Foundation", "Build", "Advanced"] as const).map((phase) => {
                          const count = pathway.drills.filter((d) => d.phase === phase).length;
                          const pc = PHASE_COLORS[phase];
                          return (
                            <div key={phase} className="flex items-center gap-1 rounded-sm px-2 py-1" style={{ background: count > 0 ? `${pc.color}12` : "rgba(255,255,255,0.03)" }}>
                              <span className="font-heading text-[0.5rem] font-bold uppercase" style={{ letterSpacing: "0.08em", color: count > 0 ? pc.color : "#4B5563" }}>{phase}</span>
                              <span className="font-heading text-[0.55rem] font-bold" style={{ color: count > 0 ? pc.color : "#4B5563" }}>{count}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Progress */}
                      {isAuthenticated && done > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(done / total) * 100}%`, background: pathway.color }} />
                          </div>
                          <span className="font-heading text-[0.55rem] font-semibold" style={{ color: pathway.color }}>{done}/{total}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
