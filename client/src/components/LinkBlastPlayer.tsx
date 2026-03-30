import { useState, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, Unlink, Loader2, User } from "lucide-react";

interface LinkBlastPlayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  playerName: string;
  currentUserId: number | null;
  currentPortalName: string | null;
  currentPortalEmail: string | null;
}

export function LinkBlastPlayer({
  open,
  onOpenChange,
  playerId,
  playerName,
  currentUserId,
  currentPortalName,
  currentPortalEmail,
}: LinkBlastPlayerProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(
    currentUserId ? String(currentUserId) : ""
  );
  const [saving, setSaving] = useState(false);

  const utils = trpc.useUtils();

  // Get all portal users for linking
  const { data: allUsers = [] } = trpc.admin.getAllUsers.useQuery();
  const portalUsers = useMemo(() => {
    return allUsers
      .filter((u: any) => u.role === "athlete" || u.role === "user")
      .map((u: any) => ({
        id: u.id,
        name: u.name || u.email || `User #${u.id}`,
        email: u.email,
      }));
  }, [allUsers]);

  const linkMutation = trpc.blastMetrics.linkPlayer.useMutation({
    onSuccess: () => {
      toast.success("Player linked!", {
        description: `${playerName} is now linked to a portal account. Future Blast sessions will auto-create session notes.`,
      });
      utils.blastMetrics.invalidate();
      utils.sessionNotes.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to link player", { description: error.message });
    },
    onSettled: () => setSaving(false),
  });

  const unlinkMutation = trpc.blastMetrics.unlinkPlayer.useMutation({
    onSuccess: () => {
      toast.success("Player unlinked", {
        description: `${playerName} is no longer linked to a portal account.`,
      });
      utils.blastMetrics.invalidate();
      setSelectedUserId("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to unlink player", { description: error.message });
    },
    onSettled: () => setSaving(false),
  });

  function handleLink() {
    if (!selectedUserId || selectedUserId === "none") {
      toast.error("Please select a portal user to link");
      return;
    }
    setSaving(true);
    linkMutation.mutate({ playerId, userId: parseInt(selectedUserId) });
  }

  function handleUnlink() {
    setSaving(true);
    unlinkMutation.mutate({ playerId });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1a1a1a] border-border text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[#DC143C]" />
            Link Player Account
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Link <span className="text-foreground font-medium">{playerName}</span> to a portal user account to enable session note integration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current link status */}
          {currentUserId && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-green-300">Currently linked</p>
                <p className="text-xs text-muted-foreground">
                  {currentPortalName || "Unknown"}{currentPortalEmail ? ` (${currentPortalEmail})` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUnlink}
                disabled={saving}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-foreground/80 text-sm font-medium block">
              {currentUserId ? "Change linked account" : "Select portal user"}
            </label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="bg-muted/60 border-border text-foreground">
                <SelectValue placeholder="Select a portal user..." />
              </SelectTrigger>
              <SelectContent>
                {portalUsers.map((u: any) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name}{u.email ? ` (${u.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground/60 italic">
            When linked, adding a Blast session will automatically create a session note for this athlete.
          </p>
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
            onClick={handleLink}
            disabled={saving || !selectedUserId || selectedUserId === "none"}
            className="bg-[#DC143C] hover:bg-[#DC143C]/90 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Link Account
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
