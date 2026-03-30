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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2, Link2 } from "lucide-react";

interface AddBlastPlayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBlastPlayer({ open, onOpenChange }: AddBlastPlayerProps) {
  const [fullName, setFullName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
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

  const addPlayerMutation = trpc.blastMetrics.addPlayer.useMutation({
    onSuccess: (data) => {
      toast.success("Player added!", {
        description: `${data.fullName} has been added to Blast Motion tracking.${selectedUserId ? " Linked to portal account." : ""}`,
      });
      utils.blastMetrics.invalidate();
      setFullName("");
      setSelectedUserId("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to add player", { description: error.message });
    },
    onSettled: () => setSaving(false),
  });

  function handleSubmit() {
    const trimmed = fullName.trim();
    if (!trimmed) {
      toast.error("Please enter the player's full name");
      return;
    }
    setSaving(true);
    addPlayerMutation.mutate({
      fullName: trimmed,
      userId: selectedUserId ? parseInt(selectedUserId) : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-violet-400" />
            Add Blast Player
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add a new player to track their Blast Motion swing metrics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-foreground/80 text-sm">Player Full Name *</Label>
            <Input
              placeholder="e.g., Sean Jaeger"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && fullName.trim()) handleSubmit();
              }}
              className="bg-muted/60 border-border text-foreground"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground/80 text-sm flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-[#DC143C]" />
              Link to Portal Account
              <span className="text-muted-foreground/60 font-normal">(optional)</span>
            </Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="bg-muted/60 border-border text-foreground">
                <SelectValue placeholder="No portal link" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No portal link</SelectItem>
                {portalUsers.map((u: any) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name}{u.email ? ` (${u.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground/60 italic">
              Linking to a portal account enables auto-creating session notes when adding Blast sessions.
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
            onClick={handleSubmit}
            disabled={saving || !fullName.trim()}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Player
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
