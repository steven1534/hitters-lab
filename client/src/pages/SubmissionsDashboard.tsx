import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Video, FileText, Search, Home, LogOut, ChevronRight, Send, Inbox, CheckCheck, Clock } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useAllDrills, type UnifiedDrill } from "@/hooks/useAllDrills";
import { toast } from "sonner";

interface Submission {
  id: number;
  userId: number;
  drillId: string;
  notes: string | null;
  videoUrl: string | null;
  submittedAt: Date;
  athleteName?: string;
  drillName?: string;
  feedbackCount?: number;
}

type TabKey = "all" | "unreviewed" | "reviewed";

export default function SubmissionsDashboard({ embedded = false }: { embedded?: boolean }) {
  const { user, loading, logout } = useAuth();
  const utils = trpc.useUtils();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAthlete, setFilterAthlete] = useState("all");
  const [filterDrill, setFilterDrill] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "oldest">("recent");
  const [tab, setTab] = useState<TabKey>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [feedbackText, setFeedbackText] = useState("");
  const itemsPerPage = 10;

  // Fetch all users for athlete filter
  const { data: allUsers = [] } = trpc.admin.getAllUsers.useQuery(undefined, {
    enabled: user?.role === 'admin',
  });

  // Fetch all submissions from all athletes (admin-only route)
  const { data: allSubmissions = [], isLoading: submissionsLoading } =
    trpc.submissions.drillSubmissions.getAllSubmissions.useQuery(undefined, {
      enabled: user?.role === 'admin',
    });

  // Drill catalog (static + custom), so we can show drill names instead of IDs
  const drillCatalog = useAllDrills();
  const drillLookup = useMemo(() => {
    const m = new Map<string, UnifiedDrill>();
    for (const d of drillCatalog) m.set(d.id, d);
    return m;
  }, [drillCatalog]);
  const drillName = (drillId: string) => drillLookup.get(drillId)?.name ?? drillId;

  // Per-submission feedback counts (admin-only route), to power the Unreviewed/Reviewed tabs
  const { data: feedbackCounts = {} } =
    trpc.submissions.coachFeedback.getFeedbackCountsBySubmissions.useQuery(undefined, {
      enabled: user?.role === 'admin',
    });

  // Fetch feedback for selected submission
  const { data: feedbackList = [] } = trpc.submissions.coachFeedback.getFeedbackBySubmission.useQuery(
    { submissionId: selectedSubmission?.id || 0 },
    { enabled: !!selectedSubmission }
  );

  // Create feedback mutation
  const createFeedbackMutation = trpc.submissions.coachFeedback.createFeedback.useMutation({
    onSuccess: () => {
      toast.success("Feedback sent to athlete");
      setFeedbackText("");
      utils.submissions.coachFeedback.getFeedbackBySubmission.invalidate();
      utils.submissions.coachFeedback.getFeedbackCountsBySubmissions.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to send feedback", { description: error.message });
    },
  });

  // Filter, tab-partition, and sort submissions
  const decoratedSubmissions = useMemo(() => {
    return allSubmissions.map((sub: any) => {
      const count = (feedbackCounts as Record<string, number>)[String(sub.id)] ?? 0;
      return {
        ...sub,
        athleteName: allUsers.find((u: any) => u.id === sub.userId)?.name || `Athlete ${sub.userId}`,
        drillName: drillName(sub.drillId),
        feedbackCount: count,
      } as Submission;
    });
  }, [allSubmissions, allUsers, feedbackCounts, drillLookup]);

  const tabCounts = useMemo(() => {
    let unreviewed = 0;
    let reviewed = 0;
    for (const s of decoratedSubmissions) {
      if ((s.feedbackCount ?? 0) > 0) reviewed++;
      else unreviewed++;
    }
    return { all: decoratedSubmissions.length, unreviewed, reviewed };
  }, [decoratedSubmissions]);

  const filteredSubmissions = useMemo(() => {
    let filtered = decoratedSubmissions;

    if (tab === "unreviewed") filtered = filtered.filter((s) => (s.feedbackCount ?? 0) === 0);
    else if (tab === "reviewed") filtered = filtered.filter((s) => (s.feedbackCount ?? 0) > 0);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((sub) =>
        (sub.athleteName ?? "").toLowerCase().includes(query) ||
        sub.drillId.toLowerCase().includes(query) ||
        (sub.drillName ?? "").toLowerCase().includes(query) ||
        (sub.notes ?? "").toLowerCase().includes(query)
      );
    }

    if (filterAthlete !== "all") {
      filtered = filtered.filter((sub) => sub.userId.toString() === filterAthlete);
    }

    if (filterDrill !== "all") {
      filtered = filtered.filter((sub) => sub.drillId === filterDrill);
    }

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const dateA = new Date(a.submittedAt).getTime();
      const dateB = new Date(b.submittedAt).getTime();
      return sortBy === "recent" ? dateB - dateA : dateA - dateB;
    });

    return sorted;
  }, [decoratedSubmissions, tab, searchQuery, filterAthlete, filterDrill, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / itemsPerPage));
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Unique drills that actually appear in submissions (for drill filter)
  const uniqueDrills = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of decoratedSubmissions) {
      if (!seen.has(s.drillId)) seen.set(s.drillId, s.drillName ?? s.drillId);
    }
    return Array.from(seen.entries())
      .sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: "base" }));
  }, [decoratedSubmissions]);

  const hasActiveFilters = !!searchQuery.trim() || filterAthlete !== "all" || filterDrill !== "all" || tab !== "all";

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim() || !selectedSubmission) return;
    await createFeedbackMutation.mutateAsync({
      submissionId: selectedSubmission.id,
      userId: selectedSubmission.userId,
      drillId: selectedSubmission.drillId,
      feedback: feedbackText.trim(),
    });
  };

  if (loading) {
    return (
      <div className="coach-dark min-h-screen bg-background flex items-center justify-center">
        <div className="container py-12 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="coach-dark min-h-screen bg-background">
      <div className="container py-12">
        <Card className="max-w-2xl mx-auto border-2">
          <CardHeader className="text-center">
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">Only coaches can access the submissions dashboard.</p>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      </div>
    );
  }

  const clearFilters = () => {
    setSearchQuery("");
    setFilterAthlete("all");
    setFilterDrill("all");
    setTab("all");
    setCurrentPage(1);
  };

  const mainContent = (
    <>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{tabCounts.all}</div>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-400">{tabCounts.unreviewed}</div>
                <p className="text-sm text-muted-foreground">Awaiting Feedback</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-500">{tabCounts.reviewed}</div>
                <p className="text-sm text-muted-foreground">Feedback Sent</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Submissions List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <CardTitle>Submissions</CardTitle>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                      Clear filters
                    </Button>
                  )}
                </div>

                {/* Tabs */}
                <div className="inline-flex bg-muted/40 rounded-lg border border-border p-0.5 mb-4">
                  {([
                    { key: "all", label: "All", icon: Inbox, count: tabCounts.all },
                    { key: "unreviewed", label: "Unreviewed", icon: Clock, count: tabCounts.unreviewed },
                    { key: "reviewed", label: "Reviewed", icon: CheckCheck, count: tabCounts.reviewed },
                  ] as const).map((t) => {
                    const Icon = t.icon;
                    const active = tab === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => { setTab(t.key); setCurrentPage(1); }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          active
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground/80"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {t.label}
                        <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px] font-normal border-border">
                          {t.count}
                        </Badge>
                      </button>
                    );
                  })}
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by athlete, drill, or notes…"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select value={filterAthlete} onValueChange={(val) => {
                    setFilterAthlete(val);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by athlete" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Athletes</SelectItem>
                      {allUsers.filter((u: any) => u.role === 'athlete').map((athlete: any) => (
                        <SelectItem key={athlete.id} value={athlete.id.toString()}>
                          {athlete.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterDrill} onValueChange={(val) => {
                    setFilterDrill(val);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by drill" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Drills</SelectItem>
                      {uniqueDrills.map(([drillId, name]) => (
                        <SelectItem key={drillId} value={drillId}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Most Recent</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent>
                {submissionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-24 rounded-lg bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : paginatedSubmissions.length > 0 ? (
                  <div className="space-y-3">
                    {paginatedSubmissions.map((submission) => {
                      const unreviewed = (submission.feedbackCount ?? 0) === 0;
                      return (
                        <div
                          key={submission.id}
                          onClick={() => setSelectedSubmission(submission)}
                          className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                            selectedSubmission?.id === submission.id ? "border-secondary bg-secondary/5" : "hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg truncate">{submission.athleteName}</h3>
                                {unreviewed ? (
                                  <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] h-5 px-1.5">
                                    New
                                  </Badge>
                                ) : (
                                  <Badge className="bg-green-500/15 text-green-500 border-green-500/30 text-[10px] h-5 px-1.5">
                                    <CheckCheck className="h-3 w-3 mr-0.5" />
                                    {submission.feedbackCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2 truncate">
                                Drill: <span className="text-foreground/80">{submission.drillName}</span>
                              </p>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {submission.notes && (
                                  <Badge variant="outline" className="gap-1">
                                    <FileText className="h-3 w-3" />
                                    Notes
                                  </Badge>
                                )}
                                {submission.videoUrl && (
                                  <Badge variant="outline" className="gap-1">
                                    <Video className="h-3 w-3" />
                                    Video
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(submission.submittedAt).toLocaleString()}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : decoratedSubmissions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No submissions yet</p>
                    <p className="text-sm">Athletes haven't submitted any drill work yet. Once they do, it'll show up here.</p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No matches</p>
                    <p className="text-sm mb-4">Try a different search or clear your filters.</p>
                    <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Submission Details & Feedback */}
          <div className="lg:col-span-1">
            {selectedSubmission ? (
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="text-lg">Submission Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Submission Info */}
                  <div className="space-y-3 p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Athlete</p>
                      <p className="text-sm font-medium">{selectedSubmission.athleteName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Drill</p>
                      <p className="text-sm font-medium">{selectedSubmission.drillName || selectedSubmission.drillId}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Submitted</p>
                      <p className="text-sm">{new Date(selectedSubmission.submittedAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedSubmission.notes && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Athlete Notes</p>
                      <p className="text-sm text-muted-foreground p-2 bg-muted rounded whitespace-pre-wrap">{selectedSubmission.notes}</p>
                    </div>
                  )}

                  {/* Video */}
                  {selectedSubmission.videoUrl && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Video Submission</p>
                      <video
                        src={selectedSubmission.videoUrl}
                        controls
                        className="w-full rounded-lg max-h-64 bg-black"
                      />
                    </div>
                  )}

                  {/* Previous Feedback */}
                  {feedbackList.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Previous Feedback</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {feedbackList.map((feedback: any) => (
                          <div key={feedback.id} className="p-2 bg-red-500/10 rounded border border-red-500/20">
                            <p className="text-xs text-red-200 whitespace-pre-wrap">{feedback.feedback}</p>
                            <p className="text-xs text-red-400/80 mt-1">
                              {new Date(feedback.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedback Form */}
                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-sm font-semibold">Provide Feedback</p>
                    <Textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Share constructive feedback on their performance..."
                      rows={3}
                      disabled={createFeedbackMutation.isPending}
                      className="text-sm"
                    />
                    <Button
                      onClick={handleSubmitFeedback}
                      disabled={!feedbackText.trim() || createFeedbackMutation.isPending}
                      className="w-full"
                      size="sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {createFeedbackMutation.isPending ? "Sending..." : "Send Feedback"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Select a submission to view details and provide feedback</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
    </>
  );

  if (embedded) return <div className="space-y-6">{mainContent}</div>;

  return (
    <div className="coach-dark min-h-screen bg-background">
      <header className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-8 mb-8">
        <div className="container">
          <div className="flex items-center justify-between mb-4">
            <Link href="/coach-dashboard">
              <Button variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 pl-0">
                <Home className="mr-2 h-4 w-4" />Coach Dashboard
              </Button>
            </Link>
            <Button onClick={() => logout()} variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
              <LogOut className="mr-2 h-4 w-4" />Log Out
            </Button>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-heading font-black">Athlete Submissions</h1>
            <p className="text-primary-foreground/90">Review and provide feedback on athlete drill submissions</p>
          </div>
        </div>
      </header>
      <main className="container max-w-7xl pb-12">{mainContent}</main>
    </div>
  );
}
