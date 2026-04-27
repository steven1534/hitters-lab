import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Target, GitBranch, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { PATHWAYS } from "@/pages/Pathways";

interface AthletePlanEditorProps {
  userId: number;
  athleteName: string;
}

const NO_PATHWAY = "__none__";

/**
 * Coach-only inline editor for an athlete's plan context: this week's focus
 * directive and which pathway they're currently on. Surfaces at the top of
 * the athlete's My Plan landing page.
 */
export function AthletePlanEditor({ userId, athleteName }: AthletePlanEditorProps) {
  const utils = trpc.useUtils();
  const { data: profile, isLoading } = trpc.athleteProfiles.get.useQuery({ userId });

  const [weeklyFocus, setWeeklyFocus] = useState("");
  const [activePathwayId, setActivePathwayId] = useState<string>(NO_PATHWAY);

  // Hydrate local form state when the profile loads / changes.
  useEffect(() => {
    if (!profile) return;
    setWeeklyFocus(profile.weeklyFocus ?? "");
    setActivePathwayId(profile.activePathwayId ?? NO_PATHWAY);
  }, [profile]);

  const updateProfile = trpc.athleteProfiles.update.useMutation({
    onSuccess: () => {
      utils.athleteProfiles.get.invalidate({ userId });
      utils.athleteProfiles.getMyProfile.invalidate();
      toast.success(`Plan updated for ${athleteName}`);
    },
    onError: (err) => toast.error("Could not save plan", { description: err.message }),
  });

  const handleSave = () => {
    updateProfile.mutate({
      userId,
      weeklyFocus: weeklyFocus.trim() ? weeklyFocus.trim() : null,
      activePathwayId: activePathwayId === NO_PATHWAY ? null : activePathwayId,
    });
  };

  const isDirty =
    (profile?.weeklyFocus ?? "") !== weeklyFocus ||
    (profile?.activePathwayId ?? NO_PATHWAY) !== activePathwayId;

  const focusUpdatedLabel = profile?.weeklyFocusUpdatedAt
    ? `Updated ${new Date(profile.weeklyFocusUpdatedAt).toLocaleDateString()}`
    : null;

  return (
    <div className="bg-muted/40 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-electric" />
        <h4 className="font-semibold text-sm">Coach&apos;s Plan for {athleteName}</h4>
      </div>

      {/* Weekly focus */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            This Week&apos;s Focus
          </label>
          {focusUpdatedLabel && (
            <span className="text-[10px] text-muted-foreground">{focusUpdatedLabel}</span>
          )}
        </div>
        <Textarea
          value={weeklyFocus}
          onChange={(e) => setWeeklyFocus(e.target.value)}
          placeholder="e.g. Stay centered on the back leg. No drifting forward in the load."
          className="text-sm min-h-[64px] resize-y"
          maxLength={500}
          disabled={isLoading || updateProfile.isPending}
        />
        <p className="text-[10px] text-muted-foreground text-right">{weeklyFocus.length}/500</p>
      </div>

      {/* Active pathway */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <GitBranch className="h-3 w-3" />
          Active Pathway
        </label>
        <Select
          value={activePathwayId}
          onValueChange={setActivePathwayId}
          disabled={isLoading || updateProfile.isPending}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="No pathway assigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PATHWAY}>No pathway assigned</SelectItem>
            {PATHWAYS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || updateProfile.isPending || isLoading}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          {updateProfile.isPending ? "Saving..." : "Save Plan"}
        </Button>
      </div>
    </div>
  );
}
