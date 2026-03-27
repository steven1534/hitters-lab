import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, CheckCircle, Clock, AlertCircle, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";

export default function ParentDashboard() {
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  // Fetch children managed by this parent
  const { data: children = [], isLoading: childrenLoading } = trpc.parentManagement.getMyChildren.useQuery();

  // Fetch assignments for selected child
  const { data: assignments = [], isLoading: assignmentsLoading, refetch } = trpc.parentManagement.getChildAssignments.useQuery(
    { childUserId: selectedChildId! },
    { enabled: !!selectedChildId }
  );

  // Fetch progress for selected child
  const { data: progressData } = trpc.parentManagement.getChildProgress.useQuery(
    { childUserId: selectedChildId! },
    { enabled: !!selectedChildId }
  );

  // Mutation to mark drill complete
  const markCompleteMutation = trpc.parentManagement.markChildDrillComplete.useMutation({
    onSuccess: () => {
      toast.success("Drill marked as complete!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to mark drill complete");
    },
  });

  // Mutation to update drill status
  const updateStatusMutation = trpc.parentManagement.updateChildDrillStatus.useMutation({
    onSuccess: () => {
      toast.success("Drill status updated!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update drill status");
    },
  });

  const handleMarkComplete = (assignmentId: number) => {
    if (!selectedChildId) return;
    markCompleteMutation.mutate({
      childUserId: selectedChildId,
      assignmentId,
    });
  };

  const handleStatusChange = (assignmentId: number, status: "assigned" | "in-progress" | "completed") => {
    if (!selectedChildId) return;
    updateStatusMutation.mutate({
      childUserId: selectedChildId,
      assignmentId,
      status,
    });
  };

  const selectedChild = children.find((c: any) => c.id === selectedChildId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "in-progress":
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (childrenLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Children Linked</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any child accounts linked to your parent account yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Contact your coach to link your child's account to yours.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Parent Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your child's drill assignments and track their progress
        </p>
      </div>

      {/* Child Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Child
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedChildId?.toString() || ""}
            onValueChange={(value) => setSelectedChildId(parseInt(value))}
          >
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Choose a child to manage" />
            </SelectTrigger>
            <SelectContent>
              {children.map((child: any) => (
                <SelectItem key={child.id} value={child.id.toString()}>
                  {child.name || child.email || `Child ${child.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedChild && (
        <>
          {/* Info Banner */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <p className="text-sm">
                <strong>You're managing {selectedChild.name || "your child"}'s training.</strong> You can mark drills as complete and track their progress on their behalf.
              </p>
            </CardContent>
          </Card>

          {/* Progress Summary */}
          {progressData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{progressData.coreMetrics.totalAssigned}</p>
                      <p className="text-sm text-muted-foreground">Total Assigned</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{progressData.coreMetrics.completed}</p>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Clock className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{progressData.coreMetrics.inProgress}</p>
                      <p className="text-sm text-muted-foreground">In Progress</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#DC143C]/10 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-[#DC143C]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{progressData.coreMetrics.completionRate}%</p>
                      <p className="text-sm text-muted-foreground">Completion Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Drill Assignments */}
          <Card>
            <CardHeader>
              <CardTitle>Assigned Drills</CardTitle>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="space-y-3">
                  <div className="h-20 bg-muted animate-pulse rounded" />
                  <div className="h-20 bg-muted animate-pulse rounded" />
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No drills assigned yet
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment: any) => (
                    <div
                      key={assignment.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Link href={`/drill/${assignment.drillId}`}>
                              <h3 className="font-semibold hover:text-primary cursor-pointer">
                                {assignment.drillName}
                              </h3>
                            </Link>
                            <Badge variant="outline" className={getStatusColor(assignment.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(assignment.status)}
                                {assignment.status}
                              </span>
                            </Badge>
                          </div>
                          
                          {assignment.notes && (
                            <p className="text-sm text-muted-foreground mb-2">
                              Coach notes: {assignment.notes}
                            </p>
                          )}
                          
                          <p className="text-xs text-muted-foreground">
                            Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                            {assignment.completedAt && (
                              <> • Completed: {new Date(assignment.completedAt).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          {assignment.status !== "completed" && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkComplete(assignment.id)}
                              disabled={markCompleteMutation.isPending}
                            >
                              Mark Complete
                            </Button>
                          )}
                          
                          <Select
                            value={assignment.status}
                            onValueChange={(value) => handleStatusChange(assignment.id, value as any)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="assigned">Assigned</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
