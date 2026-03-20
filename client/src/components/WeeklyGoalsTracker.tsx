import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Target, TrendingUp, Edit2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface WeeklyGoalsTrackerProps {
  athleteId: number;
  completedThisWeek: number;
}

export function WeeklyGoalsTracker({ athleteId, completedThisWeek }: WeeklyGoalsTrackerProps) {
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [targetCount, setTargetCount] = useState("");
  const [notes, setNotes] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");

  const utils = trpc.useUtils();

  // Get current week's goal
  const { data: currentGoal } = trpc.drillAssignments.getCurrentWeekGoal.useQuery({ athleteId });

  // Get all goals
  const { data: allGoals = [] } = trpc.drillAssignments.getWeeklyGoals.useQuery({ athleteId });

  // Create goal mutation
  const createGoal = trpc.drillAssignments.createWeeklyGoal.useMutation({
    onSuccess: () => {
      utils.drillAssignments.getCurrentWeekGoal.invalidate({ athleteId });
      utils.drillAssignments.getWeeklyGoals.invalidate({ athleteId });
      toast.success("Weekly goal created!");
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create goal: ${error.message}`);
    },
  });

  // Update goal mutation
  const updateGoal = trpc.drillAssignments.updateWeeklyGoal.useMutation({
    onSuccess: () => {
      utils.drillAssignments.getCurrentWeekGoal.invalidate({ athleteId });
      utils.drillAssignments.getWeeklyGoals.invalidate({ athleteId });
      toast.success("Goal updated!");
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to update goal: ${error.message}`);
    },
  });

  // Delete goal mutation
  const deleteGoal = trpc.drillAssignments.deleteWeeklyGoal.useMutation({
    onSuccess: () => {
      utils.drillAssignments.getCurrentWeekGoal.invalidate({ athleteId });
      utils.drillAssignments.getWeeklyGoals.invalidate({ athleteId });
      toast.success("Goal deleted!");
    },
    onError: (error) => {
      toast.error(`Failed to delete goal: ${error.message}`);
    },
  });

  const resetForm = () => {
    setShowAddGoal(false);
    setEditingGoalId(null);
    setTargetCount("");
    setNotes("");
    setWeekStart("");
    setWeekEnd("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingGoalId) {
      updateGoal.mutate({
        goalId: editingGoalId,
        targetDrillCount: parseInt(targetCount),
        notes,
      });
    } else {
      if (!weekStart || !weekEnd || !targetCount) {
        toast.error("Please fill in all required fields");
        return;
      }

      createGoal.mutate({
        athleteId,
        weekStartDate: new Date(weekStart),
        weekEndDate: new Date(weekEnd),
        targetDrillCount: parseInt(targetCount),
        notes,
      });
    }
  };

  const handleEdit = (goal: any) => {
    setEditingGoalId(goal.id);
    setTargetCount(goal.targetDrillCount.toString());
    setNotes(goal.notes || "");
    setShowAddGoal(true);
  };

  const handleDelete = (goalId: number) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      deleteGoal.mutate({ goalId });
    }
  };

  const progressPercentage = currentGoal
    ? Math.min(Math.round((completedThisWeek / currentGoal.targetDrillCount) * 100), 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Weekly Goals
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddGoal(!showAddGoal)}
          >
            <Plus className="h-4 w-4 mr-1" />
            {showAddGoal ? "Cancel" : "Set Goal"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Week Goal */}
        {currentGoal && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {new Date(currentGoal.weekStartDate).toLocaleDateString()} -{" "}
                  {new Date(currentGoal.weekEndDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(currentGoal)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(currentGoal.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Target: {currentGoal.targetDrillCount} drills</span>
                <span className="font-semibold">
                  {completedThisWeek} / {currentGoal.targetDrillCount}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {progressPercentage}% complete
              </div>
            </div>

            {currentGoal.notes && (
              <p className="text-sm text-muted-foreground italic">
                {currentGoal.notes}
              </p>
            )}
          </div>
        )}

        {/* Add/Edit Goal Form */}
        {showAddGoal && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
            {!editingGoalId && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weekStart">Week Start</Label>
                  <Input
                    id="weekStart"
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekEnd">Week End</Label>
                  <Input
                    id="weekEnd"
                    type="date"
                    value={weekEnd}
                    onChange={(e) => setWeekEnd(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="targetCount">Target Drill Count</Label>
              <Input
                id="targetCount"
                type="number"
                min="1"
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                placeholder="e.g., 5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Focus areas, specific drills, etc."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createGoal.isPending || updateGoal.isPending}>
                {editingGoalId ? "Update Goal" : "Create Goal"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Past Goals */}
        {allGoals.length > 1 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Past Goals</h4>
            <div className="space-y-2">
              {allGoals
                .filter((g) => g.id !== currentGoal?.id)
                .slice(0, 3)
                .map((goal) => (
                  <div
                    key={goal.id}
                    className="p-3 bg-muted/30 rounded text-sm space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(goal.weekStartDate).toLocaleDateString()} -{" "}
                        {new Date(goal.weekEndDate).toLocaleDateString()}
                      </span>
                      <span className="font-medium">
                        Target: {goal.targetDrillCount} drills
                      </span>
                    </div>
                    {goal.notes && (
                      <p className="text-xs text-muted-foreground italic">
                        {goal.notes}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
