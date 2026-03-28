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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Zap, Target, Crosshair, Gauge, FileText, Link2 } from "lucide-react";

const SESSION_TYPES = [
  "Tee",
  "Soft Toss",
  "Front Toss",
  "Live BP",
  "Machine BP",
  "Game At-Bat",
  "Live Pitching",
  "Overload/Underload",
  "General",
];

// Metric field definitions with labels, units, and placeholder values
const METRIC_FIELDS = [
  { key: "batSpeedMph", label: "Bat Speed", unit: "mph", placeholder: "65.0", icon: Zap, color: "text-[#E8425A]" },
  { key: "onPlaneEfficiencyPercent", label: "On-Plane Efficiency", unit: "%", placeholder: "85.0", icon: Target, color: "text-teal-400" },
  { key: "attackAngleDeg", label: "Attack Angle", unit: "deg", placeholder: "10.5", icon: Crosshair, color: "text-lime-400" },
  { key: "exitVelocityMph", label: "Exit Velocity", unit: "mph", placeholder: "80.0", icon: Gauge, color: "text-violet-400" },
] as const;

type MetricKey = typeof METRIC_FIELDS[number]["key"];

interface AddBlastSessionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  playerName: string;
  /** Whether this player is linked to a portal user (enables session note toggle) */
  isLinkedToUser?: boolean;
}

export function AddBlastSession({ open, onOpenChange, playerId, playerName, isLinkedToUser }: AddBlastSessionProps) {
  const [sessionDate, setSessionDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [sessionType, setSessionType] = useState("");
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [createNote, setCreateNote] = useState(true); // default on when linked

  const utils = trpc.useUtils();

  const addSessionMutation = trpc.blastMetrics.addSession.useMutation({
    onSuccess: (data) => {
      const noteMsg = data.linkedSessionNoteId
        ? " + Session Note created"
        : "";
      toast.success(`Session added successfully!${noteMsg}`, {
        description: `${sessionType} session for ${playerName} on ${new Date(sessionDate).toLocaleDateString()}`,
      });
      // Invalidate both blast metrics and session notes queries
      utils.blastMetrics.invalidate();
      utils.sessionNotes.invalidate();
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to add session", { description: error.message });
    },
    onSettled: () => setSaving(false),
  });

  function resetForm() {
    setSessionDate(new Date().toISOString().split("T")[0]);
    setSessionType("");
    setMetrics({});
    setCreateNote(true);
  }

  function handleMetricChange(key: string, value: string) {
    setMetrics((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (!sessionDate) {
      toast.error("Please select a session date");
      return;
    }
    if (!sessionType) {
      toast.error("Please select a session type");
      return;
    }

    setSaving(true);

    // Build metrics object — scores are numbers, everything else is string
    const metricsPayload: Record<string, any> = {};
    for (const field of METRIC_FIELDS) {
      const val = metrics[field.key]?.trim();
      if (!val) continue;
      metricsPayload[field.key] = val;
    }

    addSessionMutation.mutate({
      playerId,
      sessionDate,
      sessionType,
      createSessionNote: isLinkedToUser ? createNote : false,
      metrics: metricsPayload,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-border text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Plus className="h-5 w-5 text-violet-400" />
            Add Blast Session
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter session data for <span className="text-foreground font-medium">{playerName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Session Info Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground/80 text-sm">Session Date *</Label>
              <Input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="bg-muted/60 border-border text-foreground [color-scheme:dark]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground/80 text-sm">Session Type *</Label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger className="bg-muted/60 border-border text-foreground">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Auto-create Session Note toggle */}
          {isLinkedToUser && (
            <button
              type="button"
              onClick={() => setCreateNote(!createNote)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left ${
                createNote
                  ? "bg-[#DC143C]/10 border-[#DC143C]/30 text-white"
                  : "bg-white/[0.02] border-border text-muted-foreground"
              }`}
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                createNote ? "bg-[#DC143C]/20" : "bg-muted/60"
              }`}>
                <Link2 className={`h-4 w-4 ${createNote ? "text-[#DC143C]" : "text-muted-foreground/60"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {createNote ? "Session Note will be auto-created" : "No Session Note will be created"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {createNote
                    ? "A linked session note with Blast metrics summary will appear in Session Notes"
                    : "Click to enable — links this Blast session to the Session Notes timeline"}
                </p>
              </div>
              <div className={`h-5 w-9 rounded-full transition-colors shrink-0 relative ${
                createNote ? "bg-[#DC143C]" : "bg-white/20"
              }`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  createNote ? "translate-x-4" : "translate-x-0.5"
                }`} />
              </div>
            </button>
          )}

          {!isLinkedToUser && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300/80 text-xs">
              <FileText className="h-4 w-4 shrink-0" />
              <span>
                This player is not linked to a portal account. Link them first to auto-create session notes.
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-muted" />
            <span className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">Swing Metrics</span>
            <div className="h-px flex-1 bg-muted" />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {METRIC_FIELDS.map((field) => {
              const Icon = field.icon;
              return (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs flex items-center gap-1.5">
                    <Icon className={`h-3 w-3 ${field.color}`} />
                    {field.label}
                    {field.unit && <span className="text-muted-foreground/60">({field.unit})</span>}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={field.placeholder}
                    value={metrics[field.key] || ""}
                    onChange={(e) => handleMetricChange(field.key, e.target.value)}
                    className="bg-muted/60 border-border text-foreground h-8 text-sm"
                  />
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground/60 italic">
            All metric fields are optional. Enter only the values you have from the Blast report.
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
            onClick={handleSubmit}
            disabled={saving || !sessionDate || !sessionType}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
