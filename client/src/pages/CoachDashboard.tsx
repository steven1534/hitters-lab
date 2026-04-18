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
  BookOpen, StickyNote, Menu, X as XIcon, UserPlus, Mail, Bell,
  ExternalLink, UserCog, Inbox, GitCompare, ClipboardCheck, Wand2, Trophy,
  Eye, EyeOff, Database,
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAllDrills } from "@/hooks/useAllDrills";
import { BulkInstructionImport } from "@/components/BulkInstructionImport";
import { BulkImportCustomDrills } from "@/components/BulkImportCustomDrills";
import { BulkGoalUpload } from "@/components/BulkGoalUpload";
import { AthleteProgressReport } from "@/components/AthleteProgressReport";
import { AthleteAssignmentOverview } from "@/components/AthleteAssignmentOverview";
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
import { NotificationSettings } from "@/components/NotificationSettings";
import { AccountSettings } from "@/components/AccountSettings";
import { DrillCatalogOverridesEditor } from "@/components/DrillCatalogOverridesEditor";
import UserManagement from "@/pages/UserManagement";
import SubmissionsDashboard from "@/pages/SubmissionsDashboard";
import ActivityFeed from "@/pages/ActivityFeed";
import { ManageDrillVideos } from "@/pages/ManageDrillVideos";

interface Drill {
  id: string;
  name: string;
  difficulty: string;
  categories: string[];
  duration: string;
}

type ActiveTab = "overview" | "assign" | "bulk-import" | "bulk-goals" | "catalog-overrides" | "athletes" | "planner" | "session-notes" | "player-reports" | "video-analysis" | "blast-metrics" | "notifications" | "account" | "challenges" | "user-management" | "submissions" | "activity-feed" | "drill-library" | "drill-videos";

// ── Sidebar nav config ────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "Athletes",
    items: [
      { key: "overview" as ActiveTab, label: "Overview", icon: LayoutDashboard },
      { key: "athletes" as ActiveTab, label: "Athletes Table", icon: Users },
      { key: "user-management" as ActiveTab, label: "User Management", icon: UserCog },
    ],
  },
  {
    label: "Training",
    items: [
      { key: "assign" as ActiveTab, label: "Assign Drills", icon: Plus },
      { key: "drill-library" as ActiveTab, label: "Drill Library", icon: BookOpen },
      { key: "drill-videos" as ActiveTab, label: "Manage Videos", icon: Video },
      { key: "challenges" as ActiveTab, label: "Weekly Challenges", icon: Trophy },
      { key: "planner" as ActiveTab, label: "Practice Planner", icon: Target },
    ],
  },
  {
    label: "Reports",
    items: [
      { key: "player-reports" as ActiveTab, label: "Player Reports", icon: BookOpen },
      { key: "session-notes" as ActiveTab, label: "Session Notes", icon: StickyNote },
      { key: "submissions" as ActiveTab, label: "Submissions", icon: Inbox },
    ],
  },
  {
    label: "Analytics",
    items: [
      { key: "blast-metrics" as ActiveTab, label: "Blast Metrics", icon: Activity },
      { key: "video-analysis" as ActiveTab, label: "Video Analysis", icon: Sparkles },
      { key: "activity-feed" as ActiveTab, label: "Activity Feed", icon: TrendingUp },
    ],
  },
  {
    label: "Settings",
    items: [
      { key: "notifications" as ActiveTab, label: "Notifications", icon: Bell },
      { key: "account" as ActiveTab, label: "My Account", icon: Shield },
    ],
  },
];

const ADMIN_LINK_GROUPS = [
  {
    label: "Drill Tools",
    items: [
      { href: "/drill-generator", label: "Drill Generator", icon: Wand2 },
      { href: "/drill-comparison", label: "Drill Comparison", icon: GitCompare },
      { href: "/athlete-assessment", label: "Athlete Assessment", icon: ClipboardCheck },
    ],
  },
];

