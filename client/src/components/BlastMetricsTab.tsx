import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Users, TrendingUp, Zap, Target,
  ChevronRight, BarChart3, Gauge, Crosshair, Plus, UserPlus, Trash2, Link2, FileText, Pencil, FileSpreadsheet, Download,
  Search, ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from "recharts";
import { AddBlastSession } from "./AddBlastSession";
import { AddBlastPlayer } from "./AddBlastPlayer";
import { DeleteBlastSession } from "./DeleteBlastSession";
import { LinkBlastPlayer } from "./LinkBlastPlayer";
import { EditBlastSession, type SessionData } from "./EditBlastSession";
import { ImportBlastCSV } from "./ImportBlastCSV";
import { InlineEdit } from "./InlineEdit";
import { exportHtmlToPdf } from "@/lib/exportPdf";

// Metric display config
const METRIC_CONFIGS = {
  batSpeed: { label: "Bat Speed", unit: "mph", key: "batSpeedMph", color: "#DC143C", icon: Zap },
  onPlaneEff: { label: "On-Plane Efficiency", unit: "%", key: "onPlaneEfficiencyPercent", color: "#14b8a6", icon: Target },
  attackAngle: { label: "Attack Angle", unit: "deg", key: "attackAngleDeg", color: "#84cc16", icon: Crosshair },
  exitVelocity: { label: "Exit Velocity", unit: "mph", key: "exitVelocityMph", color: "#8b5cf6", icon: Gauge },
} as const;

type MetricKey = keyof typeof METRIC_CONFIGS;

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(date: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1f36] border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-white/60 mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" ? entry.value.toFixed(2) : entry.value}
        </p>
      ))}
    </div>
  );
}

