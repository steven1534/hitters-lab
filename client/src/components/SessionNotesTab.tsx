import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users, FileText, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { SessionNotesForm } from "./SessionNotesForm";
import { SessionHistory } from "./SessionHistory";
import { ProgressReportReview } from "./ProgressReportReview";
import { InlineEdit } from "./InlineEdit";

interface SessionNotesTabProps {
  /** Pre-select an athlete by ID */
  initialAthleteId?: number;
}

export function SessionNotesTab({ initialAthleteId }: SessionNotesTabProps) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(
    initialAthleteId ?? null
  );
  const [view, setView] = useState<"list" | "form" | "edit" | "report">("list");
  const [editingNote, setEditingNote] = useState<any>(null);
  const [reportSessionNoteId, setReportSessionNoteId] = useState<number | null>(null);

  // Get all users (athletes) for the dropdown
  const { data: allUsers = [] } = trpc.admin.getAllUsers.useQuery();

  // Filter to athletes only
  const athletes = useMemo(() => {
    return allUsers
      .filter(
        (u: any) =>
          u.role === "athlete" || u.role === "user"
      )
      .map((u: any) => ({
        id: u.id,
        name: u.name || u.email || `User #${u.id}`,
      }));
  }, [allUsers]);

  const selectedAthlete = athletes.find(
    (a: any) => a.id === selectedAthleteId
  );

  // Fetch athlete profile for parent email when generating reports
  // MUST be before any early returns to avoid conditional hook calls (React error #310)
  const { data: athleteProfile } = trpc.athleteProfiles.get.useQuery(
    { userId: selectedAthleteId! },
    { enabled: !!selectedAthleteId && view === "report" }
  );

  const handleNewNote = () => {
    setEditingNote(null);
    setView("form");
  };

  const handleEditNote = (note: any) => {
    setEditingNote({
      id: note.id,
      sessionDate: note.sessionDate,
      sessionNumber: note.sessionNumber,
      sessionLabel: note.sessionLabel,
      duration: note.duration,
      skillsWorked: note.skillsWorked as string[],
      whatImproved: note.whatImproved,
      whatNeedsWork: note.whatNeedsWork,
      homeworkDrills: note.homeworkDrills as Array<{
        drillId: string;
        drillName: string;
      }>,
      overallRating: note.overallRating,
      privateNotes: note.privateNotes,
    });
    setView("edit");
  };

  const handleFormComplete = () => {
    setView("list");
    setEditingNote(null);
  };

  const handleGenerateReport = (noteId: number) => {
    setReportSessionNoteId(noteId);
    setView("report");
  };

  // If no athlete selected, show athlete picker
  if (!selectedAthleteId) {
    return (
      <div className="space-y-6">
        <div>
          <InlineEdit contentKey="coach.sessionNotes.title" defaultValue="Session Notes" as="h2" className="font-heading font-bold text-xl md:text-2xl mb-2" />
          <p className="text-muted-foreground text-sm">
            Select an athlete to log session notes and track progress.
          </p>
        </div>

        <div className="max-w-md">
          <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">
            Select Athlete
          </label>
          <Select
            value=""
            onValueChange={(val) => setSelectedAthleteId(parseInt(val))}
          >
            <SelectTrigger className="bg-white/[0.04] border-white/[0.08] h-12">
              <SelectValue placeholder="Choose an athlete..." />
            </SelectTrigger>
            <SelectContent>
              {athletes.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No athletes found. Invite athletes first.
                </div>
              ) : (
                athletes.map((a: any) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Athletes with existing sessions */}
        <AthleteSessionOverview onSelectAthlete={setSelectedAthleteId} />
      </div>
    );
  }

  // Report view — full screen within the tab
  if (view === "report" && reportSessionNoteId && selectedAthleteId) {
    return (
      <ProgressReportReview
        sessionNoteId={reportSessionNoteId}
        athleteId={selectedAthleteId}
        athleteName={selectedAthlete?.name ?? "Athlete"}
        parentEmail={athleteProfile?.parentEmail ?? undefined}
        parentName={athleteProfile?.parentName ?? undefined}
        onBack={() => {
          setView("list");
          setReportSessionNoteId(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Athlete selector bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedAthleteId(null);
            setView("list");
          }}
          className="h-8 px-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          All Athletes
        </Button>

        <Select
          value={String(selectedAthleteId)}
          onValueChange={(val) => {
            setSelectedAthleteId(parseInt(val));
            setView("list");
          }}
        >
          <SelectTrigger className="bg-white/[0.04] border-white/[0.08] w-48 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {athletes.map((a: any) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {view === "list" && (
          <Button
            size="sm"
            onClick={handleNewNote}
            className="bg-[#DC143C] hover:bg-[#DC143C]/90 ml-auto"
          >
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline"><InlineEdit contentKey="coach.sessionNotes.newBtn" defaultValue="New Session Note" as="span" /></span>
            <span className="sm:hidden">Add</span>
          </Button>
        )}
      </div>

      {/* Content */}
      {view === "form" || view === "edit" ? (
        <SessionNotesForm
          athleteId={selectedAthleteId}
          athleteName={selectedAthlete?.name ?? "Athlete"}
          onComplete={handleFormComplete}
          onCancel={() => {
            setView("list");
            setEditingNote(null);
          }}
          editingNote={view === "edit" ? editingNote : undefined}
        />
      ) : (
        <SessionHistory
          athleteId={selectedAthleteId}
          athleteName={selectedAthlete?.name ?? "Athlete"}
          onNewNote={handleNewNote}
          onEditNote={handleEditNote}
          onGenerateReport={handleGenerateReport}
        />
      )}
    </div>
  );
}

/** Overview of athletes who have session notes */
function AthleteSessionOverview({
  onSelectAthlete,
}: {
  onSelectAthlete: (id: number) => void;
}) {
  const { data: athletesWithSessions = [], isLoading } =
    trpc.sessionNotes.getAthletesWithSessions.useQuery();

  if (isLoading || athletesWithSessions.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Athletes with Sessions
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {athletesWithSessions.map((a: any) => (
          <button
            key={a.athleteId}
            onClick={() => onSelectAthlete(a.athleteId)}
            className="glass-card rounded-xl p-4 text-left hover:bg-white/[0.04] transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#DC143C]/20 to-[#DC143C]/20 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-[#DC143C]" />
              </div>
              <div className="min-w-0">
                <p className="font-heading font-bold text-sm truncate group-hover:text-[#DC143C] transition-colors">
                  {a.athleteName ?? "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.totalSessions} session{a.totalSessions !== 1 ? "s" : ""}
                  {a.lastSessionDate && (
                    <span className="ml-1">
                      · Last:{" "}
                      {new Date(a.lastSessionDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
