import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, Plus, Trash2, CheckCircle, Clock, AlertCircle, Search, 
  Sparkles, Video, Upload, MessageSquare, BarChart3, Activity, Users, 
  LayoutTemplate, Edit3, ArrowLeftRight, FileText, ChevronRight,
  Zap, Target, TrendingUp, Shield, Table2
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAllDrills } from "@/hooks/useAllDrills";
import { BulkInstructionImport } from "@/components/BulkInstructionImport";
import { BulkGoalUpload } from "@/components/BulkGoalUpload";
import { AthleteProgressReport } from "@/components/AthleteProgressReport";
import { AthleteAssignmentOverview } from "@/components/AthleteAssignmentOverview";
import { DrillPageBuilderNotion } from "@/components/DrillPageBuilderNotion";
import { AthleteTable } from "@/components/AthleteTable";
import PracticePlanner from "@/components/PracticePlanner";
import { SessionNotesTab } from "@/components/SessionNotesTab";
import { VideoAnalysisTab } from "@/components/VideoAnalysisTab";
import { BlastMetricsTab } from "@/components/BlastMetricsTab";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { InlineEdit } from "@/components/InlineEdit";

interface Drill {
  id: string;
  name: string;
  difficulty: string;
  categories: string[];
  duration: string;
}

// Quick action card data
const quickActions = [
  { label: "Drill Directory", shortLabel: "Drills", href: "/", icon: Search, color: "from-[#DC143C]/20 to-[#DC143C]/20", iconColor: "text-[#E8425A]" },
  { label: "AI Generator", shortLabel: "AI", href: "/drill-generator", icon: Zap, color: "from-[#DC143C]/20 to-fuchsia-500/20", iconColor: "text-violet-400" },
  { label: "Manage Videos", shortLabel: "Videos", href: "/manage-drill-videos", icon: Video, color: "from-orange-500/20 to-amber-500/20", iconColor: "text-orange-400" },
  { label: "User Management", shortLabel: "Users", href: "/user-management", icon: Users, color: "from-green-500/20 to-emerald-500/20", iconColor: "text-green-400" },
];

