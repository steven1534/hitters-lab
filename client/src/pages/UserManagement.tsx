import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Pencil,
  X,
  AlertTriangle,
  Copy,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

interface User {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
  isActiveClient: number;
  createdAt: Date;
  lastSignedIn: Date;
}

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "athlete", label: "Athlete" },
  { value: "coach", label: "Coach" },
  { value: "admin", label: "Admin" },
];

function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Never";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60_000) return "Just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function UserManagement({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");

  // Confirmation dialog state
  const [roleConfirm, setRoleConfirm] = useState<{ user: User; newRole: string } | null>(null);
  const [accessConfirm, setAccessConfirm] = useState<User | null>(null);

  // Reset password dialog state
  const [resetDialogUser, setResetDialogUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetRequestId, setResetRequestId] = useState<number | null>(null);
  const [lastResetPassword, setLastResetPassword] = useState<{ userId: number; password: string } | null>(null);

  // Edit user dialog state
  const [editDialogUser, setEditDialogUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const { data: users = [], isLoading } = trpc.admin.getAllUsers.useQuery();
  const { data: resetRequests = [] } = trpc.admin.getPasswordResetRequests.useQuery();

  const invalidateUsers = () => utils.admin.getAllUsers.invalidate();
  const invalidateRequests = () => utils.admin.getPasswordResetRequests.invalidate();

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      setSelectedUserId(null);
      setSelectedRole("");
      setRoleConfirm(null);
      invalidateUsers();
    },
    onError: (error) => toast.error("Failed to update role", { description: error.message }),
  });

  const toggleAccessMutation = trpc.admin.toggleClientAccess.useMutation({
    onSuccess: (_data, vars) => {
      toast.success(vars.isActive ? "User activated" : "User deactivated");
      setAccessConfirm(null);
      invalidateUsers();
    },
    onError: (error) => {
      toast.error("Failed to update access", { description: error.message });
      setAccessConfirm(null);
    },
  });

  const resetPasswordMutation = trpc.admin.resetUserPassword.useMutation({
    onSuccess: (_data, vars) => {
      toast.success("Password reset", { description: "Share the new password securely." });
      setLastResetPassword({ userId: vars.userId, password: vars.newPassword });
      setResetDialogUser(null);
      setResetPassword("");
      setResetRequestId(null);
      invalidateRequests();
    },
    onError: (error) => toast.error("Failed to reset password", { description: error.message }),
  });

  const completeResetMutation = trpc.admin.completeResetRequest.useMutation({
    onSuccess: (_data, vars) => {
      toast.success("Password reset", { description: "Request marked complete." });
      setLastResetPassword({ userId: vars.userId, password: vars.newPassword });
      setResetDialogUser(null);
      setResetPassword("");
      setResetRequestId(null);
      invalidateRequests();
    },
    onError: (error) => toast.error("Failed to reset password", { description: error.message }),
  });

  const dismissRequestMutation = trpc.admin.dismissResetRequest.useMutation({
    onSuccess: () => {
      toast.success("Reset request dismissed");
      invalidateRequests();
    },
    onError: (error) => toast.error("Failed to dismiss request", { description: error.message }),
  });

  const updateUserInfoMutation = trpc.admin.updateUserInfo.useMutation({
    onSuccess: () => {
      toast.success("User info updated");
      setEditDialogUser(null);
      invalidateUsers();
    },
    onError: (error) => toast.error("Failed to update user", { description: error.message }),
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const searchLower = searchQuery.toLowerCase();
    return users.filter((u: User) => {
      const matchesSearch =
        !searchLower ||
        (u.name?.toLowerCase().includes(searchLower) ?? false) ||
        (u.email?.toLowerCase().includes(searchLower) ?? false);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.isActiveClient === 1) ||
        (statusFilter === "inactive" && u.isActiveClient === 0);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const hasActiveFilters = !!searchQuery.trim() || roleFilter !== "all" || statusFilter !== "all";

  function openResetDialog(u: User, requestId?: number) {
    setResetDialogUser(u);
    setResetPassword("");
    setResetRequestId(requestId ?? null);
    setLastResetPassword(null);
  }

  function openEditDialog(u: User) {
    setEditDialogUser(u);
    setEditName(u.name ?? "");
    setEditEmail(u.email ?? "");
  }

  function handleResetPassword() {
    if (!resetDialogUser || !resetPassword) return;
    if (resetRequestId) {
      completeResetMutation.mutate({ requestId: resetRequestId, userId: resetDialogUser.id, newPassword: resetPassword });
    } else {
      resetPasswordMutation.mutate({ userId: resetDialogUser.id, newPassword: resetPassword });
    }
  }

  function handleEditUser() {
    if (!editDialogUser) return;
    updateUserInfoMutation.mutate({ userId: editDialogUser.id, name: editName || undefined, email: editEmail || undefined });
  }

  async function handleCopyPassword() {
    if (!lastResetPassword) return;
    try {
      await navigator.clipboard.writeText(lastResetPassword.password);
      toast.success("Password copied to clipboard");
    } catch {
      toast.error("Copy failed", { description: "Select and copy manually." });
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "coach": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-[#E8425A]";
      case "athlete": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getStatusBadge = (isActive: number) => {
    return isActive === 1 ? (
      <div className="flex items-center gap-1">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span className="text-sm text-green-600">Active</span>
      </div>
    ) : (
      <div className="flex items-center gap-1">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <span className="text-sm text-red-600">Inactive</span>
      </div>
    );
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="coach-dark min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You do not have permission to access this page. Admin access required.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const content = (
    <>
      {!embedded && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-muted-foreground">Manage user roles, access, and passwords</p>
        </div>
      )}

        {/* Password Reset Requests Banner */}
        {resetRequests.length > 0 && (
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Pending Password Reset Requests ({resetRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {resetRequests.map((req: { id: number; userId: number; email: string; userName: string | null; createdAt: Date }) => {
                const matchedUser = users.find((u: User) => u.id === req.userId);
                return (
                  <div key={req.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-white/90">{req.userName || req.email}</span>
                      <span className="text-xs text-white/40 ml-2">{req.email}</span>
                      <span className="text-xs text-white/30 ml-2">
                        {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => matchedUser && openResetDialog(matchedUser, req.id)}
                        disabled={!matchedUser}
                      >
                        <KeyRound className="h-3.5 w-3.5 mr-1" />
                        Reset Now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => dismissRequestMutation.mutate({ requestId: req.id })}
                        disabled={dismissRequestMutation.isPending}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex gap-2 items-center flex-1">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Total: {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
              {hasActiveFilters && users.length !== filteredUsers.length && (
                <> (filtered from {users.length})</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {users.length === 0 ? (
                  <p>No users found</p>
                ) : (
                  <>
                    <p className="mb-3">No users match your filters.</p>
                    <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Last Signed In</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u: User) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name || "\u2014"}</TableCell>
                        <TableCell className="text-sm">{u.email || "\u2014"}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(u.role)}>{u.role}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(u.isActiveClient)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" title={u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleString() : "Never"}>
                          {formatRelative(u.lastSignedIn)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant={u.isActiveClient === 1 ? "outline" : "default"}
                              onClick={() => setAccessConfirm(u)}
                              disabled={toggleAccessMutation.isPending}
                            >
                              {u.isActiveClient === 1 ? "Deactivate" : "Activate"}
                            </Button>

                            {selectedUserId === u.id ? (
                              <div className="flex gap-2">
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                  <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ROLE_OPTIONS.map((r) => (
                                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (!selectedRole || selectedRole === u.role) return;
                                    setRoleConfirm({ user: u, newRole: selectedRole });
                                  }}
                                  disabled={!selectedRole || selectedRole === u.role || updateRoleMutation.isPending}
                                >
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setSelectedUserId(null); setSelectedRole(""); }}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => { setSelectedUserId(u.id); setSelectedRole(u.role); }}>
                                Change Role
                              </Button>
                            )}

                            <Button size="sm" variant="outline" onClick={() => openEditDialog(u)} title="Edit user info">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>

                            <Button size="sm" variant="outline" onClick={() => openResetDialog(u)} title="Reset password">
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Role Change Confirmation */}
      <AlertDialog open={!!roleConfirm} onOpenChange={(open) => { if (!open) setRoleConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {roleConfirm?.newRole === "admin" && <ShieldAlert className="h-5 w-5 text-red-500" />}
              Change role to {roleConfirm?.newRole}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will change <span className="text-foreground font-medium">{roleConfirm?.user.name || roleConfirm?.user.email}</span>'s
              role from <span className="text-foreground font-medium">{roleConfirm?.user.role}</span> to <span className="text-foreground font-medium">{roleConfirm?.newRole}</span>.
              {roleConfirm?.newRole === "admin" && (
                <span className="block mt-2 text-red-400">
                  Admins can manage all users, reset passwords, and change other users' roles.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateRoleMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roleConfirm && updateRoleMutation.mutate({ userId: roleConfirm.user.id, role: roleConfirm.newRole })}
              disabled={updateRoleMutation.isPending}
              className={roleConfirm?.newRole === "admin" ? "bg-red-600 hover:bg-red-700" : undefined}
            >
              {updateRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Change Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Access Toggle Confirmation */}
      <AlertDialog open={!!accessConfirm} onOpenChange={(open) => { if (!open) setAccessConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {accessConfirm?.isActiveClient === 1 ? "Deactivate user?" : "Activate user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {accessConfirm?.isActiveClient === 1 ? (
                <>
                  <span className="text-foreground font-medium">{accessConfirm?.name || accessConfirm?.email}</span> will
                  lose access to their account. They can be reactivated at any time.
                </>
              ) : (
                <>
                  Restore access for <span className="text-foreground font-medium">{accessConfirm?.name || accessConfirm?.email}</span>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleAccessMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => accessConfirm && toggleAccessMutation.mutate({ userId: accessConfirm.id, isActive: accessConfirm.isActiveClient === 0 })}
              disabled={toggleAccessMutation.isPending}
              className={accessConfirm?.isActiveClient === 1 ? "bg-red-600 hover:bg-red-700" : undefined}
            >
              {toggleAccessMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {accessConfirm?.isActiveClient === 1 ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={!!resetDialogUser || !!lastResetPassword}
        onOpenChange={(open) => {
          if (!open) {
            setResetDialogUser(null);
            setResetRequestId(null);
            setLastResetPassword(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{lastResetPassword ? "Password Reset" : "Reset Password"}</DialogTitle>
          </DialogHeader>

          {lastResetPassword ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Password reset successfully</p>
                    <p className="text-muted-foreground mt-1">
                      Copy and share it with the user through a secure channel. It won't be shown again.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={lastResetPassword.password}
                    className="font-mono text-sm"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button variant="outline" onClick={handleCopyPassword}>
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copy
                  </Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setLastResetPassword(null)}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Set a new password for <span className="font-medium text-foreground">{resetDialogUser?.name || resetDialogUser?.email}</span>
              </p>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 8 characters. Share the new password with the user
                  through a secure channel — never reuse a default.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setResetDialogUser(null); setResetRequestId(null); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleResetPassword}
                  disabled={resetPassword.length < 8 || resetPasswordMutation.isPending || completeResetMutation.isPending}
                >
                  {(resetPasswordMutation.isPending || completeResetMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Reset Password
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editDialogUser} onOpenChange={(open) => { if (!open) setEditDialogUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="User name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditDialogUser(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleEditUser}
                disabled={updateUserInfoMutation.isPending}
              >
                {updateUserInfoMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) return <div className="space-y-6">{content}</div>;

  return (
    <div className="coach-dark min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {content}
      </div>
    </div>
  );
}
