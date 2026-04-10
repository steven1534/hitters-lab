import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ChevronDown, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { getDrillLevelLabel } from "@/data/drills";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

interface PathwayDrill {
  drillId: string;
  phase: "Foundation" | "Build" | "Advanced";
  note?: string;
}

interface Pathway {
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

const PATHWAYS: Pathway[] = [
  {
    id: "barrel-path",
    title: "Fix Your Barrel Path",
    subtitle: "Casting / cutting across the ball",
    problem: "Hitter swings around the ball, rolls over, or can't stay on plane",
    outcome: "Cleaner barrel path through the zone with better direction",
    timeframe: "2–3 weeks",
    level: "Intermediate",
    color: "#C8A96B",
    drills: [
      { drillId: "belly-button-tee", phase: "Foundation", note: "Build feel for contact point around the body" },
      { drillId: "extended-tee", phase: "Foundation", note: "Train a longer on-plane path" },
      { drillId: "double-tee", phase: "Build", note: "Stay on plane through two contact points" },
      { drillId: "angle-flips", phase: "Build", note: "Stay inside the ball with live feeds" },
      { drillId: "knob-inside-the-ball-toss", phase: "Advanced", note: "Keep hands inside on game-speed feeds" },
    ],
  },
  {
    id: "rhythm-load",
    title: "Build Rhythm & Load",
    subtitle: "Rushing / poor sequencing",
    problem: "Hitter rushes through the load and loses timing",
    outcome: "Controlled rhythm with proper load-to-stride sequencing",
    timeframe: "2–3 weeks",
    level: "Foundation",
    color: "#3FAE5A",
    drills: [
      { drillId: "1-2-3-drill", phase: "Foundation", note: "Learn the 1-2-3 rhythm pattern" },
      { drillId: "1-2-3-rhythm-tee", phase: "Foundation", note: "Build consistent tempo" },
      { drillId: "rhythm-tee", phase: "Build", note: "Own the rhythm without counting" },
      { drillId: "back-hip-load-tee", phase: "Build", note: "Load into the back hip with control" },
      { drillId: "fastball-front-toss", phase: "Advanced", note: "Transfer rhythm to live timing" },
    ],
  },
  {
    id: "lower-half",
    title: "Lower Half Engagement",
    subtitle: "Arms-only swing / weak rotation",
    problem: "Hitter uses only upper body, no hip turn or weight transfer",
    outcome: "Connected lower half driving the swing with rotation and ground force",
    timeframe: "3–4 weeks",
    level: "Intermediate",
    color: "#C8A96B",
    drills: [
      { drillId: "no-stride-tee", phase: "Foundation", note: "Feel rotation without stride interference" },
      { drillId: "back-hip-load-tee", phase: "Foundation", note: "Train loading into the back hip" },
      { drillId: "hip-loading-balance-disc-tee", phase: "Build", note: "Activate lower half on unstable surface" },
      { drillId: "separation-progression-tee", phase: "Build", note: "Separate lower and upper half timing" },
      { drillId: "front-hip-toss", phase: "Advanced", note: "Use lower half on inside pitches" },
    ],
  },
  {
    id: "early-commitment",
    title: "Fix Early Commitment",
    subtitle: "Flying open / lunging",
    problem: "Hitter opens front side too early or lunges forward",
    outcome: "Stays back and controlled, commits late with adjustability",
    timeframe: "2–3 weeks",
    level: "Intermediate",
    color: "#C8A96B",
    drills: [
      { drillId: "9045even-progression-tee", phase: "Foundation", note: "Control shoulder opening from exaggerated angles" },
      { drillId: "back-net-constraint-tee", phase: "Foundation", note: "Constraint prevents lunging forward" },
      { drillId: "change-up-tee", phase: "Build", note: "Stay back on offspeed timing" },
      { drillId: "change-up-front-toss", phase: "Build", note: "React to change of speed" },
      { drillId: "double-tee", phase: "Advanced", note: "Choose inside/outside without committing early" },
    ],
  },
  {
    id: "pitch-recognition",
    title: "Pitch Recognition & Decisions",
    subtitle: "Chasing / poor pitch selection",
    problem: "Hitter swings at everything or can't identify pitch type",
    outcome: "Better pitch selection with disciplined quality at-bats",
    timeframe: "3–4 weeks",
    level: "Advanced",
    color: "#C74646",
    drills: [
      { drillId: "fastball-front-toss", phase: "Foundation", note: "Build timing with consistent feeds" },
      { drillId: "off-speed-front-toss", phase: "Build", note: "Recognize and adjust to offspeed" },
      { drillId: "color-front-toss", phase: "Build", note: "Identify color cues for go/no-go" },
      { drillId: "random-front-toss", phase: "Advanced", note: "React to random speed and location" },
      { drillId: "three-plate-front-toss", phase: "Advanced", note: "Maintain approach at varying distances" },
    ],
  },
  {
    id: "youth-foundation",
    title: "Youth Foundation Series",
    subtitle: "First-year hitters",
    problem: "Young hitter needs basic swing fundamentals",
    outcome: "Solid foundation for contact, balance, and basic mechanics",
    timeframe: "4–6 weeks",
    level: "Foundation",
    color: "#3FAE5A",
    drills: [
      { drillId: "belly-button-tee", phase: "Foundation", note: "Learn contact point around the body" },
      { drillId: "1-2-3-drill", phase: "Foundation", note: "Learn load-stride-swing sequence" },
      { drillId: "no-stride-tee", phase: "Foundation", note: "Focus on compact swing" },
      { drillId: "location-tee", phase: "Build", note: "Learn inside/middle/outside contact" },
      { drillId: "bottom-hand-tee", phase: "Build", note: "Strengthen lead hand connection" },
    ],
  },
  {
    id: "vision-tracking",
    title: "Vision & Tracking",
    subtitle: "Late recognition / slow eyes",
    problem: "Hitter picks up the ball late, slow to react",
    outcome: "Earlier ball recognition and faster visual processing",
    timeframe: "2–3 weeks",
    level: "Advanced",
    color: "#C74646",
    drills: [
      { drillId: "fastball-front-toss", phase: "Foundation", note: "Track consistent feeds out of hand" },
      { drillId: "angle-flips", phase: "Build", note: "Track from a different angle" },
      { drillId: "backside-angle-toss", phase: "Build", note: "Pick up the ball from backside angle" },
      { drillId: "color-front-toss", phase: "Advanced", note: "Identify visual cues in flight" },
      { drillId: "random-front-toss", phase: "Advanced", note: "Process varying speeds and locations" },
    ],
  },
  {
    id: "contact-quality",
    title: "Contact Quality & Bat Control",
    subtitle: "Weak contact / poor direction",
    problem: "Hitter makes contact but ball has no carry or direction",
    outcome: "Higher exit velocity with consistent barrel accuracy",
    timeframe: "3–4 weeks",
    level: "Intermediate",
    color: "#C8A96B",
    drills: [
      { drillId: "belly-button-tee", phase: "Foundation", note: "Clean up contact point feel" },
      { drillId: "location-tee", phase: "Foundation", note: "Match contact point to location" },
      { drillId: "extended-tee", phase: "Build", note: "Stay through the ball longer" },
      { drillId: "bottom-hand-tee", phase: "Build", note: "Strengthen lead-side control" },
      { drillId: "top-hand-tee", phase: "Advanced", note: "Develop top-hand bat control" },
    ],
  },
  {
    id: "separation-power",
    title: "Separation & Power Transfer",
    subtitle: "Disconnected swing / weak power",
    problem: "Upper and lower half fire together, no separation or torque",
    outcome: "Elastic separation creating power through proper sequencing",
    timeframe: "3–4 weeks",
    level: "Advanced",
    color: "#C74646",
    drills: [
      { drillId: "back-hip-load-tee", phase: "Foundation", note: "Feel loading into the back hip" },
      { drillId: "separation-progression-tee", phase: "Foundation", note: "Build separation through progression" },
      { drillId: "9045even-progression-tee", phase: "Build", note: "Control front shoulder through angles" },
      { drillId: "front-hip-toss", phase: "Build", note: "Drive with the lower half" },
      { drillId: "three-plate-front-toss", phase: "Advanced", note: "Transfer power at varying timing windows" },
    ],
  },
];

const PHASE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Foundation: { bg: "bg-foundation/10", text: "text-foundation", dot: "bg-foundation" },
  Build: { bg: "bg-gold/10", text: "text-gold", dot: "bg-gold" },
  Advanced: { bg: "bg-advanced/10", text: "text-advanced", dot: "bg-advanced" },
};

