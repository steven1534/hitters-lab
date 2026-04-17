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
import { Label } from "@/components/ui/label";
import { Search, Loader2, CheckCircle2, AlertCircle, KeyRound, Pencil, X, AlertTriangle } from "lucide-react";
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

export default function UserManagement() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");

  // Reset password dialog state
  const [resetDialogUser, setResetDialogUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState("player123");
  const [resetRequestId, setResetRequestId] = useState<number | null>(null);

  // Edit user dialog state
  const [editDialogUser, setEditDialogUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const { data: users = [], isLoading, refetch } = trpc.admin.getAllUsers.useQuery();
  const { data: resetRequests = [], refetch: refetchRequests } = trpc.admin.getPasswordResetRequests.useQuery();

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
      setSelectedUserId(null);
      setSelectedRole("");
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to update user role"),
  });

  const toggleAccessMutation = trpc.admin.toggleClientAccess.useMutation({
    onSuccess: () => {
      toast.success("User access updated");
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to update user access"),
  });

  const resetPasswordMutation = trpc.admin.resetUserPassword.useMutation({
    onSuccess: () => {
      toast.success(`Password reset to "${resetPassword}"`);
      setResetDialogUser(null);
      setResetPassword("player123");
      setResetRequestId(null);
      refetchRequests();
    },
    onError: (error) => toast.error(error.message || "Failed to reset password"),
  });

  const completeResetMutation = trpc.admin.completeResetRequest.useMutation({
    onSuccess: () => {
      toast.success(`Password reset to "${resetPassword}" and request completed`);
      setResetDialogUser(null);
      setResetPassword("player123");
      setResetRequestId(null);
      refetchRequests();
    },
    onError: (error) => toast.error(error.message || "Failed to reset password"),
  });

  const dismissRequestMutation = trpc.admin.dismissResetRequest.useMutation({
    onSuccess: () => {
      toast.success("Reset request dismissed");
      refetchRequests();
    },
    onError: (error) => toast.error(error.message || "Failed to dismiss request"),
  });

  const updateUserInfoMutation = trpc.admin.updateUserInfo.useMutation({
    onSuccess: () => {
      toast.success("User info updated");
      setEditDialogUser(null);
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to update user"),
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u: User) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        (u.name?.toLowerCase().includes(searchLower) || false) ||
        (u.email?.toLowerCase().includes(searchLower) || false)
      );
    });
  }, [users, searchQuery]);

  function openResetDialog(u: User, requestId?: number) {
    setResetDialogUser(u);
    setResetPassword("player123");
    setResetRequestId(requestId ?? null);
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

  return (
    <div className="coach-dark min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-muted-foreground">Manage user roles, access, and passwords</p>
        </div>

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

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Total: {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No users found</p>
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
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant={u.isActiveClient === 1 ? "outline" : "default"}
                              onClick={() => toggleAccessMutation.mutate({ userId: u.id, isActive: u.isActiveClient === 0 })}
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
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="athlete">Athlete</SelectItem>
                                    <SelectItem value="coach">Coach</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  onClick={() => selectedRole && updateRoleMutation.mutate({ userId: u.id, role: selectedRole })}
                                  disabled={!selectedRole || updateRoleMutation.isPending}
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
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetDialogUser} onOpenChange={(open) => { if (!open) { setResetDialogUser(null); setResetRequestId(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Set a new password for <span className="font-medium text-foreground">{resetDialogUser?.name || resetDialogUser?.email}</span>
            </p>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <p className="text-xs text-muted-foreground">Default: player123</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setResetDialogUser(null); setResetRequestId(null); }}>
                Cancel
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={!resetPassword || resetPasswordMutation.isPending || completeResetMutation.isPending}
              >
                {(resetPasswordMutation.isPending || completeResetMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Reset Password
              </Button>
            </div>
          </div>
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
    </div>
  );
}
