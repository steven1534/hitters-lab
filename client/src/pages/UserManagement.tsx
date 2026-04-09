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
import { Search, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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

  // Fetch all users
  const { data: users = [], isLoading, refetch } = trpc.admin.getAllUsers.useQuery();

  // Update user role mutation
  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
      setSelectedUserId(null);
      setSelectedRole("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user role");
    },
  });

  // Toggle client access mutation
  const toggleAccessMutation = trpc.admin.toggleClientAccess.useMutation({
    onSuccess: () => {
      toast.success("User access updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user access");
    },
  });

  // Filter users based on search query
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "coach":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-[#E8425A]";
      case "athlete":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
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
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-muted-foreground">
            Manage user roles and access permissions
          </p>
        </div>

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
                        <TableCell className="font-medium">{u.name || "—"}</TableCell>
                        <TableCell className="text-sm">{u.email || "—"}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(u.role)}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(u.isActiveClient)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {/* Toggle Active Status */}
                            <Button
                              size="sm"
                              variant={u.isActiveClient === 1 ? "outline" : "default"}
                              onClick={() =>
                                toggleAccessMutation.mutate({
                                  userId: u.id,
                                  isActive: u.isActiveClient === 0,
                                })
                              }
                              disabled={toggleAccessMutation.isPending}
                            >
                              {u.isActiveClient === 1 ? "Deactivate" : "Activate"}
                            </Button>

                            {/* Change Role */}
                            {selectedUserId === u.id ? (
                              <div className="flex gap-2">
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                  <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="athlete">Athlete</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (selectedRole) {
                                      updateRoleMutation.mutate({
                                        userId: u.id,
                                        role: selectedRole,
                                      });
                                    }
                                  }}
                                  disabled={!selectedRole || updateRoleMutation.isPending}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUserId(null);
                                    setSelectedRole("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUserId(u.id);
                                  setSelectedRole(u.role);
                                }}
                              >
                                Change Role
                              </Button>
                            )}
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
    </div>
  );
}
