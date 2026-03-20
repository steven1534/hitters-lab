import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, MessageSquare, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Submission {
  id: number;
  userId: number;
  drillId: string;
  notes: string | null;
  videoUrl: string | null;
  submittedAt: Date;
}

interface CoachFeedbackPanelProps {
  submission: Submission;
  athleteName: string;
  onFeedbackSent?: () => void;
}

export function CoachFeedbackPanel({ submission, athleteName, onFeedbackSent }: CoachFeedbackPanelProps) {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createFeedbackMutation = trpc.submissions.coachFeedback.createFeedback.useMutation();
  const { data: existingFeedback = [] } = trpc.submissions.coachFeedback.getFeedbackBySubmission.useQuery(
    { submissionId: submission.id }
  );

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!feedback.trim()) {
      setError("Please enter feedback");
      return;
    }

    setIsSubmitting(true);

    try {
      await createFeedbackMutation.mutateAsync({
        submissionId: submission.id,
        userId: submission.userId,
        drillId: submission.drillId,
        feedback: feedback.trim(),
      });

      setFeedback("");
      onFeedbackSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="text-lg">Athlete Submission</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">{athleteName}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Submission Details */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Submitted</p>
            <p className="text-sm">{new Date(submission.submittedAt).toLocaleString()}</p>
          </div>

          {submission.notes && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Athlete Notes</p>
              <p className="text-sm whitespace-pre-wrap">{submission.notes}</p>
            </div>
          )}

          {submission.videoUrl && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Video Submission</p>
              <video
                src={submission.videoUrl}
                controls
                className="w-full rounded-lg bg-black max-h-48 mt-2"
              />
            </div>
          )}
        </div>

        {/* Existing Feedback */}
        {existingFeedback.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Your Feedback
            </h4>
            <div className="space-y-2">
              {existingFeedback.map((fb: any) => (
                <div key={fb.id} className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-900 dark:text-red-100">{fb.feedback}</p>
                  <p className="text-xs text-red-700 dark:text-[#E8425A] mt-1">
                    {new Date(fb.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Form */}
        <form onSubmit={handleSubmitFeedback} className="border-t pt-4 space-y-3">
          {error && (
            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Provide constructive feedback on the athlete's performance..."
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            rows={3}
          />

          <Button
            type="submit"
            disabled={isSubmitting || !feedback.trim()}
            className="w-full gap-2"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Sending..." : "Send Feedback"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
