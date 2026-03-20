import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useNotification } from "@/contexts/NotificationContext";

interface DrillQAFormProps {
  drillId: string;
  drillName: string;
}

export function DrillQAForm({ drillId, drillName }: DrillQAFormProps) {
  const [question, setQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { addToast } = useNotification();

  const createQuestionMutation = trpc.qa.createQuestion.useMutation({
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Message Sent',
        message: 'Your question has been sent to Coach Steve',
      });
      setQuestion("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to send question',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Please enter a question',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createQuestionMutation.mutateAsync({
        drillId,
        question: question.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-green-800 font-medium">Message sent successfully!</p>
          <p className="text-green-700 text-sm mt-1">Coach Steve will respond soon</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Ask Coach Steve
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Have questions about this drill? Ask Coach Steve for personalized guidance.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Your Question</label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Ask about ${drillName}... (e.g., "Is this drill good for my skill level?" or "What equipment do I need?")`}
              rows={4}
              disabled={isSubmitting}
              className="resize-none"
            />
          </div>
          <Button
            type="submit"
            disabled={!question.trim() || isSubmitting}
            className="w-full"
            size="lg"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Sending..." : "Send Question"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
