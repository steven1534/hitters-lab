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
      <DialogContent className="sm:max-w-md bg-[#1a1a1a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Delete Session
          </DialogTitle>
          <DialogDescription className="text-white/50">
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-white/80 text-sm">
              Are you sure you want to delete the <span className="font-semibold text-white">{sessionType}</span> session
              from <span className="font-semibold text-white">{sessionDate}</span> for{" "}
              <span className="font-semibold text-white">{playerName}</span>?
            </p>
            <p className="text-white/50 text-xs mt-2">
              All metrics data for this session will be permanently removed.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/60 hover:text-white hover:bg-white/[0.06]"
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