export default function CoachDashboard() {
  useScrollRestoration();
  const { user, loading } = useAuth();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchDrill, setSearchDrill] = useState("");
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "assign" | "bulk-import" | "bulk-goals" | "page-layouts" | "athletes" | "planner" | "session-notes" | "video-analysis" | "blast-metrics">("overview");
  const [editingLayoutDrill, setEditingLayoutDrill] = useState<{ id: string; name: string } | null>(null);
  const [layoutSearchQuery, setLayoutSearchQuery] = useState("");
  const [isBulkGoalOpen, setIsBulkGoalOpen] = useState(false);
  const [showProgressReport, setShowProgressReport] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  const utils = trpc.useUtils();

  const { data: allUsers = [] } = trpc.admin.getAllUsers.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const { data: allInvites = [] } = trpc.invites.getAllInvites.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const athleteOptions = useMemo(() => {
    const options: { id: string; name: string; email: string; type: 'user' | 'invite'; status?: string }[] = [];
    allUsers.forEach((u: any) => {
      if (u.role !== 'admin') {
        options.push({ id: `user-${u.id}`, name: u.name || `User ${u.id}`, email: u.email || '', type: 'user' });
      }
    });
    allInvites.forEach((inv: any) => {
      if (inv.status === 'pending') {
        const existingUser = allUsers.find((u: any) => u.email === inv.email);
        if (!existingUser) {
          options.push({ id: `invite-${inv.id}`, name: inv.name || inv.email.split('@')[0], email: inv.email, type: 'invite', status: 'pending' });
        }
      }
      if (inv.status === 'accepted') {
        const existingUser = allUsers.find((u: any) => u.email === inv.email);
        if (!existingUser) {
          options.push({ id: `invite-${inv.id}`, name: inv.name || inv.email.split('@')[0], email: inv.email, type: 'invite', status: 'accepted' });
        }
      }
    });
    return options;
  }, [allUsers, allInvites]);

  const { data: allAssignments = [] } = trpc.drillAssignments.getAllAssignments.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const assignDrillMutation = trpc.drillAssignments.assignDrill.useMutation();
  const unassignDrillMutation = trpc.drillAssignments.unassignDrill.useMutation();
  const updateStatusMutation = trpc.drillAssignments.updateStatus.useMutation();

  const allDrills = useAllDrills();

  const filteredDrills = useMemo(() => {
    return (allDrills as Drill[]).filter(drill =>
      drill.name.toLowerCase().includes(searchDrill.toLowerCase())
    ).slice(0, 10);
  }, [searchDrill, allDrills]);

  const userAssignments = useMemo(() => {
    if (!selectedUser) return [];
    if (selectedUser.startsWith('invite-')) {
      const inviteId = parseInt(selectedUser.replace('invite-', ''));
      return allAssignments.filter((a: any) => a.inviteId === inviteId);
    } else {
      const userId = parseInt(selectedUser.replace('user-', ''));
      return allAssignments.filter((a: any) => a.userId === userId);
    }
  }, [selectedUser, allAssignments]);

  // Stats
  const totalAthletes = athleteOptions.length;
  const totalAssignments = allAssignments.length;
  const completedAssignments = allAssignments.filter((a: any) => a.status === "completed").length;
  const inProgressAssignments = allAssignments.filter((a: any) => a.status === "in-progress").length;

  const handleAssignDrill = async () => {
    if (!selectedUser || !selectedDrill) return;
    try {
      if (selectedUser.startsWith('invite-')) {
        const inviteId = parseInt(selectedUser.replace('invite-', ''));
        await assignDrillMutation.mutateAsync({
          inviteId, drillId: selectedDrill.id, drillName: selectedDrill.name,
          difficulty: selectedDrill.difficulty, duration: selectedDrill.duration,
        });
      } else {
        const userId = parseInt(selectedUser.replace('user-', ''));
        await assignDrillMutation.mutateAsync({
          userId, drillId: selectedDrill.id, drillName: selectedDrill.name,
          difficulty: selectedDrill.difficulty, duration: selectedDrill.duration,
        });
      }
      setSelectedDrill(null);
      setSearchDrill("");
    } catch (error) {
      console.error("Failed to assign drill:", error);
    }
  };

  const handleUnassignDrill = async (assignmentId: number) => {
    try {
      await unassignDrillMutation.mutateAsync({ assignmentId });
      await utils.drillAssignments.getAllAssignments.invalidate();
    } catch (error) {
      console.error("Failed to unassign drill:", error);
    }
  };

  const handleStatusUpdate = async (assignmentId: number, status: "assigned" | "in-progress" | "completed") => {
    try {
      await updateStatusMutation.mutateAsync({ assignmentId, status });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-[#DC143C]/30 border-t-[#DC143C] animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-heading font-bold">Access Denied</h2>
          <p className="text-muted-foreground">Only coaches (admins) can access the drill assignment dashboard.</p>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Directory
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.18_0.01_25)] via-[oklch(0.15_0.005_0)] to-[oklch(0.12_0.01_20)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.50_0.20_25/0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,oklch(0.45_0.18_25/0.1),transparent_60%)]" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(oklch(0.9_0_0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.9_0_0) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />

        <div className="container relative z-10 py-6 md:py-10">
          {/* Top nav */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/">
              <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 gap-2 text-sm">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Directory</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="text-white/70 hover:text-white hover:bg-white/10 gap-2 text-sm"
              >
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline"><InlineEdit contentKey="coach.btn.quickActions" defaultValue="Quick Actions" as="span" /></span>
              </Button>
              <Button
                onClick={() => setIsBulkGoalOpen(true)}
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10 gap-2 text-sm"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline"><InlineEdit contentKey="coach.btn.bulkGoals" defaultValue="Bulk Goals" as="span" /></span>
              </Button>
              <Button
                onClick={() => setActiveTab(activeTab === "bulk-import" ? "overview" : "bulk-import")}
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10 gap-2 text-sm"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline"><InlineEdit contentKey="coach.btn.bulkImport" defaultValue="Bulk Import" as="span" /></span>
              </Button>
            </div>
          </div>

          {/* Title */}
          <div className="mb-8">
            <InlineEdit contentKey="coach.title" defaultValue="Coach Dashboard" as="h1" className="text-3xl md:text-5xl font-heading font-black text-white tracking-tight" />
            <InlineEdit contentKey="coach.subtitle" defaultValue="Manage your athletes, assign drills, and track progress all in one place." as="p" className="text-white/60 mt-2 text-sm md:text-base max-w-lg" />
          </div>

          {/* Stats Row */}
          <section aria-label="Dashboard Statistics" className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {[
              { key: "athletes", label: "Athletes", value: totalAthletes, icon: Users, color: "text-[#E8425A]" },
              { key: "assigned", label: "Assigned", value: totalAssignments, icon: Target, color: "text-amber-400" },
              { key: "inProgress", label: "In Progress", value: inProgressAssignments, icon: Clock, color: "text-purple-400" },
              { key: "completed", label: "Completed", value: completedAssignments, icon: TrendingUp, color: "text-green-400" },
            ].map((stat) => (
              <div key={stat.key} className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-xl p-3 md:p-4" role="status" aria-label={`${stat.label}: ${stat.value}`}>
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} aria-hidden="true" />
                  <InlineEdit contentKey={`coach.stat.${stat.key}.label`} defaultValue={stat.label} as="span" className="text-white/50 text-xs font-medium uppercase tracking-wider" />
                </div>
                <p className="text-2xl md:text-3xl font-heading font-black text-white">{stat.value}</p>
              </div>
            ))}
          </section>

          {/* Quick Actions Grid (collapsible) */}
          {showQuickActions && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-sm border border-white/[0.08] hover:border-white/[0.15] rounded-xl p-3 transition-all duration-200 cursor-pointer group">
                    <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-2`}>
                      <action.icon className={`h-4 w-4 ${action.iconColor}`} />
                    </div>
                    <p className="text-white/80 text-xs font-medium group-hover:text-white transition-colors">
                      <span className="hidden sm:inline">{action.label}</span>
                      <span className="sm:hidden">{action.shortLabel}</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="w-full overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
            <nav role="tablist" aria-label="Coach Dashboard Navigation" className="flex gap-1 bg-white/[0.06] backdrop-blur-sm rounded-xl p-1 border border-white/[0.08] w-max md:w-fit">
              {[
                { key: "overview" as const, label: "Athlete Overview", shortLabel: "Overview", icon: Users },
                { key: "assign" as const, label: "Assign Drills", shortLabel: "Assign", icon: Plus },
                { key: "page-layouts" as const, label: "Page Layouts", shortLabel: "Layouts", icon: LayoutTemplate },
                { key: "athletes" as const, label: "Athletes Table", shortLabel: "Athletes", icon: Table2 },
                { key: "planner" as const, label: "Practice Planner", shortLabel: "Planner", icon: Target },
                { key: "session-notes" as const, label: "Session Notes", shortLabel: "Notes", icon: FileText },
                { key: "video-analysis" as const, label: "Video Analysis", shortLabel: "AI Video", icon: Sparkles },
                { key: "blast-metrics" as const, label: "Blast Metrics", shortLabel: "Blast", icon: Activity },
              ].map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  aria-controls={`panel-${tab.key}`}
                  aria-label={tab.label}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap touch-target ${
                    activeTab === tab.key
                      ? "bg-white/[0.15] text-white shadow-sm"
                      : "text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
                  }`}
                >
                  <tab.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline"><InlineEdit contentKey={`coach.tab.${tab.key}.label`} defaultValue={tab.label} as="span" /></span>
                  <span className="sm:hidden"><InlineEdit contentKey={`coach.tab.${tab.key}.short`} defaultValue={tab.shortLabel} as="span" /></span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main role="tabpanel" aria-label={`${activeTab} panel`} className="container max-w-7xl pb-8 md:pb-12 px-3 md:px-4 py-6 md:py-8">
        <BulkGoalUpload isOpen={isBulkGoalOpen} onClose={() => setIsBulkGoalOpen(false)} />
        
        {activeTab === "overview" ? (
          <AthleteAssignmentOverview 
            onSelectAthlete={(athleteId) => {
              setSelectedUser(athleteId);
              setActiveTab("assign");
            }} 
          />
        ) : activeTab === "athletes" ? (
          <AthleteTable />
        ) : activeTab === "planner" ? (
          <PracticePlanner />
        ) : activeTab === "session-notes" ? (
          <SessionNotesTab />
        ) : activeTab === "video-analysis" ? (
          <VideoAnalysisTab />
        ) : activeTab === "blast-metrics" ? (
          <BlastMetricsTab />
        ) : activeTab === "page-layouts" ? (
          <div className="space-y-6">
            {editingLayoutDrill ? (
              <DrillPageBuilderNotion
                drillId={editingLayoutDrill.id}
                drillName={editingLayoutDrill.name}
                onClose={() => setEditingLayoutDrill(null)}
              />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <InlineEdit contentKey="coach.pageLayouts.title" defaultValue="Drill Page Layouts" as="h2" className="text-2xl font-heading font-bold" />
                    <InlineEdit contentKey="coach.pageLayouts.desc" defaultValue="Pick a drill to create or edit its page layout with the block editor." as="p" className="text-muted-foreground mt-1 text-sm" />
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search drills..."
                      value={layoutSearchQuery}
                      onChange={(e) => setLayoutSearchQuery(e.target.value)}
                      className="pl-10 bg-card/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allDrills
                    .filter((d) => d.name.toLowerCase().includes(layoutSearchQuery.toLowerCase()))
                    .map((drill) => (
                      <div
                        key={drill.id}
                        className="glass-card rounded-xl p-4 cursor-pointer transition-all duration-200 hover:bg-white/[0.08] hover:border-[#DC143C]/30 group"
                        onClick={() => setEditingLayoutDrill({ id: String(drill.id), name: drill.name })}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#DC143C]/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:from-[#DC143C]/30 group-hover:to-purple-500/30 transition-all">
                            <Edit3 className="h-5 w-5 text-[#DC143C]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate group-hover:text-[#DC143C] transition-colors">{drill.name}</p>
                            <p className="text-xs text-muted-foreground">{drill.difficulty} · {drill.categories?.join(", ")}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                </div>
                {allDrills.filter((d) => d.name.toLowerCase().includes(layoutSearchQuery.toLowerCase())).length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <LayoutTemplate className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No drills found</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeTab === "bulk-import" ? (
          <div className="max-w-4xl mx-auto">
            <BulkInstructionImport />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Left: User Selection & Drill Assignment */}
            <div className="lg:col-span-1 space-y-4">
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-4 md:p-5 border-b border-white/[0.06]">
                  <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#DC143C]/20 to-[#DC143C]/20 flex items-center justify-center">
                      <Plus className="h-4 w-4 text-[#DC143C]" />
                    </div>
                    <InlineEdit contentKey="coach.assign.title" defaultValue="Assign Drill" as="span" />
                  </h3>
                </div>
                <div className="p-4 md:p-5 space-y-4">
                  {/* User Selection */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">Select Athlete</label>
                    <Select value={selectedUser || ""} onValueChange={(val) => setSelectedUser(val)}>
                      <SelectTrigger className="bg-white/[0.04] border-white/[0.08]">
                        <SelectValue placeholder="Choose athlete..." />
                      </SelectTrigger>
                      <SelectContent>
                        {athleteOptions.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground text-center">
                            No athletes found. Invite athletes from Admin Dashboard.
                          </div>
                        ) : (
                          athleteOptions.map((athlete) => (
                            <SelectItem key={athlete.id} value={athlete.id}>
                              <div className="flex items-center gap-2">
                                <span>{athlete.name}</span>
                                {athlete.type === 'invite' && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Pending</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Drill Search */}
                  {selectedUser && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">Search Drill</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Type drill name..."
                          value={searchDrill}
                          onChange={(e) => setSearchDrill(e.target.value)}
                          className="pl-9 text-sm bg-white/[0.04] border-white/[0.08]"
                        />
                      </div>

                      {searchDrill && filteredDrills.length > 0 && (
                        <div className="mt-2 border border-white/[0.08] rounded-lg max-h-48 overflow-y-auto bg-card/80 backdrop-blur-sm">
                          {filteredDrills.map(drill => (
                            <button
                              key={drill.id}
                              onClick={() => setSelectedDrill(drill)}
                              className={`w-full text-left px-3 py-2.5 hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-0 ${
                                selectedDrill?.id === drill.id ? "bg-[#DC143C]/10 border-l-2 border-l-[#DC143C]" : ""
                              }`}
                            >
                              <div className="font-medium text-sm">{drill.name}</div>
                              <div className="text-xs text-muted-foreground">{drill.difficulty} · {drill.categories?.join(", ")}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected Drill */}
                  {selectedDrill && (
                    <div className="bg-gradient-to-br from-[#DC143C]/10 to-purple-500/10 border border-[#DC143C]/20 p-4 rounded-xl">
                      <div className="font-semibold text-sm mb-2">{selectedDrill.name}</div>
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        <Badge variant="outline" className="text-[10px] border-[#DC143C]/30 text-[#DC143C]">{selectedDrill.difficulty}</Badge>
                        {selectedDrill.categories.map(cat => (
                          <Badge key={cat} variant="secondary" className="text-[10px]">{cat}</Badge>
                        ))}
                      </div>
                      <Button
                        onClick={handleAssignDrill}
                        disabled={assignDrillMutation.isPending}
                        className="w-full bg-[#DC143C] hover:bg-[#DC143C]/90 text-white text-sm"
                        size="sm"
                      >
                        {assignDrillMutation.isPending ? "Assigning..." : "Assign Drill"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Assignments List or Progress Report */}
            <div className="lg:col-span-2">
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-4 md:p-5 border-b border-white/[0.06] flex items-center justify-between">
                  <h3 className="font-heading font-bold text-lg">
                    {selectedUser
                      ? showProgressReport
                        ? `${athleteOptions.find(a => a.id === selectedUser)?.name || 'Athlete'}'s Progress`
                        : `${athleteOptions.find(a => a.id === selectedUser)?.name || 'Athlete'}'s Assignments`
                      : "Select an athlete"}
                  </h3>
                  {selectedUser && selectedUser.startsWith('user-') && (
                    <Button
                      variant={showProgressReport ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowProgressReport(!showProgressReport)}
                      className="gap-2 text-xs"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      {showProgressReport ? "Assignments" : "Progress"}
                    </Button>
                  )}
                </div>
                <div className="p-4 md:p-5">
                  {selectedUser && showProgressReport && selectedUser.startsWith('user-') ? (
                    <AthleteProgressReport
                      userId={parseInt(selectedUser.replace('user-', ''))}
                      athleteName={athleteOptions.find(a => a.id === selectedUser)?.name || 'Athlete'}
                    />
                  ) : selectedUser && userAssignments.length > 0 ? (
                    <div className="space-y-3">
                      {userAssignments.map((assignment: any) => (
                        <div key={assignment.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200 group">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-base mb-2 truncate group-hover:text-[#DC143C] transition-colors">{assignment.drillName}</h4>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  className={`text-[10px] ${
                                    assignment.status === "completed"
                                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                                      : assignment.status === "in-progress"
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                      : "bg-white/[0.06] text-muted-foreground border-white/[0.1]"
                                  }`}
                                  variant="outline"
                                >
                                  {assignment.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                                  {assignment.status === "in-progress" && <Clock className="h-3 w-3 mr-1" />}
                                  {assignment.status === "assigned" && <AlertCircle className="h-3 w-3 mr-1" />}
                                  {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(assignment.assignedAt).toLocaleDateString()}
                                </span>
                              </div>
                              {assignment.notes && (
                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{assignment.notes}</p>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <Select
                                value={assignment.status}
                                onValueChange={(status: any) => handleStatusUpdate(assignment.id, status)}
                              >
                                <SelectTrigger className="w-28 text-xs h-8 bg-white/[0.04] border-white/[0.08]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="assigned">Assigned</SelectItem>
                                  <SelectItem value="in-progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnassignDrill(assignment.id)}
                                disabled={unassignDrillMutation.isPending}
                                className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 h-8"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedUser ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <div className="h-16 w-16 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                        <Target className="h-8 w-8 opacity-30" />
                      </div>
                      <p className="font-medium">No drills assigned yet</p>
                      <p className="text-sm mt-1">Search and select a drill on the left to assign.</p>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <div className="h-16 w-16 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                        <Users className="h-8 w-8 opacity-30" />
                      </div>
                      <p className="font-medium">Select an athlete</p>
                      <p className="text-sm mt-1">Choose an athlete from the dropdown to view their assignments.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
