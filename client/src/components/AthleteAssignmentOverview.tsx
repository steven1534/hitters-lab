import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Search,
  ChevronRight,
  UserPlus,
  Target,
  TrendingUp,
  AlertTriangle,
  User,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";
import { AthleteProfilePanel } from "./AthleteProfilePanel";
import { InlineEdit } from "./InlineEdit";

interface AthleteAssignmentOverviewProps {
  onSelectAthlete?: (athleteId: string) => void;
}

export function AthleteAssignmentOverview({ onSelectAthlete }: AthleteAssignmentOverviewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "with-drills" | "without-drills">("all");
  const [viewingProfileId, setViewingProfileId] = useState<number | null>(null);
  
  const { data, isLoading, error } = trpc.drillAssignments.getAthleteAssignmentOverview.useQuery();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-6">
          <p className="text-destructive text-center">Failed to load athlete overview</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { summary, athletes } = data ?? {};
  if (!summary) return null;

  // If viewing a specific athlete's profile
  if (viewingProfileId !== null) {
    const athlete = athletes.find((a) => {
      const numId = parseInt(a.id.replace(/^(user-|invite-)/, ""));
      return a.type === "user" && numId === viewingProfileId;
    });

    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-5 md:p-6">
            <AthleteProfilePanel
              userId={viewingProfileId}
              onClose={() => setViewingProfileId(null)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter and search athletes
  const filteredAthletes = athletes
    .filter(athlete => {
      if (filter === "with-drills" && !athlete.hasDrills) return false;
      if (filter === "without-drills" && athlete.hasDrills) return false;
      return true;
    })
    .filter(athlete => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        athlete.name.toLowerCase().includes(query) ||
        athlete.email.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      // Sort: without drills first, then by name
      if (a.hasDrills !== b.hasDrills) return a.hasDrills ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

  const needsAttention = athletes.filter(a => !a.hasDrills).length;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalAthletes}</p>
                <InlineEdit contentKey="coach.overview.stat.totalAthletes" defaultValue="Total Athletes" as="p" className="text-xs text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.athletesWithDrills}</p>
                <InlineEdit contentKey="coach.overview.stat.withDrills" defaultValue="With Drills" as="p" className="text-xs text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${needsAttention > 0 ? 'from-amber-500/10 to-amber-500/5 border-amber-500/20' : 'from-muted/50 to-muted/30 border-muted'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${needsAttention > 0 ? 'bg-amber-500/20' : 'bg-muted'}`}>
                <AlertTriangle className={`h-5 w-5 ${needsAttention > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.athletesWithoutDrills}</p>
                <InlineEdit contentKey="coach.overview.stat.needDrills" defaultValue="Need Drills" as="p" className="text-xs text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#DC143C]/10 to-[#DC143C]/5 border-[#DC143C]/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#DC143C]/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-[#DC143C]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.completionRate}%</p>
                <InlineEdit contentKey="coach.overview.stat.completionRate" defaultValue="Completion Rate" as="p" className="text-xs text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Athlete List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-secondary" />
              <InlineEdit contentKey="coach.overview.listTitle" defaultValue="Athlete Assignment Status" as="span" />
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search athletes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex gap-2 mt-3">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className="text-xs"
            >
              All ({summary.totalAthletes})
            </Button>
            <Button
              variant={filter === "with-drills" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("with-drills")}
              className="text-xs"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              With Drills ({summary.athletesWithDrills})
            </Button>
            <Button
              variant={filter === "without-drills" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("without-drills")}
              className={`text-xs ${needsAttention > 0 ? 'border-amber-500/50 text-amber-500 hover:bg-amber-500/10' : ''}`}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Need Drills ({summary.athletesWithoutDrills})
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {filteredAthletes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No athletes found</p>
              {filter !== "all" && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setFilter("all")}
                  className="mt-2"
                >
                  Show all athletes
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAthletes.map((athlete) => {
                const numericId = parseInt(athlete.id.replace(/^(user-|invite-)/, ""));
                const isUser = athlete.type === "user";

                return (
                  <div
                    key={athlete.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm ${
                      !athlete.hasDrills 
                        ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40' 
                        : 'bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      onClick={() => onSelectAthlete?.(athlete.id)}
                    >
                      {/* Status Indicator */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        !athlete.hasDrills 
                          ? 'bg-amber-500/20' 
                          : athlete.completedDrills === athlete.totalDrills && athlete.totalDrills > 0
                            ? 'bg-green-500/20'
                            : 'bg-[#DC143C]/20'
                      }`}>
                        {!athlete.hasDrills ? (
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                        ) : athlete.completedDrills === athlete.totalDrills && athlete.totalDrills > 0 ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-[#DC143C]" />
                        )}
                      </div>

                      {/* Athlete Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{athlete.name}</p>
                          {athlete.type === 'invite' && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              <UserPlus className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{athlete.email}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {athlete.hasDrills ? (
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="text-green-500 font-medium">{athlete.completedDrills}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="font-medium">{athlete.totalDrills}</span>
                            <span className="text-muted-foreground text-xs">drills</span>
                          </div>
                          {athlete.inProgressDrills > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {athlete.inProgressDrills} in progress
                            </p>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 hidden sm:flex">
                          No drills assigned
                        </Badge>
                      )}

                      {/* Profile button for registered users */}
                      {isUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-[#DC143C]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingProfileId(numericId);
                          }}
                          title="View Profile"
                        >
                          <User className="h-4 w-4" />
                        </Button>
                      )}

                      <ChevronRight
                        className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-pointer"
                        onClick={() => onSelectAthlete?.(athlete.id)}
                      />
                    </div>
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