export function BlastMetricsTab({
  onNavigateToReports,
}: {
  onNavigateToReports?: (userId: number) => void;
} = {}) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [sessionTypeFilter, setSessionTypeFilter] = useState("All");
  const [chartMetric1, setChartMetric1] = useState<MetricKey>("batSpeed");
  const [chartMetric2, setChartMetric2] = useState<MetricKey>("onPlaneEff");
  const [chartView, setChartView] = useState<"line" | "bar">("line");

  // Roster view filters/sort
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterLinkFilter, setRosterLinkFilter] = useState<"all" | "linked" | "unlinked">("all");
  const [rosterSort, setRosterSort] = useState<"recent" | "name" | "sessions">("recent");

  // Session table sort
  type SortKey = "date" | "type" | "batSpeed" | "onPlane" | "attackAngle" | "exitVelo";
  const [sessionSort, setSessionSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });

  // Dialog states
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [deleteSession, setDeleteSession] = useState<{
    id: string;
    date: string;
    type: string;
  } | null>(null);
  const [linkPlayerOpen, setLinkPlayerOpen] = useState(false);
  const [editSession, setEditSession] = useState<SessionData | null>(null);
  const [importCSVOpen, setImportCSVOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { data: players = [], isLoading: playersLoading } = trpc.blastMetrics.listPlayers.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 min — avoid re-fetching the heavy GROUP BY JOIN on every tab visit
  });

  const { data: player } = trpc.blastMetrics.getPlayer.useQuery(
    { playerId: selectedPlayerId! },
    { enabled: !!selectedPlayerId }
  );

  const { data: sessions = [], isLoading: sessionsLoading } = trpc.blastMetrics.getPlayerSessions.useQuery(
    { playerId: selectedPlayerId!, sessionType: sessionTypeFilter === "All" ? undefined : sessionTypeFilter },
    { enabled: !!selectedPlayerId }
  );

  const { data: sessionTypes = [] } = trpc.blastMetrics.getSessionTypes.useQuery(
    { playerId: selectedPlayerId! },
    { enabled: !!selectedPlayerId }
  );

  const { data: trends = [] } = trpc.blastMetrics.getTrends.useQuery(
    { playerId: selectedPlayerId!, sessionType: sessionTypeFilter === "All" ? undefined : sessionTypeFilter },
    { enabled: !!selectedPlayerId }
  );

  const { data: averages = [] } = trpc.blastMetrics.getAverages.useQuery(
    { playerId: selectedPlayerId! },
    { enabled: !!selectedPlayerId }
  );

  // Export blast metrics to PDF
  async function exportBlastPdf() {
    if (!player || !sessions.length) return;
    setIsExportingPdf(true);
    try {
      const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

      const sessionsRows = sessions.map((s: any) => `
        <tr>
          <td>${formatDate(s.sessionDate)}</td>
          <td>${s.sessionType || "—"}</td>
          <td>${s.batSpeedMph ? parseFloat(s.batSpeedMph).toFixed(1) + " mph" : "—"}</td>
          <td>${s.onPlaneEfficiencyPercent ? parseFloat(s.onPlaneEfficiencyPercent).toFixed(1) + "%" : "—"}</td>
          <td>${s.attackAngleDeg ? parseFloat(s.attackAngleDeg).toFixed(1) + "°" : "—"}</td>
          <td>${s.exitVelocityMph ? parseFloat(s.exitVelocityMph).toFixed(1) + " mph" : "—"}</td>
        </tr>
      `).join("");

      const averagesRows = averages.map((avg: any) => `
        <tr class="avg-row">
          <td>${avg.sessionType}</td>
          <td>${avg.sessionCount}</td>
          <td>${avg.avgBatSpeed} mph</td>
          <td>${avg.avgOnPlaneEfficiency}%</td>
          <td>${avg.avgAttackAngle}°</td>
          <td>${avg.avgExitVelocity} mph</td>
        </tr>
      `).join("");

      const html = `
        <style>
          .blast-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 13px; }
          .blast-table th { background: #f4f4f4; font-weight: 700; text-align: left; padding: 8px 10px;
            border-bottom: 2px solid #ddd; color: #333; }
          .blast-table td { padding: 7px 10px; border-bottom: 1px solid #eee; color: #444; }
          .blast-table tr:last-child td { border-bottom: none; }
          .blast-table tr:hover td { background: #fafafa; }
          .avg-row td { font-weight: 600; color: #111; background: #f9f9f9; }
          .section-title { font-size: 15px; font-weight: 700; color: #111; margin: 24px 0 10px;
            padding-bottom: 6px; border-bottom: 2px solid #DC143C; }
        </style>

        <div class="section-title">Session History (${sessions.length} sessions)</div>
        <table class="blast-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Bat Speed</th>
              <th>On-Plane Eff.</th>
              <th>Attack Angle</th>
              <th>Exit Velo</th>
            </tr>
          </thead>
          <tbody>${sessionsRows}</tbody>
        </table>

        ${averages.length > 0 ? `
          <div class="section-title">Averages by Session Type</div>
          <table class="blast-table">
            <thead>
              <tr>
                <th>Session Type</th>
                <th>Sessions</th>
                <th>Bat Speed</th>
                <th>On-Plane Eff.</th>
                <th>Attack Angle</th>
                <th>Exit Velo</th>
              </tr>
            </thead>
            <tbody>${averagesRows}</tbody>
          </table>
        ` : ""}
      `;

      const safeName = player.fullName.replace(/\s+/g, "-");
      const dateStr = new Date().toISOString().slice(0, 10);
      await exportHtmlToPdf({
        title: "Blast Motion Metrics Report",
        athleteName: player.fullName,
        date: today,
        html,
        filename: `${safeName}_BlastMetrics_${dateStr}`,
      });
    } finally {
      setIsExportingPdf(false);
    }
  }

  // Prepare chart data
  const chartData = useMemo(() => {
    return trends.map((t: any) => ({
      date: formatShortDate(t.sessionDate),
      sessionType: t.sessionType,
      batSpeedMph: t.batSpeedMph ? parseFloat(t.batSpeedMph) : null,
      onPlaneEfficiencyPercent: t.onPlaneEfficiencyPercent ? parseFloat(t.onPlaneEfficiencyPercent) : null,
      attackAngleDeg: t.attackAngleDeg ? parseFloat(t.attackAngleDeg) : null,
      exitVelocityMph: t.exitVelocityMph ? parseFloat(t.exitVelocityMph) : null,
    }));
  }, [trends]);

  // Calculate overall averages for the summary cards
  const overallAvgs = useMemo(() => {
    if (!sessions.length) return null;
    const validSessions = sessions.filter((s: any) => s.batSpeedMph);
    if (!validSessions.length) return null;
    const sum = (key: string) => validSessions.reduce((acc: number, s: any) => acc + (parseFloat(s[key]) || 0), 0);
    const avg = (key: string) => sum(key) / validSessions.length;
    return {
      batSpeed: avg("batSpeedMph"),
      onPlaneEff: avg("onPlaneEfficiencyPercent"),
      attackAngle: avg("attackAngleDeg"),
      exitVelocity: avg("exitVelocityMph"),
    };
  }, [sessions]);

  // Filter + sort the roster
  const filteredPlayers = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    let list = players.filter((p: any) => {
      const name = (p.portalName || p.fullName || "").toLowerCase();
      const blastName = (p.fullName || "").toLowerCase();
      const email = (p.portalEmail || "").toLowerCase();
      const matchesSearch = !q || name.includes(q) || blastName.includes(q) || email.includes(q);
      const matchesLink =
        rosterLinkFilter === "all" ||
        (rosterLinkFilter === "linked" && !!p.userId) ||
        (rosterLinkFilter === "unlinked" && !p.userId);
      return matchesSearch && matchesLink;
    });
    list = [...list];
    if (rosterSort === "name") {
      list.sort((a: any, b: any) =>
        (a.portalName || a.fullName || "").localeCompare(b.portalName || b.fullName || "", undefined, { sensitivity: "base" })
      );
    } else if (rosterSort === "sessions") {
      list.sort((a: any, b: any) => (b.sessionCount || 0) - (a.sessionCount || 0));
    } else {
      list.sort((a: any, b: any) => {
        const ad = a.latestSession ? new Date(a.latestSession).getTime() : 0;
        const bd = b.latestSession ? new Date(b.latestSession).getTime() : 0;
        return bd - ad;
      });
    }
    return list;
  }, [players, rosterSearch, rosterLinkFilter, rosterSort]);

  const rosterHasActiveFilters = !!rosterSearch.trim() || rosterLinkFilter !== "all";

  // Sort sessions for detail view
  const sortedSessions = useMemo(() => {
    const sortVal = (s: any, key: SortKey): number | string => {
      switch (key) {
        case "date": return s.sessionDate ? new Date(s.sessionDate).getTime() : 0;
        case "type": return (s.sessionType || "").toLowerCase();
        case "batSpeed": return s.batSpeedMph ? parseFloat(s.batSpeedMph) : -Infinity;
        case "onPlane": return s.onPlaneEfficiencyPercent ? parseFloat(s.onPlaneEfficiencyPercent) : -Infinity;
        case "attackAngle": return s.attackAngleDeg ? parseFloat(s.attackAngleDeg) : -Infinity;
        case "exitVelo": return s.exitVelocityMph ? parseFloat(s.exitVelocityMph) : -Infinity;
      }
    };
    const dirMul = sessionSort.dir === "asc" ? 1 : -1;
    return [...sessions].sort((a: any, b: any) => {
      const av = sortVal(a, sessionSort.key);
      const bv = sortVal(b, sessionSort.key);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dirMul;
      return ((av as number) - (bv as number)) * dirMul;
    });
  }, [sessions, sessionSort]);

  const toggleSort = (key: SortKey) => {
    setSessionSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "type" ? "asc" : "desc" }
    );
  };

  const sortIcon = (key: SortKey) => {
    if (sessionSort.key !== key) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sessionSort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  // Export session history to CSV
  function exportSessionsCsv() {
    if (!player || !sortedSessions.length) {
      toast.error("No sessions to export");
      return;
    }
    const header = ["Date", "Session Type", "Bat Speed (mph)", "On-Plane Efficiency (%)", "Attack Angle (deg)", "Exit Velocity (mph)"];
    const escapeCsv = (v: string) => {
      if (/[,"\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
      return v;
    };
    const rows = sortedSessions.map((s: any) => [
      s.sessionDate ? new Date(s.sessionDate).toISOString().slice(0, 10) : "",
      s.sessionType ?? "",
      s.batSpeedMph != null ? String(parseFloat(s.batSpeedMph).toFixed(2)) : "",
      s.onPlaneEfficiencyPercent != null ? String(parseFloat(s.onPlaneEfficiencyPercent).toFixed(2)) : "",
      s.attackAngleDeg != null ? String(parseFloat(s.attackAngleDeg).toFixed(2)) : "",
      s.exitVelocityMph != null ? String(parseFloat(s.exitVelocityMph).toFixed(2)) : "",
    ].map(escapeCsv).join(","));
    const csv = [header.map(escapeCsv).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = player.fullName.replace(/\s+/g, "-");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${safeName}_BlastSessions_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sortedSessions.length} session${sortedSessions.length !== 1 ? "s" : ""}`);
  }

  // ========== PLAYER ROSTER VIEW ==========
  if (!selectedPlayerId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#DC143C]/20 to-fuchsia-500/20 flex items-center justify-center border border-violet-500/20">
                <Zap className="h-5 w-5 text-violet-400" />
              </div>
              <InlineEdit contentKey="coach.blast.title" defaultValue="Blast Motion Metrics" as="span" />
            </h2>
            <InlineEdit contentKey="coach.blast.desc" defaultValue="Track swing metrics and identify trends across your players" as="p" className="text-muted-foreground mt-1" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setAddPlayerOpen(true)}
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              <InlineEdit contentKey="coach.blast.addPlayer" defaultValue="Add Player" as="span" />
            </Button>
            <Badge variant="outline" className="text-muted-foreground border-border">
              {players.length} Players
            </Badge>
          </div>
        </div>

        {/* Roster filters */}
        {players.length > 0 && (
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                className="pl-9 bg-muted/40 border-border"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
              />
            </div>
            <Select value={rosterLinkFilter} onValueChange={(v) => setRosterLinkFilter(v as any)}>
              <SelectTrigger className="w-full md:w-44 bg-muted/40 border-border">
                <SelectValue placeholder="Link status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                <SelectItem value="linked">Linked to Portal</SelectItem>
                <SelectItem value="unlinked">Not Linked</SelectItem>
              </SelectContent>
            </Select>
            <Select value={rosterSort} onValueChange={(v) => setRosterSort(v as any)}>
              <SelectTrigger className="w-full md:w-48 bg-muted/40 border-border">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent Session</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
                <SelectItem value="sessions">Most Sessions</SelectItem>
              </SelectContent>
            </Select>
            {rosterHasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setRosterSearch(""); setRosterLinkFilter("all"); }}
                className="text-xs"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {playersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse border border-border/60" />
            ))}
          </div>
        ) : players.length === 0 ? (
          <Card className="bg-muted/40 border-border">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Players Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Add players and their Blast Motion session data to start tracking swing metrics.
              </p>
              <Button
                onClick={() => setAddPlayerOpen(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Your First Player
              </Button>
            </CardContent>
          </Card>
        ) : filteredPlayers.length === 0 ? (
          <Card className="bg-muted/40 border-border">
            <CardContent className="py-12 text-center">
              <Search className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No players match your filters.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setRosterSearch(""); setRosterLinkFilter("all"); }}
              >
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlayers.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlayerId(p.id)}
                className="group text-left rounded-xl bg-muted/40 hover:bg-muted border border-border hover:border-violet-500/30 p-5 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#DC143C]/20 to-[#DC143C]/20 flex items-center justify-center border border-border text-foreground font-bold text-sm">
                      {p.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">
                        {p.portalName || p.fullName}
                      </h3>
                      {p.portalName && p.portalName !== p.fullName && (
                        <p className="text-[10px] text-white/30">Blast: {p.fullName}</p>
                      )}
                      <p className="text-xs text-white/40">
                        {p.sessionCount} session{p.sessionCount !== 1 ? "s" : ""}
                      </p>
                      {p.userId && (
                        <p className="text-[10px] text-green-400/70 mt-0.5 flex items-center gap-1">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400"></span>
                          ID: {p.userId} · {p.portalEmail || "Portal linked"}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-violet-600 transition-all group-hover:translate-x-1" />
                </div>
                {p.latestSession && (
                  <p className="text-xs text-muted-foreground/60">
                    Last session: {formatDate(p.latestSession)}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Add Player Dialog */}
        <AddBlastPlayer open={addPlayerOpen} onOpenChange={setAddPlayerOpen} />
      </div>
    );
  }

  // ========== PLAYER DETAIL DASHBOARD ==========
  const metric1Config = METRIC_CONFIGS[chartMetric1];
  const metric2Config = METRIC_CONFIGS[chartMetric2];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedPlayerId(null);
              setSessionTypeFilter("All");
            }}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/60"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Players
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground">
              {player?.fullName || "Loading..."}
            </h2>
            {player?.portalEmail && (
              <p className="text-xs text-green-400/60 flex items-center gap-1.5 mt-0.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400"></span>
                Portal: {player.portalEmail}
                {player.blastEmail && <span className="text-muted-foreground/60">| Blast: {player.blastEmail}</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setLinkPlayerOpen(true)}
            size="sm"
            variant="outline"
            className={`h-8 text-xs ${
              player?.userId
                ? "text-green-400 border-green-500/30 hover:bg-green-500/10"
                : "text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
            }`}
          >
            <Link2 className="h-3.5 w-3.5 mr-1" />
            {player?.userId ? "Linked" : "Link Account"}
          </Button>
          {player?.userId && onNavigateToReports && (
            <Button
              onClick={() => onNavigateToReports(player.userId!)}
              size="sm"
              variant="outline"
              className="h-8 text-xs text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
            >
              <FileText className="h-3.5 w-3.5 mr-1" />
              Player Reports
            </Button>
          )}
          <Button
            onClick={() => setImportCSVOpen(true)}
            size="sm"
            variant="outline"
            className="h-8 text-xs text-green-400 border-green-500/30 hover:bg-green-500/10"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
            Import CSV
          </Button>
          <Button
            onClick={exportBlastPdf}
            disabled={isExportingPdf || !sessions.length}
            size="sm"
            variant="outline"
            className="h-8 text-xs text-sky-400 border-sky-500/30 hover:bg-sky-500/10 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            {isExportingPdf ? "Exporting..." : "Export PDF"}
          </Button>
          <Button
            onClick={() => setAddSessionOpen(true)}
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <InlineEdit contentKey="coach.blast.addSession" defaultValue="Add Session" as="span" />
          </Button>
        </div>
      </div>

      {/* Summary Score Cards */}
      {overallAvgs && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: "batSpeed", label: "Bat Speed", value: `${overallAvgs.batSpeed.toFixed(1)}`, unit: "mph", color: "from-[#DC143C]/20 to-[#B91030]/20", borderColor: "border-[#DC143C]/20" },
            { key: "onPlaneEff", label: "On-Plane Eff.", value: `${overallAvgs.onPlaneEff.toFixed(1)}`, unit: "%", color: "from-teal-500/20 to-teal-600/20", borderColor: "border-teal-500/20" },
            { key: "attackAngle", label: "Attack Angle", value: `${overallAvgs.attackAngle.toFixed(1)}`, unit: "deg", color: "from-lime-500/20 to-lime-600/20", borderColor: "border-lime-500/20" },
            { key: "exitVelo", label: "Exit Velo", value: `${overallAvgs.exitVelocity.toFixed(1)}`, unit: "mph", color: "from-violet-500/20 to-violet-600/20", borderColor: "border-violet-500/20" },
          ].map((card) => (
            <div
              key={card.key}
              className={`rounded-xl bg-gradient-to-br ${card.color} border ${card.borderColor} p-4 text-center`}
            >
              <InlineEdit contentKey={`coach.blast.metric.${card.key}`} defaultValue={card.label} as="p" className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1" />
              <p className="text-2xl font-bold text-foreground">
                {card.value}
                {card.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{card.unit}</span>}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filters & Chart Controls */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={sessionTypeFilter} onValueChange={setSessionTypeFilter}>
            <SelectTrigger className="w-[200px] bg-muted/60 border-border text-foreground">
              <SelectValue placeholder="Session Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Session Types</SelectItem>
              {sessionTypes.map((type: string) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 items-center">
          <Select
            value={chartMetric1}
            onValueChange={(v) => {
              const next = v as MetricKey;
              if (next === chartMetric2) setChartMetric2(chartMetric1);
              setChartMetric1(next);
            }}
          >
            <SelectTrigger className="w-[160px] bg-muted/60 border-border text-foreground text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(METRIC_CONFIGS).map(([key, cfg]) => (
                <SelectItem key={key} value={key} disabled={key === chartMetric2}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground/60 text-xs">vs</span>
          <Select
            value={chartMetric2}
            onValueChange={(v) => {
              const next = v as MetricKey;
              if (next === chartMetric1) setChartMetric1(chartMetric2);
              setChartMetric2(next);
            }}
          >
            <SelectTrigger className="w-[160px] bg-muted/60 border-border text-foreground text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(METRIC_CONFIGS).map(([key, cfg]) => (
                <SelectItem key={key} value={key} disabled={key === chartMetric1}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex bg-muted/60 rounded-lg border border-border p-0.5">
            <button
              onClick={() => setChartView("line")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                chartView === "line" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              Line
            </button>
            <button
              onClick={() => setChartView("bar")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                chartView === "bar" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              Bar
            </button>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <Card className="bg-muted/40 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-400" />
            Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground/60 gap-3">
              <p>No session data available for the selected filters</p>
              <Button
                onClick={() => setAddSessionOpen(true)}
                size="sm"
                variant="outline"
                className="text-violet-400 border-violet-500/30 hover:bg-violet-500/10"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add First Session
              </Button>
            </div>
          ) : (
            <div className="h-72 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartView === "line" ? (
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id={`grad-${chartMetric1}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metric1Config.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={metric1Config.color} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id={`grad-${chartMetric2}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metric2Config.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={metric2Config.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                    <YAxis yAxisId="left" stroke={metric1Config.color} fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke={metric2Config.color} fontSize={11} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey={metric1Config.key}
                      name={`${metric1Config.label} (${metric1Config.unit})`}
                      stroke={metric1Config.color}
                      fill={`url(#grad-${chartMetric1})`}
                      strokeWidth={2}
                      dot={{ r: 4, fill: metric1Config.color }}
                      activeDot={{ r: 6 }}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey={metric2Config.key}
                      name={`${metric2Config.label} (${metric2Config.unit})`}
                      stroke={metric2Config.color}
                      fill={`url(#grad-${chartMetric2})`}
                      strokeWidth={2}
                      dot={{ r: 4, fill: metric2Config.color }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                    <YAxis yAxisId="left" stroke={metric1Config.color} fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke={metric2Config.color} fontSize={11} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }} />
                    <Bar
                      yAxisId="left"
                      dataKey={metric1Config.key}
                      name={`${metric1Config.label} (${metric1Config.unit})`}
                      fill={metric1Config.color}
                      radius={[4, 4, 0, 0]}
                      opacity={0.8}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey={metric2Config.key}
                      name={`${metric2Config.label} (${metric2Config.unit})`}
                      fill={metric2Config.color}
                      radius={[4, 4, 0, 0]}
                      opacity={0.8}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Averages by Session Type */}
      {averages.length > 0 && (
        <Card className="bg-muted/40 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#E8425A]" />
              Averages by Session Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium">Session Type</th>
                    <th className="text-center py-3 px-2 text-muted-foreground font-medium">Sessions</th>
                    <th className="text-center py-3 px-2 text-muted-foreground font-medium">Bat Speed</th>
                    <th className="text-center py-3 px-2 text-muted-foreground font-medium">On-Plane Eff.</th>
                    <th className="text-center py-3 px-2 text-muted-foreground font-medium">Attack Angle</th>
                    <th className="text-center py-3 px-2 text-muted-foreground font-medium">Exit Velo</th>
                  </tr>
                </thead>
                <tbody>
                  {averages.map((avg: any, idx: number) => (
                    <tr key={avg.sessionType || idx} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-3">
                        <Badge variant="outline" className="text-foreground/80 border-border font-normal">
                          {avg.sessionType}
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-2 text-muted-foreground">{avg.sessionCount}</td>
                      <td className="text-center py-3 px-2 text-[#E8425A] font-medium">{avg.avgBatSpeed} mph</td>
                      <td className="text-center py-3 px-2 text-teal-400 font-medium">{avg.avgOnPlaneEfficiency}%</td>
                      <td className="text-center py-3 px-2 text-lime-400 font-medium">{avg.avgAttackAngle}°</td>
                      <td className="text-center py-3 px-2 text-violet-400 font-medium">{avg.avgExitVelocity} mph</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session History Table */}
      <Card className="bg-muted/40 border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-400" />
              Session History
              <Badge variant="outline" className="text-muted-foreground border-border ml-2 font-normal">
                {sessions.length} sessions
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={exportSessionsCsv}
                disabled={!sortedSessions.length}
                size="sm"
                variant="outline"
                className="text-green-400 border-green-500/30 hover:bg-green-500/10 h-8 disabled:opacity-40"
                title="Export sessions as CSV"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                CSV
              </Button>
              <Button
                onClick={() => setAddSessionOpen(true)}
                size="sm"
                variant="outline"
                className="text-violet-400 border-violet-500/30 hover:bg-violet-500/10 h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground/60 space-y-3">
              <p>No sessions found for the selected filters</p>
              <Button
                onClick={() => setAddSessionOpen(true)}
                size="sm"
                variant="outline"
                className="text-violet-400 border-violet-500/30 hover:bg-violet-500/10"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Session
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium">
                      <button onClick={() => toggleSort("date")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                        Date {sortIcon("date")}
                      </button>
                    </th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                      <button onClick={() => toggleSort("type")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                        Type {sortIcon("type")}
                      </button>
                    </th>
                    <th className="text-center py-3 px-2 text-muted-foreground font-medium">
                      <button onClick={() => toggleSort("batSpeed")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors mx-auto">
                        Bat Speed {sortIcon("batSpeed")}
                      </button>
                    </th>
                    <th className="text-center py-3 px-2 text-muted-foreground font-medium">
                      <button onClick={() => toggleSort("onPlane")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors mx-auto">
                        On-Plane Eff. {sortIcon("onPlane")}
                      </button>
                    </th>
                    <th className="text-center py-3 px-2 text-muted-foreground font-medium">
                      <button onClick={() => toggleSort("attackAngle")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors mx-auto">
                        Attack Angle {sortIcon("attackAngle")}
                      </button>
                    </th>
                    <th className="text-center py-3 px-2 text-muted-foreground font-medium">
                      <button onClick={() => toggleSort("exitVelo")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors mx-auto">
                        Exit Velo {sortIcon("exitVelo")}
                      </button>
                    </th>
                    <th className="text-center py-3 px-2 text-muted-foreground font-medium">Note</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSessions.map((s: any, idx: number) => (
                    <tr key={s.id || idx} className="border-b border-border/40 hover:bg-muted/20 transition-colors group">
                      <td className="py-3 px-3 text-foreground whitespace-nowrap">{formatDate(s.sessionDate)}</td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className="text-muted-foreground border-border font-normal text-xs">
                          {s.sessionType}
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-2 text-[#E8425A] font-medium">
                        {s.batSpeedMph ? `${parseFloat(s.batSpeedMph).toFixed(1)}` : "—"}
                      </td>
                      <td className="text-center py-3 px-2 text-teal-400 font-medium">
                        {s.onPlaneEfficiencyPercent ? `${parseFloat(s.onPlaneEfficiencyPercent).toFixed(1)}%` : "—"}
                      </td>
                      <td className="text-center py-3 px-2 text-lime-400 font-medium">
                        {s.attackAngleDeg ? `${parseFloat(s.attackAngleDeg).toFixed(1)}°` : "—"}
                      </td>
                      <td className="text-center py-3 px-2 text-violet-400 font-medium">
                        {s.exitVelocityMph ? `${parseFloat(s.exitVelocityMph).toFixed(1)}` : "—"}
                      </td>
                      <td className="text-center py-3 px-2">
                        {s.hasLinkedNote ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400/80" title="Linked to Session Note">
                            <FileText className="h-3 w-3" />
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                      <td className="py-3 px-1">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditSession(s as SessionData)}
                            className="p-1.5 rounded-md hover:bg-amber-500/10 text-muted-foreground/60 hover:text-amber-400"
                            title="Edit session"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteSession({
                              id: s.id,
                              date: formatDate(s.sessionDate),
                              type: s.sessionType || "Unknown",
                            })}
                            className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground/60 hover:text-red-400"
                            title="Delete session"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Session Dialog */}
      {selectedPlayerId && player && (
        <AddBlastSession
          open={addSessionOpen}
          onOpenChange={setAddSessionOpen}
          playerId={selectedPlayerId}
          playerName={player.fullName}
        />
      )}

      {/* Link Player Dialog */}
      {selectedPlayerId && player && (
        <LinkBlastPlayer
          open={linkPlayerOpen}
          onOpenChange={setLinkPlayerOpen}
          playerId={selectedPlayerId}
          playerName={player.fullName}
          currentUserId={player.userId ?? null}
          currentPortalName={player.portalName ?? null}
          currentPortalEmail={player.portalEmail ?? null}
        />
      )}

      {/* Edit Session Dialog */}
      {player && (
        <EditBlastSession
          open={!!editSession}
          onOpenChange={(open) => { if (!open) setEditSession(null); }}
          session={editSession}
          playerName={player.fullName}
        />
      )}

      {/* Import CSV Dialog */}
      {selectedPlayerId && player && (
        <ImportBlastCSV
          open={importCSVOpen}
          onOpenChange={setImportCSVOpen}
          playerId={selectedPlayerId}
          playerName={player.fullName}
        />
      )}

      {/* Delete Session Dialog */}
      {deleteSession && player && (
        <DeleteBlastSession
          open={!!deleteSession}
          onOpenChange={(open) => { if (!open) setDeleteSession(null); }}
          sessionId={deleteSession.id}
          sessionDate={deleteSession.date}
          sessionType={deleteSession.type}
          playerName={player.fullName}
        />
      )}
    </div>
  );
}
