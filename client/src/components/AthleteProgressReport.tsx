import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Calendar,
  Target,
  Activity,
  Award,
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  Save,
  X
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
// Note: pdfExport is dynamically imported inside handleExportPDF
// to keep jspdf + jspdf-autotable (~570 KB) out of the coach dashboard entry bundle.
import { FileDown, Loader2 } from "lucide-react";
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

interface AthleteProgressReportProps {
  userId: number;
  athleteName: string;
}

export function AthleteProgressReport({ userId, athleteName }: AthleteProgressReportProps) {
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split("T")[0]);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [pendingDeleteNoteId, setPendingDeleteNoteId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: progressData, isLoading, error } = trpc.drillAssignments.getAthleteProgress.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const { data: coachNotes, isLoading: notesLoading } = trpc.drillAssignments.getCoachNotes.useQuery(
    { athleteId: userId },
    { enabled: !!userId }
  );

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPDF = async () => {
    if (!progressData) {
      toast.error("No progress data to export");
      return;
    }
    setIsExportingPdf(true);
    try {
      const { exportProgressReportToPDF } = await import("@/utils/pdfExport");
      exportProgressReportToPDF(athleteName, progressData as any, coachNotes || []);
      toast.success("Progress report exported successfully");
    } catch (err) {
      toast.error("Could not export PDF", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const addNoteMutation = trpc.drillAssignments.addCoachNote.useMutation({
    onSuccess: () => {
      toast.success("Note saved successfully");
      setNewNote("");
      setShowAddNote(false);
      utils.drillAssignments.getCoachNotes.invalidate({ athleteId: userId });
    },
    onError: (error) => {
      toast.error("Failed to save note: " + error.message);
    },
  });

  const updateNoteMutation = trpc.drillAssignments.updateCoachNote.useMutation({
    onSuccess: () => {
      toast.success("Note updated successfully");
      setEditingNoteId(null);
      setEditingNoteText("");
      utils.drillAssignments.getCoachNotes.invalidate({ athleteId: userId });
    },
    onError: (error) => {
      toast.error("Failed to update note: " + error.message);
    },
  });

  const deleteNoteMutation = trpc.drillAssignments.deleteCoachNote.useMutation({
    onSuccess: () => {
      toast.success("Note deleted");
      utils.drillAssignments.getCoachNotes.invalidate({ athleteId: userId });
    },
    onError: (error) => {
      toast.error("Failed to delete note: " + error.message);
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }
    addNoteMutation.mutate({
      athleteId: userId,
      note: newNote.trim(),
      meetingDate: new Date(meetingDate),
    });
  };

  const handleUpdateNote = (noteId: number) => {
    if (!editingNoteText.trim()) {
      toast.error("Please enter a note");
      return;
    }
    updateNoteMutation.mutate({
      noteId,
      note: editingNoteText.trim(),
    });
  };

  const handleDeleteNote = (noteId: number) => {
    setPendingDeleteNoteId(noteId);
  };

  const confirmDeleteNote = () => {
    if (pendingDeleteNoteId != null) {
      deleteNoteMutation.mutate({ noteId: pendingDeleteNoteId });
    }
    setPendingDeleteNoteId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-muted animate-pulse rounded-lg" />
          <div className="h-24 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load progress data</p>
        </CardContent>
      </Card>
    );
  }

  if (!progressData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No progress data available</p>
        </CardContent>
      </Card>
    );
  }

  const { coreMetrics, activity, drillBreakdown } = progressData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{athleteName}'s Progress</h2>
          <p className="text-muted-foreground">
            Last active: {activity.lastActivityDate 
              ? new Date(activity.lastActivityDate).toLocaleDateString() 
              : "No activity yet"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleExportPDF} variant="outline" size="sm" disabled={isExportingPdf}>
            {isExportingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            {isExportingPdf ? "Generating…" : "Export PDF"}
          </Button>
          <Badge variant={coreMetrics.completionRate >= 75 ? "default" : coreMetrics.completionRate >= 50 ? "secondary" : "outline"} className="text-lg px-4 py-2">
            {coreMetrics.completionRate}% Complete
          </Badge>
        </div>
      </div>

      {/* This Week Summary */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            This Week's Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-3xl font-bold text-primary">{activity.weeklyProgress[activity.weeklyProgress.length - 1]?.completed || 0}</p>
              <p className="text-sm text-muted-foreground">Drills Completed</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">
                {(() => {
                  const thisWeekStart = new Date();
                  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
                  return activity.recentCompletions.filter(
                    (drill: any) => new Date(drill.completedAt) >= thisWeekStart
                  ).length;
                })()}
              </p>
              <p className="text-sm text-muted-foreground">Since Last Meeting</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{coreMetrics.totalAssigned}</p>
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
                <p className="text-2xl font-bold">{coreMetrics.completed}</p>
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
                <p className="text-2xl font-bold">{coreMetrics.inProgress}</p>
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
                <p className="text-2xl font-bold">{coreMetrics.assigned}</p>
                <p className="text-sm text-muted-foreground">Not Started</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Progress value={coreMetrics.completionRate} className="h-4" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{coreMetrics.completed} of {coreMetrics.totalAssigned} drills completed</span>
              <span>Avg. {coreMetrics.avgDaysToComplete} days to complete</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Weekly Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity.weeklyProgress.map((week, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{week.week}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(week.completed * 20, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8">{week.completed}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Completions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" />
              Recent Completions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.recentCompletions.length > 0 ? (
              <div className="space-y-3">
                {activity.recentCompletions.map((completion, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {completion.drillName}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {completion.completedAt 
                        ? new Date(completion.completedAt).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No completed drills yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coach Notes Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Meeting Notes
            </CardTitle>
            {!showAddNote && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAddNote(true)}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Note
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Add Note Form */}
          {showAddNote && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Meeting Date</label>
                  <Input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Notes</label>
                  <Textarea
                    placeholder="Enter observations from your meeting..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddNote}
                    disabled={addNoteMutation.isPending}
                    className="flex items-center gap-1"
                  >
                    <Save className="h-4 w-4" />
                    {addNoteMutation.isPending ? "Saving..." : "Save Note"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowAddNote(false);
                      setNewNote("");
                    }}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Notes List */}
          {notesLoading ? (
            <div className="space-y-3">
              <div className="h-20 bg-muted animate-pulse rounded-lg" />
              <div className="h-20 bg-muted animate-pulse rounded-lg" />
            </div>
          ) : coachNotes && coachNotes.length > 0 ? (
            <div className="space-y-4">
              {coachNotes.map((note) => (
                <div key={note.id} className="border rounded-lg p-4">
                  {editingNoteId === note.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleUpdateNote(note.id)}
                          disabled={updateNoteMutation.isPending}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          {updateNoteMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingNoteId(null);
                            setEditingNoteText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(note.meetingDate).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditingNoteText(note.note);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={deleteNoteMutation.isPending}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No meeting notes yet</p>
              <p className="text-sm">Click "Add Note" to record observations from your sessions</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Drill Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{coreMetrics.completed}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
              <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{coreMetrics.inProgress}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
            <div className="text-center p-4 bg-[#DC143C]/10 rounded-lg">
              <AlertCircle className="h-8 w-8 text-[#DC143C] mx-auto mb-2" />
              <p className="text-2xl font-bold">{coreMetrics.assigned}</p>
              <p className="text-sm text-muted-foreground">Not Started</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDeleteNoteId != null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteNoteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This meeting note will be removed permanently. You can’t undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
