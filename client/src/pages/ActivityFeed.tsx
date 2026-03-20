import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  Eye, 
  LogIn, 
  PlayCircle, 
  CheckCircle, 
  Video, 
  MessageSquare,
  AlertTriangle,
  Users,
  TrendingUp,
  Clock,
  Settings,
  RefreshCw,
  Mail
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

// Activity type icons and colors
const activityConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  portal_login: { icon: <LogIn className="h-4 w-4" />, color: "bg-red-100 text-red-700", label: "Login" },
  drill_view: { icon: <Eye className="h-4 w-4" />, color: "bg-purple-100 text-purple-700", label: "Viewed" },
  assignment_view: { icon: <Eye className="h-4 w-4" />, color: "bg-red-100 text-[#DC143C]", label: "Assignments" },
  drill_start: { icon: <PlayCircle className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-700", label: "Started" },
  drill_complete: { icon: <CheckCircle className="h-4 w-4" />, color: "bg-green-100 text-green-700", label: "Completed" },
  video_submit: { icon: <Video className="h-4 w-4" />, color: "bg-pink-100 text-pink-700", label: "Video" },
  message_sent: { icon: <MessageSquare className="h-4 w-4" />, color: "bg-orange-100 text-orange-700", label: "Message" },
  profile_update: { icon: <Users className="h-4 w-4" />, color: "bg-gray-100 text-gray-700", label: "Profile" },
};

