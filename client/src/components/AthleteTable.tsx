import { useState, useMemo, Fragment } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserPlus,
  Mail,
  Calendar,
  Activity,
  Bell,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Hash,
  Target,
  TrendingUp,
  Eye,
  Trash2,
} from "lucide-react";
import { InlineEdit } from "./InlineEdit";

type SortField = "id" | "name" | "email" | "status" | "role" | "totalDrills" | "completedDrills" | "lastActivity" | "createdAt" | "lastSignedIn";
type SortDirection = "asc" | "desc";

interface AthleteRow {
  numericId: number;
  id: string;
  name: string;
  email: string;
  type: "user" | "invite";
  status: string;
  role: string;
  isActiveClient: boolean;
  hasDrills: boolean;
  totalDrills: number;
  completedDrills: number;
  inProgressDrills: number;
  assignedDrills: number;
  lastActivity: Date | null;
  createdAt: Date | null;
  lastSignedIn: Date | null;
}

export function AthleteTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "inactive">("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const rowsPerPage = 15;

  // Fetch data from existing endpoints
  const { data: overviewData, isLoading: overviewLoading } = trpc.drillAssignments.getAthleteAssignmentOverview.useQuery();
  const { data: allUsers = [], isLoading: usersLoading } = trpc.admin.getAllUsers.useQuery();

  // Only show loading if both queries are still pending
  const isLoading = usersLoading && overviewLoading;

  // Merge data from both sources.
  // Falls back to allUsers when overviewData is unavailable (e.g. DB probe still warming up).
  const athletes: AthleteRow[] = useMemo(() => {
    const overviewAthletes = overviewData?.athletes ?? [];

    // If overviewData returned athletes, use them merged with allUsers
    if (overviewAthletes.length > 0) {
      return overviewAthletes.map((athlete) => {
      // Find matching user record for additional details
      const numericId = parseInt(athlete.id.replace(/^(user-|invite-)/, ""));
      const userRecord = athlete.type === "user"
        ? allUsers.find((u: any) => u.id === numericId)
        : null;

      return {
        numericId,
        id: athlete.id,
        name: athlete.name,
        email: athlete.email,
        type: athlete.type,
        status: athlete.status,
        role: userRecord?.role || (athlete.type === "invite" ? "invite" : "user"),
        isActiveClient: userRecord?.isActiveClient === 1,
        hasDrills: athlete.hasDrills,
        totalDrills: athlete.totalDrills,
        completedDrills: athlete.completedDrills,
        inProgressDrills: athlete.inProgressDrills,
        assignedDrills: athlete.assignedDrills,
        lastActivity: athlete.lastActivity ? new Date(athlete.lastActivity) : null,
        createdAt: userRecord?.createdAt ? new Date(userRecord.createdAt) : null,
        lastSignedIn: userRecord?.lastSignedIn ? new Date(userRecord.lastSignedIn) : null,
      };
      });
    }

    // Fallback: build rows directly from allUsers when overviewData is empty/unavailable
    return (allUsers as any[])
      .filter((u: any) => u.role !== 'admin' && u.role !== 'parent')
      .map((u: any) => ({
        numericId: u.id,
        id: `user-${u.id}`,
        name: u.name || u.email?.split('@')[0] || `User ${u.id}`,
        email: u.email || '',
        type: 'user' as const,
        status: u.isActiveClient === 1 ? 'active' as const : 'pending' as const,
        role: u.role,
        isActiveClient: u.isActiveClient === 1,
        hasDrills: false,
        totalDrills: 0,
        completedDrills: 0,
        inProgressDrills: 0,
        assignedDrills: 0,
        lastActivity: null,
        createdAt: u.createdAt ? new Date(u.createdAt) : null,
        lastSignedIn: u.lastSignedIn ? new Date(u.lastSignedIn) : null,
      }));
  }, [overviewData, allUsers]);

  // Filter
  const filteredAthletes = useMemo(() => {
    return athletes.filter((a) => {
      // Status filter
      if (statusFilter === "active" && !a.isActiveClient) return false;
      if (statusFilter === "pending" && a.type !== "invite") return false;
      if (statusFilter === "inactive" && (a.isActiveClient || a.type === "invite")) return false;

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          String(a.numericId).includes(q)
        );
      }
      return true;
    });
  }, [athletes, statusFilter, searchQuery]);

  // Sort
  const sortedAthletes = useMemo(() => {
    return [...filteredAthletes].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      switch (sortField) {
        case "id":
          return (a.numericId - b.numericId) * dir;
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "email":
          return a.email.localeCompare(b.email) * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "role":
          return a.role.localeCompare(b.role) * dir;
        case "totalDrills":
          return (a.totalDrills - b.totalDrills) * dir;
        case "completedDrills":
          return (a.completedDrills - b.completedDrills) * dir;
        case "lastActivity": {
          const aTime = a.lastActivity?.getTime() || 0;
          const bTime = b.lastActivity?.getTime() || 0;
          return (aTime - bTime) * dir;
        }
        case "createdAt": {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return (aTime - bTime) * dir;
        }
        case "lastSignedIn": {
          const aTime = a.lastSignedIn?.getTime() || 0;
          const bTime = b.lastSignedIn?.getTime() || 0;
          return (aTime - bTime) * dir;
        }
        default:
          return 0;
      }
    });
  }, [filteredAthletes, sortField, sortDirection]);

  // Paginate
  const totalPages = Math.ceil(sortedAthletes.length / rowsPerPage);
  const paginatedAthletes = sortedAthletes.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 text-[#DC143C]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#DC143C]" />
    );
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getTimeSince = (date: Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 30) return `${Math.floor(days / 30)}mo ago`;
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  // Stats
  const activeCount = athletes.filter((a) => a.isActiveClient).length;
  const pendingCount = athletes.filter((a) => a.type === "invite").length;
  const inactiveCount = athletes.filter((a) => !a.isActiveClient && a.type !== "invite").length;

  const sendReminderMutation = trpc.drillAssignments.sendFollowUpReminder.useMutation();
  const utils = trpc.useUtils();
  // Active status toggle
  const toggleActiveMutation = trpc.admin.toggleClientAccess.useMutation({
    onSuccess: () => {
      utils.admin.getAllUsers.invalidate();
    },
  });

  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      utils.admin.getAllUsers.invalidate();
      utils.drillAssignments.getAthleteAssignmentOverview.invalidate();
      setExpandedRow(null);
    },
    onError: (err) => {
      toast.error(`Delete failed: ${err.message}`);
      utils.admin.getAllUsers.invalidate();
      utils.drillAssignments.getAthleteAssignmentOverview.invalidate();
    },
  });

  const deleteInviteMutation = trpc.invites.deleteInvite.useMutation({
    onSuccess: () => {
      toast.success("Invite deleted successfully");
      utils.admin.getAllUsers.invalidate();
      utils.drillAssignments.getAthleteAssignmentOverview.invalidate();
      utils.invites.getAllInvites.invalidate();
      setExpandedRow(null);
    },
    onError: (err) => {
      toast.error(`Delete failed: ${err.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="glass-card rounded-xl p-6 animate-pulse">
          <div className="h-6 bg-muted/60 rounded w-48 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted/40 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and filters */}
      <div className="glass-card rounded-xl p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-heading font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#DC143C]/20 to-[#DC143C]/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-[#DC143C]" />
              </div>
              <InlineEdit contentKey="coach.athletes.title" defaultValue="Athlete Directory" as="span" />
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {athletes.length} total athletes · {filteredAthletes.length} shown
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 bg-muted/40 border-border"
            />
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all" as const, label: "All", count: athletes.length, icon: Users },
            { key: "active" as const, label: "Active", count: activeCount, icon: CheckCircle, color: "text-green-400" },
            { key: "pending" as const, label: "Pending", count: pendingCount, icon: Clock, color: "text-amber-400" },
            { key: "inactive" as const, label: "Inactive", count: inactiveCount, icon: AlertCircle, color: "text-red-400" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setStatusFilter(f.key);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                statusFilter === f.key
                  ? "bg-muted text-foreground border border-border"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted border border-transparent"
              }`}
            >
              <f.icon className={`h-3 w-3 ${statusFilter === f.key ? (f.color || "text-[#DC143C]") : ""}`} />
              {f.label}
              <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {[
                  { field: "id" as SortField, label: "ID", icon: Hash, width: "w-16" },
                  { field: "name" as SortField, label: "Name", icon: Users, width: "min-w-[140px]" },
                  { field: "email" as SortField, label: "Email", icon: Mail, width: "min-w-[180px]" },
                  { field: "status" as SortField, label: "Status", icon: Shield, width: "w-28" },
                  { field: "totalDrills" as SortField, label: "Drills", icon: Target, width: "w-20" },
                  { field: "completedDrills" as SortField, label: "Done", icon: CheckCircle, width: "w-16" },
                  { field: "lastActivity" as SortField, label: "Last Activity", icon: Activity, width: "w-28" },
                  { field: "lastSignedIn" as SortField, label: "Last Sign In", icon: Calendar, width: "w-28" },
                  { field: "createdAt" as SortField, label: "Joined", icon: Calendar, width: "w-24" },
                ].map((col) => (
                  <th
                    key={col.field}
                    className={`${col.width} px-3 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none`}
                    onClick={() => handleSort(col.field)}
                  >
                    <div className="flex items-center gap-1.5">
                      <col.icon className="h-3 w-3 opacity-50" />
                      <InlineEdit contentKey={`coach.athletes.col.${col.field}`} defaultValue={col.label} as="span" />
                      <SortIcon field={col.field} />
                    </div>
                  </th>
                ))}
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {paginatedAthletes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No athletes found</p>
                    <p className="text-xs mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                paginatedAthletes.map((athlete, idx) => (
                  <Fragment key={athlete.id}>
                    <tr
                      className={`border-b border-border/40 hover:bg-muted/40 transition-colors cursor-pointer ${
                        expandedRow === athlete.id ? "bg-muted/60" : ""
                      } ${idx % 2 === 0 ? "" : "bg-muted/[0.015]"}`}
                      onClick={() => setExpandedRow(expandedRow === athlete.id ? null : athlete.id)}
                    >
                      {/* ID */}
                      <td className="px-3 py-3">
                        <span className="text-xs font-mono text-muted-foreground">{athlete.numericId}</span>
                      </td>

                      {/* Name */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                            athlete.isActiveClient
                              ? "bg-gradient-to-br from-[#DC143C]/30 to-[#DC143C]/30 text-[#DC143C]"
                              : athlete.type === "invite"
                              ? "bg-gradient-to-br from-amber-500/30 to-orange-500/30 text-amber-400"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {athlete.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{athlete.name}</p>
                            {athlete.type === "invite" && (
                              <span className="text-[9px] text-amber-400 font-medium">INVITED</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-3 py-3">
                        <span className="text-xs text-muted-foreground truncate block max-w-[200px]">{athlete.email || "—"}</span>
                      </td>

                      {/* Status — toggle for real users, badge for invites */}
                      <td className="px-3 py-3">
                        {athlete.type === "invite" ? (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                            <UserPlus className="h-2.5 w-2.5 mr-1" />
                            Pending
                          </Badge>
                        ) : (
                          <button
                            onClick={() => toggleActiveMutation.mutate({
                              userId: athlete.numericId,
                              isActive: !athlete.isActiveClient,
                            })}
                            disabled={toggleActiveMutation.isPending}
                            className="flex items-center gap-2 group"
                            title={athlete.isActiveClient ? "Click to deactivate" : "Click to activate"}
                          >
                            {/* Track */}
                            <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                              athlete.isActiveClient
                                ? "bg-green-500"
                                : "bg-white/[0.12]"
                            } ${toggleActiveMutation.isPending ? "opacity-50" : ""}`}>
                              {/* Thumb */}
                              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                                athlete.isActiveClient ? "translate-x-4" : "translate-x-0.5"
                              }`} />
                            </div>
                            <span className={`text-[10px] font-semibold ${
                              athlete.isActiveClient ? "text-green-400" : "text-muted-foreground"
                            }`}>
                              {athlete.isActiveClient ? "Active" : "Inactive"}
                            </span>
                          </button>
                        )}
                      </td>

                      {/* Total Drills */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-sm">{athlete.totalDrills}</span>
                          {athlete.totalDrills > 0 && (
                            <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#DC143C] to-[#E8425A]"
                                style={{ width: `${athlete.totalDrills > 0 ? (athlete.completedDrills / athlete.totalDrills) * 100 : 0}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Completed */}
                      <td className="px-3 py-3">
                        <span className={`text-sm font-medium ${athlete.completedDrills > 0 ? "text-green-400" : "text-muted-foreground"}`}>
                          {athlete.completedDrills}
                        </span>
                      </td>

                      {/* Last Activity */}
                      <td className="px-3 py-3">
                        <span className="text-xs text-muted-foreground">{getTimeSince(athlete.lastActivity)}</span>
                      </td>

                      {/* Last Sign In */}
                      <td className="px-3 py-3">
                        <span className="text-xs text-muted-foreground">{getTimeSince(athlete.lastSignedIn)}</span>
                      </td>

                      {/* Joined */}
                      <td className="px-3 py-3">
                        <span className="text-xs text-muted-foreground">{formatDate(athlete.createdAt)}</span>
                      </td>

                      {/* Expand */}
                      <td className="px-3 py-3">
                        <Eye className={`h-3.5 w-3.5 transition-all duration-200 ${expandedRow === athlete.id ? "text-[#DC143C]" : "text-muted-foreground/30"}`} />
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {expandedRow === athlete.id && (
                      <tr className="bg-muted/30">
                        <td colSpan={10} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-muted/40 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">User ID</p>
                              <p className="font-mono text-sm font-medium">{athlete.numericId}</p>
                            </div>
                            <div className="bg-muted/40 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Role</p>
                              <p className="text-sm font-medium capitalize">{athlete.role}</p>
                            </div>
                            <div className="bg-muted/40 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Account Type</p>
                              <p className="text-sm font-medium capitalize">{athlete.type}</p>
                            </div>
                            <div className="bg-muted/40 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Active Client</p>
                              <p className={`text-sm font-medium ${athlete.isActiveClient ? "text-green-400" : "text-muted-foreground"}`}>
                                {athlete.isActiveClient ? "Yes" : "No"}
                              </p>
                            </div>
                            <div className="bg-muted/40 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Assigned Drills</p>
                              <p className="text-sm font-medium">{athlete.assignedDrills}</p>
                            </div>
                            <div className="bg-muted/40 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">In Progress</p>
                              <p className={`text-sm font-medium ${athlete.inProgressDrills > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                                {athlete.inProgressDrills}
                              </p>
                            </div>
                            <div className="bg-muted/40 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Last Activity</p>
                              <p className="text-sm font-medium">{formatDateTime(athlete.lastActivity)}</p>
                            </div>
                            <div className="bg-muted/40 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Last Sign In</p>
                              <p className="text-sm font-medium">{formatDateTime(athlete.lastSignedIn)}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex-1 bg-muted/40 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Full Email</p>
                              <p className="text-sm font-medium break-all">{athlete.email || "No email on file"}</p>
                            </div>
                            <div className="flex-1 bg-muted/40 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Joined Date</p>
                              <p className="text-sm font-medium">{formatDateTime(athlete.createdAt)}</p>
                            </div>
                            <div className="flex-1 bg-muted/40 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Completion Rate</p>
                              <p className="text-sm font-medium">
                                {athlete.totalDrills > 0
                                  ? `${Math.round((athlete.completedDrills / athlete.totalDrills) * 100)}%`
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                          {/* Action buttons */}
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              disabled={deleteUserMutation.isPending || deleteInviteMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                const label = athlete.type === "invite" ? "invite" : "account";
                                if (confirm(`Delete ${athlete.name} (${athlete.email})?\n\nThis permanently removes their ${label} and all related data.`)) {
                                  if (athlete.type === "invite") {
                                    deleteInviteMutation.mutate({ inviteId: athlete.numericId });
                                  } else {
                                    deleteUserMutation.mutate({ userId: athlete.numericId });
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {(deleteUserMutation.isPending || deleteInviteMutation.isPending) ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                          {athlete.type === "user" && athlete.totalDrills > athlete.completedDrills && (
                            <div className="mt-2 flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                                disabled={sendReminderMutation.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sendReminderMutation.mutate(
                                    { userId: athlete.numericId },
                                    {
                                      onSuccess: (data: any) => {
                                        if (data.success) {
                                          alert(`Reminder sent to ${athlete.name}!`);
                                        } else {
                                          alert(data.message || data.error || 'Failed to send reminder');
                                        }
                                      },
                                      onError: (err: any) => alert(`Error: ${err.message}`),
                                    }
                                  );
                                }}
                              >
                                <Bell className="h-3.5 w-3.5" />
                                {sendReminderMutation.isPending ? 'Sending...' : `Send Reminder (${athlete.totalDrills - athlete.completedDrills} incomplete)`}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, sortedAthletes.length)} of {sortedAthletes.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
