import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  ArrowLeft, Plus, Trash2, CheckCircle, Clock, AlertCircle, Search, 
  Sparkles, Video, Upload, MessageSquare, BarChart3, Activity, Users, 
  LayoutTemplate, Edit3, ArrowLeftRight, FileText, ChevronRight,
  Zap, Target, TrendingUp, Shield, Table2, LayoutDashboard, ClipboardList,
  BookOpen, StickyNote, Menu, X as XIcon, UserPlus, Mail,
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAllDrills } from "@/hooks/useAllDrills";
import { BulkInstructionImport } from "@/components/BulkInstructionImport";
import { BulkImportCustomDrills } from "@/components/BulkImportCustomDrills";
import { BulkGoalUpload } from "@/components/BulkGoalUpload";
import { AthleteProgressReport } from "@/components/AthleteProgressReport";
import { AthleteAssignmentOverview } from "@/components/AthleteAssignmentOverview";
import { DrillPageBuilderNotion } from "@/components/DrillPageBuilderNotion";
import { AthleteTable } from "@/components/AthleteTable";
import PracticePlanner from "@/components/PracticePlanner";
import { SessionNotesTab } from "@/components/SessionNotesTab";
import { PlayerReportsTab } from "@/components/PlayerReportsTab";
import { VideoAnalysisTab } from "@/components/VideoAnalysisTab";
import { BlastMetricsTab } from "@/components/BlastMetricsTab";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { InlineEdit } from "@/components/InlineEdit";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { AddNewDrill } from "@/components/AddNewDrill";

interface Drill {
  id: string;
  name: string;
  difficulty: string;
  categories: string[];
  duration: string;
}

type ActiveTab = "overview" | "assign" | "bulk-import" | "bulk-goals" | "page-layouts" | "athletes" | "planner" | "session-notes" | "player-reports" | "video-analysis" | "blast-metrics";

// ── Sidebar nav config ────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "Athletes",
    items: [
      { key: "overview" as ActiveTab, label: "Overview", icon: LayoutDashboard },
      { key: "athletes" as ActiveTab, label: "Athletes Table", icon: Users },
    ],
  },
  {
    label: "Training",
    items: [
      { key: "assign" as ActiveTab, label: "Assign Drills", icon: Plus },
      { key: "planner" as ActiveTab, label: "Practice Planner", icon: Target },
      { key: "page-layouts" as ActiveTab, label: "Page Layouts", icon: LayoutTemplate },
    ],
  },
  {
    label: "Reports",
    items: [
      { key: "player-reports" as ActiveTab, label: "Player Reports", icon: BookOpen },
      { key: "session-notes" as ActiveTab, label: "Session Notes", icon: StickyNote },
    ],
  },
  {
    label: "Analytics",
    items: [
      { key: "blast-metrics" as ActiveTab, label: "Blast Metrics", icon: Activity },
      { key: "video-analysis" as ActiveTab, label: "Video Analysis", icon: Sparkles },
    ],
  },
];

const TAB_LABELS: Record<ActiveTab, string> = {
  overview: "Athlete Overview",
  assign: "Assign Drills",
  "bulk-import": "Bulk Import",
  "bulk-goals": "Bulk Goals",
  "page-layouts": "Page Layouts",
  athletes: "Athletes Table",
  planner: "Practice Planner",
  "session-notes": "Session Notes",
  "player-reports": "Player Reports",
  "video-analysis": "Video Analysis",
  "blast-metrics": "Blast Metrics",
};