export default function ActivityFeed() {
  const [activeTab, setActiveTab] = useState("feed");

  // Fetch activity data
  const { data: activities = [], isLoading: activitiesLoading, refetch: refetchActivities } = 
    trpc.activity.getRecentActivities.useQuery({ limit: 100 });

  const { data: summary, isLoading: summaryLoading } = 
    trpc.activity.getActivitySummary.useQuery();

  const { data: inactiveAthletes = [], isLoading: inactiveLoading } = 
    trpc.activity.getInactiveAthletes.useQuery({ days: 3 });

  const { data: alertPrefs, refetch: refetchPrefs } = 
    trpc.activity.getAlertPreferences.useQuery();

  const updatePrefsMutation = trpc.activity.updateAlertPreferences.useMutation({
    onSuccess: () => {
      toast.success("Alert preferences updated");
      refetchPrefs();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update preferences");
    },
  });

  const handlePrefChange = (key: string, value: boolean) => {
    updatePrefsMutation.mutate({ [key]: value ? 1 : 0 });
  };

  const getActivityMessage = (activity: any) => {
    const metadata = activity.metadata as Record<string, any> | null;
    const drillName = metadata?.drillName || "a drill";
    
    switch (activity.activityType) {
      case "portal_login": return "logged into their portal";
      case "drill_view": return `viewed ${drillName}`;
      case "assignment_view": return "viewed their assignments";
      case "drill_start": return `started working on ${drillName}`;
      case "drill_complete": return `completed ${drillName}`;
      case "video_submit": return `submitted a video for ${drillName}`;
      case "message_sent": return "sent you a message";
      case "profile_update": return "updated their profile";
      default: return "performed an action";
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Activity Feed
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time alerts when your athletes engage with the platform
          </p>
        </div>
        <Button variant="outline" onClick={() => refetchActivities()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Users className="h-5 w-5 text-[#DC143C]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.activeAthletesToday || 0}</p>
                <p className="text-xs text-muted-foreground">Active Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.drillsViewedToday || 0}</p>
                <p className="text-xs text-muted-foreground">Drills Viewed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.drillsCompletedToday || 0}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Video className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.videosSubmittedToday || 0}</p>
                <p className="text-xs text-muted-foreground">Videos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.messagesReceivedToday || 0}</p>
                <p className="text-xs text-muted-foreground">Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="feed">
            <Activity className="h-4 w-4 mr-2" />
            Live Feed
          </TabsTrigger>
          <TabsTrigger value="inactive">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Inactive Athletes
            {inactiveAthletes.length > 0 && (
              <Badge variant="destructive" className="ml-2">{inactiveAthletes.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Alert Settings
          </TabsTrigger>
        </TabsList>

        {/* Live Feed Tab */}
        <TabsContent value="feed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Activities from your athletes in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No activity recorded yet</p>
                  <p className="text-sm">Activities will appear here when athletes use the platform</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity: any) => {
                    const config = activityConfig[activity.activityType] || activityConfig.portal_login;
                    return (
                      <div
                        key={activity.id}
                        className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className={`p-2 rounded-full ${config.color}`}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {activity.athleteName || activity.athleteEmail || `Athlete #${activity.athleteId}`}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {getActivityMessage(activity)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </div>
                        <Badge variant="outline" className={config.color}>
                          {config.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inactive Athletes Tab */}
        <TabsContent value="inactive" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Inactive Athletes
              </CardTitle>
              <CardDescription>
                Athletes who haven't logged in for 3+ days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inactiveLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : inactiveAthletes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="font-medium">All athletes are active!</p>
                  <p className="text-sm">No athletes have been inactive for more than 3 days</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inactiveAthletes.map((athlete: any) => (
                    <div
                      key={athlete.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-yellow-200 bg-yellow-50"
                    >
                      <div className="p-2 rounded-full bg-yellow-100">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{athlete.name || athlete.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {athlete.lastSeen 
                            ? `Last seen ${formatDistanceToNow(new Date(athlete.lastSeen), { addSuffix: true })}`
                            : "Never logged in"
                          }
                        </p>
                      </div>
                      {athlete.daysSinceLastActivity !== null && (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          {athlete.daysSinceLastActivity} days inactive
                        </Badge>
                      )}
                      <Link href={`/coach-dashboard?athlete=${athlete.id}`}>
                        <Button size="sm" variant="outline">
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alert Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert Preferences</CardTitle>
              <CardDescription>
                Choose which activities trigger notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Activity Alerts</h3>
                
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <LogIn className="h-5 w-5 text-[#DC143C]" />
                      <Label htmlFor="portal_login">Portal Login</Label>
                    </div>
                    <Switch
                      id="portal_login"
                      checked={!!alertPrefs?.alertOnPortalLogin}
                      onCheckedChange={(checked) => handlePrefChange("alertOnPortalLogin", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Eye className="h-5 w-5 text-purple-500" />
                      <Label htmlFor="drill_view">Drill Viewed</Label>
                    </div>
                    <Switch
                      id="drill_view"
                      checked={!!alertPrefs?.alertOnDrillView}
                      onCheckedChange={(checked) => handlePrefChange("alertOnDrillView", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Eye className="h-5 w-5 text-[#DC143C]" />
                      <Label htmlFor="assignment_view">Assignments Viewed</Label>
                    </div>
                    <Switch
                      id="assignment_view"
                      checked={!!alertPrefs?.alertOnAssignmentView}
                      onCheckedChange={(checked) => handlePrefChange("alertOnAssignmentView", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <PlayCircle className="h-5 w-5 text-yellow-500" />
                      <Label htmlFor="drill_start">Drill Started</Label>
                    </div>
                    <Switch
                      id="drill_start"
                      checked={!!alertPrefs?.alertOnDrillStart}
                      onCheckedChange={(checked) => handlePrefChange("alertOnDrillStart", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <Label htmlFor="drill_complete">Drill Completed</Label>
                    </div>
                    <Switch
                      id="drill_complete"
                      checked={!!alertPrefs?.alertOnDrillComplete}
                      onCheckedChange={(checked) => handlePrefChange("alertOnDrillComplete", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Video className="h-5 w-5 text-pink-500" />
                      <Label htmlFor="video_submit">Video Submitted</Label>
                    </div>
                    <Switch
                      id="video_submit"
                      checked={!!alertPrefs?.alertOnVideoSubmit}
                      onCheckedChange={(checked) => handlePrefChange("alertOnVideoSubmit", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-orange-500" />
                      <Label htmlFor="message_sent">Message Received</Label>
                    </div>
                    <Switch
                      id="message_sent"
                      checked={!!alertPrefs?.alertOnMessageSent}
                      onCheckedChange={(checked) => handlePrefChange("alertOnMessageSent", checked)}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="font-medium">Delivery Settings</h3>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-primary" />
                    <Label htmlFor="in_app">In-App Notifications</Label>
                  </div>
                  <Switch
                    id="in_app"
                    checked={!!alertPrefs?.inAppAlerts}
                    onCheckedChange={(checked) => handlePrefChange("inAppAlerts", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-[#DC143C]" />
                    <div>
                      <Label htmlFor="email_alerts">Instant Email Alerts</Label>
                      <p className="text-xs text-muted-foreground">Get an email every time an athlete performs an activity</p>
                    </div>
                  </div>
                  <Switch
                    id="email_alerts"
                    checked={!!alertPrefs?.emailAlerts}
                    onCheckedChange={(checked) => handlePrefChange("emailAlerts", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <Label htmlFor="inactivity">Inactivity Alerts</Label>
                  </div>
                  <Switch
                    id="inactivity"
                    checked={!!alertPrefs?.alertOnInactivity}
                    onCheckedChange={(checked) => handlePrefChange("alertOnInactivity", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