const TAB_LABELS: Record<ActiveTab, string> = {
  overview: "Athlete Overview",
  assign: "Assign Drills",
  "bulk-import": "Bulk Import",
  "bulk-goals": "Bulk Goals",
  "catalog-overrides": "Catalog Overrides",
  athletes: "Athletes Table",
  planner: "Practice Planner",
  "session-notes": "Session Notes",
  "player-reports": "Player Reports",
  "video-analysis": "Video Analysis",
  "blast-metrics": "Blast Metrics",
  "drill-library": "Drill Library",
  "drill-videos": "Manage Videos",
  challenges: "Weekly Challenges",
  "user-management": "User Management",
  submissions: "Submissions",
  "activity-feed": "Activity Feed",
  notifications: "Notification Settings",
  account: "My Account",
};

// ── Invite User Dialog ────────────────────────────────────────
function InviteUserButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"athlete" | "coach">("athlete");
  const [sent, setSent] = useState(false);
  const utils = trpc.useUtils();

  const [emailFailed, setEmailFailed] = useState(false);
  const [emailErrorMsg, setEmailErrorMsg] = useState("");

  const inviteMutation = trpc.invites.createInvite.useMutation({
    onSuccess: (data: any) => {
      utils.invites.getAllInvites.invalidate();
      setSent(true);
      if (data.emailSent === false) {
        setEmailFailed(true);
        setEmailErrorMsg(data.emailError || "Email service not configured");
        toast.error("Invite created but email failed to send: " + (data.emailError || "Email service not configured"));
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send invite");
    },
  });

  const handleClose = () => {
    setOpen(false);
    setEmail("");
    setName("");
    setRole("athlete");
    setSent(false);
    setEmailFailed(false);
    setEmailErrorMsg("");
  };

  const handleSend = () => {
    if (email) inviteMutation.mutate({ email, name: name || undefined, role });
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

        {!sent ? (
          <>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Name</Label>
                <Input
                  id="invite-name"
                  type="text"
                  placeholder="Athlete's name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="athlete@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    onKeyDown={(e) => { if (e.key === "Enter" && email) handleSend(); }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={role === "athlete" ? "default" : "outline"}
                    onClick={() => setRole("athlete")}
                  >
                    Athlete
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={role === "coach" ? "default" : "outline"}
                    onClick={() => setRole("coach")}
                  >
                    Coach
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleSend}
                disabled={!email || inviteMutation.isPending}
              >
                {inviteMutation.isPending ? "Sending..." : "Send Invite Email"}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4 py-4">
            {emailFailed ? (
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-6 text-center">
                <AlertCircle className="h-10 w-10 text-yellow-400 mx-auto mb-3" />
                <p className="font-semibold text-yellow-400 text-lg">Invite Created — Email Failed</p>
                <p className="text-yellow-300/90 text-sm mt-1">
                  The invite for <strong>{email}</strong> was created, but the email could not be sent.
                </p>
                <p className="text-red-400 text-xs mt-2">{emailErrorMsg}</p>
                <p className="text-muted-foreground text-xs mt-3">
                  Check that RESEND_API_KEY is set in your environment variables and that your domain is verified with Resend.
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-6 text-center">
                <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
                <p className="font-semibold text-green-400 text-lg">Invite Sent!</p>
                <p className="text-green-300/90 text-sm mt-1">
                  An email has been sent to <strong>{email}</strong> with a link to join as {role === "coach" ? "a coach" : "an athlete"}.
                </p>
                <p className="text-muted-foreground text-xs mt-3">The invite expires in 7 days.</p>
              </div>
            )}
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
  // Cross-tab navigation: pre-select an athlete when switching tabs from Blast Metrics
  const [crossNavAthleteId, setCrossNavAthleteId] = useState<number | undefined>(undefined);
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

  // Fetch blast players ONCE here with stale time so SessionNotes + PlayerReports
  // don't each fire their own heavy GROUP BY JOIN query on mount.
  const { data: blastPlayersList = [] } = trpc.blastMetrics.listPlayers.useQuery(undefined, {
    enabled: user?.role === "admin",
    staleTime: 5 * 60 * 1000, // 5 minutes — no refetch on every tab switch
  });
  const blastUserIds = useMemo(
    () => new Set((blastPlayersList as any[]).filter((p: any) => p.userId).map((p: any) => Number(p.userId))),
    [blastPlayersList]
  );

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
    setCrossNavAthleteId(undefined); // clear pre-selection when manually switching tabs
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
            <Target className="w-3.5 h-3.5 text-foreground" />
          </div>
          <span className="text-foreground font-bold text-sm leading-tight">Coach Dashboard</span>
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

      {/* Admin page links */}
      <div className="px-2 mt-2 space-y-4">
        {ADMIN_LINK_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                  <div className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-white/45 hover:text-white/80 hover:bg-white/[0.05] transition-all cursor-pointer">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate font-medium">{item.label}</span>
                    <ExternalLink className="w-3 h-3 ml-auto shrink-0 opacity-30" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

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
        <button
          onClick={() => navigate("drill-library")}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${activeTab === "drill-library" ? "bg-[#DC143C]/15 text-white border border-[#DC143C]/25" : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"}`}
        >
          <Table2 className="w-4 h-4 shrink-0" />
          <span>Catalog overrides</span>
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
            <Target className="w-3 h-3 text-foreground" />
          </div>
          <span className="text-foreground font-semibold text-sm">Coach Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs">{TAB_LABELS[activeTab]}</span>
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg text-white/50 hover:text-foreground hover:bg-white/[0.06] transition-colors">
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
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg text-white/50 hover:text-foreground bg-white/[0.06] transition-colors">
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
              <h1 className="text-xl font-bold text-foreground">{TAB_LABELS[activeTab]}</h1>
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
              <div className="space-y-6">
                <BusinessMetrics
                  onNavigate={(tab: ActiveTab) => setActiveTab(tab)}
                />
                <AthleteAssignmentOverview
                  onSelectAthlete={(athleteId) => {
                    setSelectedUser(athleteId);
                    setActiveTab("assign");
                  }}
                />
              </div>
            )}

            {activeTab === "athletes" && <AthleteTable />}

            {activeTab === "planner" && <PracticePlanner />}

            {activeTab === "session-notes" && (
              <SessionNotesTab
                key={crossNavAthleteId ?? "default"}
                initialAthleteId={crossNavAthleteId}
                blastUserIds={blastUserIds}
              />
            )}

            {activeTab === "player-reports" && (
              <PlayerReportsTab
                key={crossNavAthleteId ?? "default"}
                initialAthleteId={crossNavAthleteId}
                blastUserIds={blastUserIds}
              />
            )}

            {activeTab === "video-analysis" && <VideoAnalysisTab />}

            {activeTab === "blast-metrics" && (
              <BlastMetricsTab
                onNavigateToNotes={(userId) => {
                  setCrossNavAthleteId(userId);
                  setActiveTab("session-notes");
                }}
                onNavigateToReports={(userId) => {
                  setCrossNavAthleteId(userId);
                  setActiveTab("player-reports");
                }}
              />
            )}

            {activeTab === "challenges" && <WeeklyChallengesTab />}

            {activeTab === "notifications" && <NotificationSettings />}

            {activeTab === "account" && <AccountSettings />}

            {activeTab === "drill-library" && <DrillLibraryTab />}

            {activeTab === "drill-videos" && <ManageDrillVideos embedded />}

            {activeTab === "user-management" && <UserManagement embedded />}
            {activeTab === "submissions" && <SubmissionsDashboard embedded />}
            {activeTab === "activity-feed" && <ActivityFeed embedded />}

            {activeTab === "bulk-import" && (
              <div className="max-w-4xl mx-auto space-y-6">
                <BulkImportCustomDrills />
                <BulkInstructionImport />
              </div>
            )}

            {activeTab === "catalog-overrides" && (
              <div className="max-w-3xl mx-auto">
                <p className="text-muted-foreground text-sm mb-4">Catalog overrides have moved to the Drill Library tab.</p>
                <Button onClick={() => navigate("drill-library")}>Go to Drill Library</Button>
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

// ── Business Metrics (Overview) ──────────────────────────────
function BusinessMetrics({ onNavigate }: { onNavigate: (tab: ActiveTab) => void }) {
  const { data: users = [] } = trpc.admin.getAllUsers.useQuery();
  const { data: invites = [] } = trpc.invites.getAllInvites.useQuery();
  const { data: activities = [] } = trpc.activity.getRecentActivities.useQuery({ limit: 10 });
  const { data: challenge } = trpc.challenges.getCurrent.useQuery();

  const athletes = (users as any[]).filter((u: any) => u.role === "athlete" || u.role === "user");
  const activeAthletes = athletes.filter((u: any) => u.isActiveClient);
  const pendingInvites = (invites as any[]).filter((i: any) => i.status === "pending");
  const recentLogins = (activities as any[]).filter((a: any) => a.activityType === "portal_login");

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Athletes", value: activeAthletes.length, icon: Users, color: "text-emerald-500", onClick: () => onNavigate("athletes") },
          { label: "Pending Invites", value: pendingInvites.length, icon: UserPlus, color: "text-amber-500", onClick: () => onNavigate("user-management") },
          { label: "Recent Logins", value: recentLogins.length, icon: Activity, color: "text-blue-500", onClick: () => onNavigate("activity-feed") },
          { label: "Total Users", value: users.length, icon: Shield, color: "text-purple-500", onClick: () => onNavigate("user-management") },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={stat.onClick}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active Challenge Banner */}
      {challenge && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Active Challenge</p>
              <p className="font-semibold truncate">{challenge.title}</p>
              <p className="text-xs text-muted-foreground">
                Ends {new Date(challenge.endsAt).toLocaleDateString()} · Target: {challenge.targetCount} drills
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate("challenges")}>
              Manage
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "Assign Drills", icon: Target, tab: "assign" as ActiveTab },
              { label: "Write Notes", icon: StickyNote, tab: "session-notes" as ActiveTab },
              { label: "Review Videos", icon: Sparkles, tab: "video-analysis" as ActiveTab },
              { label: "Player Reports", icon: BookOpen, tab: "player-reports" as ActiveTab },
              { label: "Blast Metrics", icon: BarChart3, tab: "blast-metrics" as ActiveTab },
              { label: "Submissions", icon: Inbox, tab: "submissions" as ActiveTab },
              { label: "Challenges", icon: Trophy, tab: "challenges" as ActiveTab },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => onNavigate(action.tab)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                >
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{action.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {(activities as any[]).length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("activity-feed")} className="text-xs">
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(activities as any[]).slice(0, 5).map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      <span className="font-medium">{a.userName || "User"}</span>
                      {" "}{a.activityType?.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Weekly Challenges Tab (Coach) ────────────────────────────
function WeeklyChallengesTab() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetCount, setTargetCount] = useState("5");
  const utils = trpc.useUtils();

  const { data: challenges = [], isLoading } = trpc.challenges.getAll.useQuery();

  const createMutation = trpc.challenges.create.useMutation({
    onSuccess: () => {
      utils.challenges.getAll.invalidate();
      setTitle("");
      setDescription("");
      setTargetCount("5");
      toast.success("Challenge created!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create challenge"),
  });

  const handleCreate = () => {
    if (!title.trim()) return;
    const now = new Date();
    const startsAt = now.toISOString();
    const endsAt = new Date(now.getTime() + 7 * 86400000).toISOString();
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      targetCount: parseInt(targetCount) || 5,
      startsAt,
      endsAt,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Create Weekly Challenge
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Challenge Title *</Label>
            <Input
              placeholder="e.g. Complete 5 bat path drills this week"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              placeholder="Extra details about the challenge..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Target (number of drills to complete)</Label>
            <Input
              type="number"
              min={1}
              value={targetCount}
              onChange={(e) => setTargetCount(e.target.value)}
            />
          </div>
          <Button onClick={handleCreate} disabled={!title.trim() || createMutation.isPending} className="gap-2">
            <Plus className="h-4 w-4" />
            {createMutation.isPending ? "Creating..." : "Create Challenge (7-day window)"}
          </Button>
        </CardContent>
      </Card>

      {/* Past challenges list */}
      <Card>
        <CardHeader>
          <CardTitle>Challenge History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : challenges.length === 0 ? (
            <p className="text-muted-foreground text-sm">No challenges created yet.</p>
          ) : (
            <div className="space-y-3">
              {(challenges as any[]).map((c: any) => {
                const isActive = new Date(c.startsAt) <= new Date() && new Date(c.endsAt) >= new Date();
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.startsAt).toLocaleDateString()} – {new Date(c.endsAt).toLocaleDateString()}
                        {" · Target: "}{c.targetCount} drills
                      </p>
                    </div>
                    {isActive && <Badge variant="secondary" className="bg-green-500/10 text-green-600">Active</Badge>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Drill Library Tab (Coach) ────────────────────────────────
function DrillLibraryTab() {
  const allDrills = useAllDrills();
  const { data: overrides = [] } = trpc.drillCatalog.getAll.useQuery();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const hiddenIds = useMemo(() => {
    const set = new Set<string>();
    overrides.forEach((o: any) => { if (o.hiddenFromDirectory === 1) set.add(o.drillId); });
    return set;
  }, [overrides]);

  const hideMutation = trpc.drillCatalog.upsert.useMutation({
    onSuccess: () => {
      toast.success("Drill hidden");
      utils.drillCatalog.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to hide drill"),
  });

  const unhideMutation = trpc.drillCatalog.upsert.useMutation({
    onSuccess: () => {
      toast.success("Drill restored");
      utils.drillCatalog.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to restore drill"),
  });

  const handleToggleHide = (drillId: string, currentlyHidden: boolean) => {
    const existing = overrides.find((o: any) => o.drillId === drillId);
    const mutation = currentlyHidden ? unhideMutation : hideMutation;
    mutation.mutate({
      drillId,
      name: existing?.name ?? null,
      difficulty: existing?.difficulty ?? null,
      categories: existing?.categories ?? null,
      duration: existing?.duration ?? null,
      tags: existing?.tags ?? null,
      externalUrl: existing?.externalUrl ?? null,
      hiddenFromDirectory: currentlyHidden ? 0 : 1,
    });
  };

  const filtered = useMemo(() => {
    let drills = allDrills;
    if (search.trim()) {
      const q = search.toLowerCase();
      drills = drills.filter((d: any) =>
        d.name?.toLowerCase().includes(q) ||
        d.categories?.some((c: string) => c.toLowerCase().includes(q)) ||
        d.difficulty?.toLowerCase().includes(q)
      );
    }
    if (!showHidden) {
      drills = drills.filter((d: any) => !hiddenIds.has(d.id));
    }
    return drills;
  }, [allDrills, search, showHidden, hiddenIds]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Drill Library</h2>
          <p className="text-sm text-muted-foreground">
            {allDrills.length} total · {hiddenIds.size} hidden
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto items-center">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search drills..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button
            variant={showHidden ? "default" : "outline"}
            size="sm"
            className="gap-1 shrink-0"
            onClick={() => setShowHidden(!showHidden)}
          >
            <EyeOff className="h-3.5 w-3.5" />
            {showHidden ? "Showing hidden" : "Show hidden"}
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div ref={tableRef} className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Difficulty</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Duration</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.slice(0, 100).map((drill: any) => {
                const isHidden = hiddenIds.has(drill.id);
                return (
                  <tr key={drill.id} className={`hover:bg-muted/30 transition-colors ${isHidden ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{drill.name}</span>
                      {isHidden && <Badge variant="outline" className="ml-2 text-[10px] text-yellow-500 border-yellow-500/30">Hidden</Badge>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {drill.categories?.slice(0, 2).map((c: string) => (
                          <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs">{drill.difficulty}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{drill.duration}</td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title={isHidden ? "Restore drill" : "Hide drill"}
                        onClick={() => handleToggleHide(drill.id, isHidden)}
                        disabled={hideMutation.isPending || unhideMutation.isPending}
                      >
                        {isHidden ? <Eye className="h-3.5 w-3.5 text-yellow-500" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </Button>
                      <Link href={`/drill/${drill.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          <Edit3 className="h-3 w-3" />View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No drills found matching "{search}"</div>
          )}
          {filtered.length > 100 && (
            <div className="text-center py-3 text-xs text-muted-foreground border-t">Showing first 100 of {filtered.length} results</div>
          )}
        </div>
      </div>

      {/* Inline Catalog Overrides — collapsible to preserve scroll state */}
      <div className="border rounded-lg overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
          onClick={() => setOverrideOpen(!overrideOpen)}
        >
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#DC143C]" />
            <span className="font-medium text-sm">Edit Drill Details (Catalog Overrides)</span>
          </div>
          <ChevronRight className={`h-4 w-4 transition-transform ${overrideOpen ? "rotate-90" : ""}`} />
        </button>
        {overrideOpen && (
          <div className="p-4 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              Override names, difficulty, categories, and coaching fields without modifying source data.
            </p>
            <DrillCatalogOverridesEditor />
          </div>
        )}
      </div>
    </div>
  );
}
