import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Edit2, X, Check } from "lucide-react";

interface DrillNotesProps {
  athleteNotes?: string;
  coachFeedback?: string;
  onSaveAthleteNotes?: (notes: string) => void;
  onSaveCoachFeedback?: (feedback: string) => void;
  isCoach?: boolean;
  isCompleted?: boolean;
}

export function DrillNotes({
  athleteNotes = "",
  coachFeedback = "",
  onSaveAthleteNotes,
  onSaveCoachFeedback,
  isCoach = false,
  isCompleted = false,
}: DrillNotesProps) {
  const [editingAthleteNotes, setEditingAthleteNotes] = useState(false);
  const [editingCoachFeedback, setEditingCoachFeedback] = useState(false);
  const [tempAthleteNotes, setTempAthleteNotes] = useState(athleteNotes);
  const [tempCoachFeedback, setTempCoachFeedback] = useState(coachFeedback);

  const handleSaveAthleteNotes = () => {
    onSaveAthleteNotes?.(tempAthleteNotes);
    setEditingAthleteNotes(false);
  };

  const handleSaveCoachFeedback = () => {
    onSaveCoachFeedback?.(tempCoachFeedback);
    setEditingCoachFeedback(false);
  };

  return (
    <div className="space-y-4">
      {/* Athlete Notes Section */}
      {!isCoach && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Your Notes
              </CardTitle>
              {isCompleted && !editingAthleteNotes && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingAthleteNotes(true)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingAthleteNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={tempAthleteNotes}
                  onChange={(e) => setTempAthleteNotes(e.target.value)}
                  placeholder="How did this drill go? What did you learn?"
                  className="min-h-24"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveAthleteNotes}>
                    <Check className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingAthleteNotes(false);
                      setTempAthleteNotes(athleteNotes);
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : athleteNotes ? (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{athleteNotes}</p>
              </div>
            ) : isCompleted ? (
              <p className="text-sm text-muted-foreground italic">
                No notes yet. Click edit to add your thoughts about this drill.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Complete this drill to add your notes.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Coach Feedback Section */}
      {isCoach && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Coach Feedback
              </CardTitle>
              {!editingCoachFeedback && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCoachFeedback(true)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingCoachFeedback ? (
              <div className="space-y-2">
                <Textarea
                  value={tempCoachFeedback}
                  onChange={(e) => setTempCoachFeedback(e.target.value)}
                  placeholder="Provide feedback to the athlete about this drill..."
                  className="min-h-24"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveCoachFeedback}>
                    <Check className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingCoachFeedback(false);
                      setTempCoachFeedback(coachFeedback);
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : coachFeedback ? (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 rounded-lg">
                <p className="text-sm whitespace-pre-wrap text-red-900 dark:text-red-100">{coachFeedback}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No feedback yet. Click edit to add feedback for the athlete.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show both sections if athlete completed drill and coach is viewing */}
      {isCoach && athleteNotes && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-green-900 dark:text-green-100">
              <MessageSquare className="h-4 w-4" />
              Athlete Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-green-900 dark:text-green-100">{athleteNotes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
