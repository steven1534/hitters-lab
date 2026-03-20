import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface CompletionModalProps {
  isOpen: boolean;
  drillName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function CompletionModal({ isOpen, drillName, onClose, onConfirm }: CompletionModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Trigger confetti animation
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">🎉 Great Job!</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-8 text-center">
          {/* Animated checkmark */}
          <div className={`mb-6 transition-all duration-500 ${showConfetti ? "scale-100 animate-bounce" : "scale-0"}`}>
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>

          {/* Celebration message */}
          <h2 className="text-2xl font-bold mb-2">Drill Completed!</h2>
          <p className="text-lg text-muted-foreground mb-4">
            You've successfully completed <span className="font-semibold text-foreground">{drillName}</span>
          </p>

          {/* Motivational message */}
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 w-full">
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-[#DC143C] dark:text-[#E8425A] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-900 dark:text-red-100">
                Keep up the great work! You're building excellent baseball skills. 💪
              </p>
            </div>
          </div>

          {/* Completion date */}
          <p className="text-xs text-muted-foreground mb-6">
            Completed on {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>

          {/* Action buttons */}
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Continue Later
            </Button>
            <Button onClick={onConfirm} className="flex-1">
              Next Drill
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
