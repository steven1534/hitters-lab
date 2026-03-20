import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Target,
  Crosshair,
  Gauge,
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  BarChart3,
} from "lucide-react";

interface MetricConfig {
  label: string;
  key: string;
  unit: string;
  color: string;
  icon: any;
  isScore?: boolean;
}

const METRIC_CONFIGS: MetricConfig[] = [
  { label: "Bat Speed", key: "batSpeedMph", unit: "mph", color: "text-[#E8425A]", icon: Zap },
  { label: "On-Plane Eff.", key: "onPlaneEfficiencyPercent", unit: "%", color: "text-emerald-400", icon: Target },
  { label: "Attack Angle", key: "attackAngleDeg", unit: "°", color: "text-lime-400", icon: Crosshair },
  { label: "Exit Velo", key: "exitVelocityMph", unit: "mph", color: "text-violet-400", icon: Gauge },
];

export function AthleteBlastMetrics() {
  const { data, isLoading } = trpc.blastMetrics.getMyBlastData.useQuery();
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);

  if (isLoading) {
    return (
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-violet-400" />
          <h3 className="font-bold text-foreground">Blast Metrics</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        </div>
      </div>
    );
  }

  if (!data?.player || data.sessions.length === 0) return null;

  const sessions = data.sessions;
  const latestSession = sessions[0]; // Already sorted desc
  const displaySessions = showAllSessions ? sessions : sessions.slice(0, 5);

  // Compute trend: compare latest to previous session
  const prevSession = sessions.length > 1 ? sessions[1] : null;

  function getTrend(key: string): "up" | "down" | "same" | null {
    if (!prevSession || !latestSession) return null;
    const curr = parseFloat((latestSession as any)[key]);
    const prev = parseFloat((prevSession as any)[key]);
    if (isNaN(curr) || isNaN(prev)) return null;
    if (curr > prev) return "up";
    if (curr < prev) return "down";
    return "same";
  }

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-violet-400" />
          Blast Metrics
        </h3>
        <Badge className="bg-violet-500/20 text-violet-400 border border-violet-500/30">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Latest Session Highlights */}
      {latestSession && (
        <div className="glass-card rounded-xl p-4 mb-3 border-glow" style={{ borderColor: "rgba(139, 92, 246, 0.15)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-violet-400 uppercase tracking-wide">Latest Session</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(latestSession.sessionDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: "America/New_York",
              })}
              {latestSession.sessionType && (
                <span className="ml-1.5 text-violet-400/60">· {latestSession.sessionType}</span>
              )}
            </span>
          </div>

          {/* Key metrics grid */}
          <div className="grid grid-cols-3 gap-2">
            {METRIC_CONFIGS.slice(0, 6).map((config) => {
              const val = (latestSession as any)[config.key];
              if (val == null) return null;
              const trend = getTrend(config.key);
              const Icon = config.icon;

              return (
                <div
                  key={config.key}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 text-center"
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Icon className={`h-3 w-3 ${config.color}`} />
                    {trend === "up" && <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />}
                    {trend === "down" && <TrendingUp className="h-2.5 w-2.5 text-red-400 rotate-180" />}
                  </div>
                  <p className={`text-lg font-bold ${config.color}`}>
                    {config.isScore ? val : parseFloat(val).toFixed(1)}
                  </p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
                    {config.label}
                    {config.unit && <span className="ml-0.5 text-white/20">{config.unit}</span>}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Session History */}
      <div className="space-y-2">
        {displaySessions.map((session: any) => {
          const isExpanded = expandedSession === session.id;
          const metricsWithValues = METRIC_CONFIGS.filter((c) => session[c.key] != null);

          return (
            <div
              key={session.id}
              className="glass-card rounded-xl overflow-hidden border border-white/5"
            >
              <button
                onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                className="w-full text-left p-3 flex items-center gap-3"
              >
                <div className="h-9 w-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-4 w-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground text-sm truncate">
                    {session.sessionType || "General"} Session
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {new Date(session.sessionDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "America/New_York",
                    })}
                    {session.batSpeedMph && (
                      <span className="text-[#E8425A] ml-1">
                        {parseFloat(session.batSpeedMph).toFixed(1)} mph
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

              {isExpanded && metricsWithValues.length > 0 && (
                <div className="px-3 pb-3 border-t border-white/5 pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    {metricsWithValues.map((config) => {
                      const val = session[config.key];
                      const Icon = config.icon;
                      return (
                        <div
                          key={config.key}
                          className="flex items-center gap-2 bg-white/[0.02] rounded-lg px-2.5 py-2"
                        >
                          <Icon className={`h-3.5 w-3.5 ${config.color} flex-shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground truncate">{config.label}</p>
                            <p className={`text-sm font-semibold ${config.color}`}>
                              {config.isScore ? val : parseFloat(val).toFixed(1)}
                              {config.unit && (
                                <span className="text-[10px] text-white/30 ml-0.5">{config.unit}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show more button */}
      {sessions.length > 5 && !showAllSessions && (
        <button
          onClick={() => setShowAllSessions(true)}
          className="w-full mt-2 py-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          Show all {sessions.length} sessions
        </button>
      )}
    </div>
  );
}
