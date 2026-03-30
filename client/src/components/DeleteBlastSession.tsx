import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

interface DeleteBlastSessionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionDate: string;
  sessionType: string;
  playerName: string;
}

export function DeleteBlastSession({
  open,
  onOpenChange,
  sessionId,
  sessionDate,
  sessionType,
  playerName,
}: DeleteBlastSessionProps) {
  const [deleting, setDeleting] = useState(false);

  const utils = trpc.useUtils();

  const deleteSessionMutation = trpc.blastMetrics.deleteSession.useMutation({
    onSuccess: () => {
      toast.success("Session deleted", {
        description: `${sessionType} session from ${sessionDate} has been removed.`,
      });
      utils.blastMetrics.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to delete session", { description: error.message });
    },
    onSettled: () => setDeleting(false),
  });

  function handleDelete() {
    setDeleting(true);
    deleteSessionMutation.mutate({ sessionId });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1a1a1a] border-border text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Delete Session
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-foreground text-sm">
              Are you sure you want to delete the <span className="font-semibold text-foreground">{sessionType}</span> session
              from <span className="font-semibold text-foreground">{sessionDate}</span> for{" "}
              <span className="font-semibold text-foreground">{playerName}</span>?
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              All metrics data for this session will be permanently removed.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/60"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