export default function Pathways() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const { data: progressList = [] } = trpc.progress.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const completedDrillIds = useMemo(
    () => new Set(progressList.map((p: { drillId: string }) => p.drillId)),
    [progressList]
  );

  return (
    <div className="film-room min-h-screen bg-background">
      <SiteNav />

      {/* Hero */}
      <header className="border-b border-film-border bg-canvas">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
          <p className="mb-1 font-heading text-[0.65rem] font-bold uppercase tracking-[0.15em] text-gold">
            Structured Development
          </p>
          <h1 className="font-display text-3xl font-black uppercase tracking-wider text-film-fg sm:text-4xl md:text-5xl">
            Training Pathways
          </h1>
          <p className="mt-3 max-w-xl text-[0.8rem] leading-relaxed text-film-muted">
            Follow a structured sequence of drills designed to fix specific issues. Each pathway takes
            you from Foundation &rarr; Build &rarr; Advanced with 5 carefully selected drills.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="grid gap-4">
          {PATHWAYS.map((pathway) => {
            const isOpen = expandedId === pathway.id;
            return (
              <div
                key={pathway.id}
                className="rounded-[2px] border border-film-border bg-surface transition-colors"
                style={{ borderLeftWidth: 3, borderLeftColor: pathway.color }}
              >
                {/* Pathway header */}
                <button
                  onClick={() => setExpandedId(isOpen ? null : pathway.id)}
                  className="flex w-full items-start justify-between gap-4 p-5 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className="rounded-[1px] px-2 py-0.5 font-heading text-[0.55rem] font-bold uppercase tracking-[0.12em]"
                        style={{
                          backgroundColor: `${pathway.color}20`,
                          color: pathway.color,
                        }}
                      >
                        {pathway.level}
                      </span>
                      <span className="flex items-center gap-1 text-[0.6rem] text-film-muted">
                        <Clock className="h-3 w-3" />
                        {pathway.timeframe}
                      </span>
                    </div>
                    <h3 className="font-heading text-[1.1rem] font-bold tracking-wide text-film-fg">
                      {pathway.title}
                    </h3>
                    <p className="mt-0.5 text-[0.72rem] text-film-muted">
                      {pathway.subtitle}
                    </p>
                    {isAuthenticated && (() => {
                      const done = pathway.drills.filter((d) => completedDrillIds.has(d.drillId)).length;
                      const total = pathway.drills.length;
                      if (done === 0) return null;
                      return (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1 flex-1 max-w-[120px] rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-foundation transition-all" style={{ width: `${(done / total) * 100}%` }} />
                          </div>
                          <span className="text-[0.6rem] text-foundation font-medium">{done}/{total}</span>
                        </div>
                      );
                    })()}
                  </div>
                  <ChevronDown
                    className={`mt-1 h-4 w-4 shrink-0 text-film-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t border-film-border px-5 pb-5 pt-4">
                    {/* Problem / Outcome */}
                    <div className="mb-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[2px] border border-film-border bg-surface-raised p-3">
                        <span className="block font-heading text-[0.55rem] font-bold uppercase tracking-[0.12em] text-advanced">
                          Problem
                        </span>
                        <span className="block mt-1 text-[0.75rem] text-film-fg">
                          {pathway.problem}
                        </span>
                      </div>
                      <div className="rounded-[2px] border border-film-border bg-surface-raised p-3">
                        <span className="block font-heading text-[0.55rem] font-bold uppercase tracking-[0.12em] text-foundation">
                          Outcome
                        </span>
                        <span className="block mt-1 text-[0.75rem] text-film-fg">
                          {pathway.outcome}
                        </span>
                      </div>
                    </div>

                    {/* Drill sequence */}
                    <h4 className="mb-3 font-heading text-[0.6rem] font-bold uppercase tracking-[0.12em] text-film-muted">
                      Drill Sequence ({pathway.drills.length} drills)
                    </h4>
                    <div className="space-y-2">
                      {pathway.drills.map((pd, idx) => {
                        const pc = PHASE_COLORS[pd.phase];
                        return (
                          <Link key={pd.drillId} href={`/drill/${pd.drillId}`}>
                            <div className="group flex items-center gap-3 rounded-[2px] border border-film-border bg-canvas px-4 py-3 transition-colors hover:border-gold/30 hover:bg-surface-raised cursor-pointer">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 font-heading text-[0.6rem] font-bold text-film-muted">
                                {idx + 1}
                              </span>
                              <span className={`shrink-0 rounded-[1px] px-1.5 py-0.5 font-heading text-[0.5rem] font-bold uppercase tracking-[0.1em] ${pc.bg} ${pc.text}`}>
                                {pd.phase}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="block text-[0.8rem] font-medium text-film-fg group-hover:text-gold transition-colors">
                                  {pd.drillId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                </span>
                                {pd.note && (
                                  <span className="block text-[0.65rem] text-film-muted">{pd.note}</span>
                                )}
                              </div>
                              {completedDrillIds.has(pd.drillId) ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-foundation" />
                              ) : (
                                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-film-muted opacity-0 transition-opacity group-hover:opacity-100" />
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
