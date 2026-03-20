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
import { FileText, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface RetroactiveBlastNotesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  playerName: string;
}

export function RetroactiveBlastNotes({ open, onOpenChange, playerId, playerName }: RetroactiveBlastNotesProps) {
  const [result, setResult] = useState<{
    notesCreated: number;
    errors: string[];
    totalUnlinked: number;
    alreadyLinked: number;
  } | null>(null);
  const [processing, setProcessing] = useState(false);

  const utils = trpc.useUtils();

  const retroactiveMutation = trpc.blastMetrics.createRetroactiveNotes.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setProcessing(false);
      utils.blastMetrics.invalidate();
      utils.sessionNotes.invalidate();
      if (data.notesCreated > 0) {
        toast.success(`Created ${data.notesCreated} session note${data.notesCreated !== 1 ? "s" : ""}`, {
          description: `For ${playerName}'s existing Blast sessions`,
        });
      } else if (data.totalUnlinked === 0) {
        toast.info("All sessions already have linked notes", {
          description: "No new notes needed",
        });
      }
    },
    onError: (error) => {
      toast.error("Failed to create retroactive notes", { description: error.message });
      setProcessing(false);
    },
  });

  function handleCreate() {
    setProcessing(true);
    setResult(null);
    retroactiveMutation.mutate({ playerId });
  }

  function handleClose() {
    setResult(null);
    setProcessing(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[#1a1a1a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#E8425A]" />
            Create Retroactive Notes
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Create session notes for <span className="text-white/80 font-medium">{playerName}</span>'s existing Blast sessions that don't have linked notes yet.
          </DialogDescription>
        </DialogHeader>

        {!result && !processing && (
          <div className="py-4 space-y-4">
            <div className="bg-[#DC143C]/5 border border-[#DC143C]/15 rounded-lg p-4 text-sm text-white/60">
              <p>This will scan all of {playerName}'s Blast sessions and create a Session Note for each one that doesn't already have one.</p>
              <p className="mt-2 text-white/40">Each note will include the Blast metrics summary and be visible in the Session Notes timeline.</p>
            </div>
          </div>
        )}

        {processing && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="h-8 w-8 text-[#E8425A] animate-spin mx-auto" />
            <p className="text-white/50">Creating session notes...</p>
          </div>
        )}

        {result && (
          <div className="py-4 space-y-4">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">Complete</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{result.notesCreated}</p>
                <p className="text-xs text-white/50">Notes Created</p>
              </div>
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white/40">{result.alreadyLinked}</p>
                <p className="text-xs text-white/50">Already Linked</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3 max-h-24 overflow-y-auto">
                <p className="text-xs text-red-400 font-medium mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}
                </p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-400/70">{err}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {!result && !processing && (
            <>
              <Button
                variant="ghost"
                onClick={handleClose}
                className="text-white/60 hover:text-white hover:bg-white/[0.06]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                className="bg-[#DC143C] hover:bg-[#B91030] text-white"
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Notes
              </Button>
            </>
          )}
          {result && (
            <Button
              onClick={handleClose}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