// ── Invite User Dialog ────────────────────────────────────────
function InviteUserButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const utils = trpc.useUtils();

  const inviteMutation = trpc.invites.createInvite.useMutation({
    onSuccess: (data: any) => {
      utils.invites.getAllInvites.invalidate();
      const link = data?.inviteUrl || `https://app.coachstevebaseball.com/accept-invite/${data?.inviteToken}`;
      setInviteLink(link);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create invite");
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setOpen(false);
    setEmail("");
    setInviteLink("");
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New User
          </DialogTitle>
        </DialogHeader>

        {!inviteLink ? (
          <>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Athlete email address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="athlete@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    onKeyDown={(e) => { if (e.key === "Enter" && email) inviteMutation.mutate({ email }); }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={() => inviteMutation.mutate({ email })}
                disabled={!email || inviteMutation.isPending}
              >
                {inviteMutation.isPending ? "Creating..." : "Generate Invite Link"}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-800">Invite created for</p>
              <p className="text-green-700 text-sm">{email}</p>
            </div>
            <div className="space-y-2">
              <Label>Share this link with the athlete</Label>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs" />
                <Button size="sm" onClick={handleCopy} className="shrink-0">
                  {copied ? <CheckCircle className="h-4 w-4" /> : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Send this link via text or email. It expires in 7 days.</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CoachDashboard() {
  useScrollRestoration();
  const { user, loading } = useAuth();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchDrill, setSearchDrill] = useState("");
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [editingLayoutDrill, setEditingLayoutDrill] = useState<{ id: string; name: string } | null>(null);
  const [layoutSearchQuery, setLayoutSearchQuery] = useState("");
  const [isBulkGoalOpen, setIsBulkGoalOpen] = useState(false);
  const [showProgressReport, setShowProgressReport] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const navigate = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="coach-dark min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-[#DC143C]/30 border-t-[#DC143C] animate-spin" />
          <p className="text-white/40 animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="coach-dark min-h-screen flex items-center justify-center p-4">
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

  // ── Sidebar ────────────────────────────────────────────────
  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={mobile
      ? "flex flex-col h-full bg-[#0a0a0a] border-r border-white/[0.06] w-64 py-6"
      : "hidden lg:flex flex-col h-full bg-[#0a0a0a] border-r border-white/[0.06] w-56 py-6 shrink-0"
    }>
      {/* Logo / Title */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-[#DC143C] flex items-center justify-center shrink-0">
            <Target className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white font-bold text-sm leading-tight">Coach Dashboard</span>
        </div>
        <p className="text-white/30 text-[11px] pl-9">Coach Steve Baseball</p>
      </div>

      {/* Stats strip */}
      <div className="mx-3 mb-5 grid grid-cols-2 gap-1.5">
        {[
          { label: "Athletes", value: totalAthletes, color: "text-[#E8425A]" },
          { label: "Assigned", value: totalAssignments, color: "text-amber-400" },
          { label: "Active", value: inProgressAssignments, color: "text-purple-400" },
          { label: "Done", value: completedAssignments, color: "text-green-400" },
        ].map(s => (
          <div key={s.label} className="bg-white/[0.04] rounded-lg p-2 text-center">
            <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
            <p className="text-white/30 text-[10px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-2 overflow-y-auto space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.key)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                      isActive
                        ? "bg-[#DC143C]/15 text-white border border-[#DC143C]/25"
                        : "text-white/45 hover:text-white/80 hover:bg-white/[0.05]"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#DC143C]" : ""}`} />
                    <span className="truncate font-medium">{item.label}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#DC143C] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer links */}
      <div className="px-2 mt-4 pt-4 border-t border-white/[0.06] space-y-0.5">
        <button
          onClick={() => { setIsBulkGoalOpen(true); setSidebarOpen(false); }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all"
        >
          <Upload className="w-4 h-4 shrink-0" />
          <span>Bulk Goals</span>
        </button>
        <button
          onClick={() => navigate("bulk-import")}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${activeTab === "bulk-import" ? "bg-[#DC143C]/15 text-white border border-[#DC143C]/25" : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"}`}
        >
          <Upload className="w-4 h-4 shrink-0" />
          <span>Bulk Import</span>
        </button>
        <Link href="/drills">
          <div className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all cursor-pointer">
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Drill Directory</span>
          </div>
        </Link>
      </div>
    </aside>
  );

  return (
    <div className="coach-dark min-h-screen flex flex-col">
      <ImpersonationBanner />
      <BulkGoalUpload isOpen={isBulkGoalOpen} onClose={() => setIsBulkGoalOpen(false)} />

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#0a0a0a] border-b border-white/[0.06] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#DC143C] flex items-center justify-center">
            <Target className="w-3 h-3 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">Coach Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs">{TAB_LABELS[activeTab]}</span>
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 flex flex-col h-full">
            <div className="absolute top-4 right-4">
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg text-white/50 hover:text-white bg-white/[0.06] transition-colors">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Page header */}
          <div className="px-6 py-5 border-b border-white/[0.05] bg-[#0d0d0d] flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">{TAB_LABELS[activeTab]}</h1>
              <p className="text-white/35 text-xs mt-0.5">Coach Steve Baseball · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
            </div>
            <div className="flex items-center gap-2">
              <InviteUserButton />
              <AddNewDrill />
            </div>
          </div>

          {/* Tab content */}
          <main className="flex-1 p-5 md:p-7 max-w-7xl w-full mx-auto">

            {activeTab === "overview" && (
              <AthleteAssignmentOverview
                onSelectAthlete={(athleteId) => {
                  setSelectedUser(athleteId);
                  setActiveTab("assign");
                }}
              />
            )}

            {activeTab === "athletes" && <AthleteTable />}

            {activeTab === "planner" && <PracticePlanner />}

            {activeTab === "session-notes" && <SessionNotesTab />}

            {activeTab === "player-reports" && <PlayerReportsTab />}

            {activeTab === "video-analysis" && <VideoAnalysisTab />}

            {activeTab === "blast-metrics" && <BlastMetricsTab />}

            {activeTab === "page-layouts" && (
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
                        <h2 className="text-2xl font-heading font-bold">Drill Page Layouts</h2>
                        <p className="text-muted-foreground mt-1 text-sm">Pick a drill to create or edit its page layout with the block editor.</p>
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
                              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#DC143C]/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
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
            )}

            {activeTab === "bulk-import" && (
              <div className="max-w-4xl mx-auto space-y-6">
                <BulkImportCustomDrills />
                <BulkInstructionImport />
              </div>
            )}

            {activeTab === "assign" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Left: Assign */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="glass-card rounded-xl overflow-hidden">
                    <div className="p-4 md:p-5 border-b border-white/[0.06] flex items-center justify-between gap-3">
                      <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#DC143C]/20 to-[#DC143C]/20 flex items-center justify-center">
                          <Plus className="h-4 w-4 text-[#DC143C]" />
                        </div>
                        Assign Drill
                      </h3>
                      <AddNewDrill />
                    </div>
                    <div className="p-4 md:p-5 space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">Select Athlete</label>
                        <Select value={selectedUser || ""} onValueChange={(val) => setSelectedUser(val)}>
                          <SelectTrigger className="bg-white/[0.04] border-white/[0.08]">
                            <SelectValue placeholder="Choose athlete..." />
                          </SelectTrigger>
                          <SelectContent>
                            {athleteOptions.length === 0 ? (
                              <div className="p-3 text-sm text-muted-foreground text-center">No athletes found.</div>
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

                {/* Right: Assignments */}
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
      </div>
    </div>
  );
}
