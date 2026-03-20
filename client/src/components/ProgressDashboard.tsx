import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, Flame } from "lucide-react";

interface ProgressStats {
  total: number;
  completed: number;
  inProgress: number;
  assigned: number;
  streak?: number;
}

interface ProgressDashboardProps {
  stats: ProgressStats;
}

export function ProgressDashboard({ stats }: ProgressDashboardProps) {
  const completionPercentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Drills Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Drills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{stats.total}</div>
            <AlertCircle className="h-8 w-8 text-primary/30" />
          </div>
        </CardContent>
      </Card>

      {/* Completed Card */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            <CheckCircle className="h-8 w-8 text-green-500/30" />
          </div>
        </CardContent>
      </Card>

      {/* In Progress Card */}
      <Card className="border-l-4 border-l-[#DC143C]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-[#DC143C]">{stats.inProgress}</div>
            <Clock className="h-8 w-8 text-[#DC143C]/30" />
          </div>
        </CardContent>
      </Card>

      {/* Assigned Card */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Assigned</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-orange-600">{stats.assigned}</div>
            <AlertCircle className="h-8 w-8 text-orange-500/30" />
          </div>
        </CardContent>
      </Card>

      {/* Streak Card (if available) */}
      {stats.streak !== undefined && (
        <Card className="border-l-4 border-l-red-500 md:col-span-2 lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4 text-red-500" />
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.streak} day{stats.streak !== 1 ? 's' : ''}</div>
              <p className="text-sm text-muted-foreground">Keep it going! 🔥</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-foreground">Overall Progress</h3>
        <Badge variant="secondary">{Math.round(percentage)}% Complete</Badge>
      </div>
      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-primary to-primary/80 h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {completed} of {total} drills completed
      </p>
    </div>
  );
}
