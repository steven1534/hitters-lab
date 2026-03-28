import { useState, useEffect } from "react";
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
import { Pencil, Loader2, Zap, Target, Crosshair, Gauge } from "lucide-react";

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

const METRIC_FIELDS = [
  { key: "batSpeedMph", label: "Bat Speed", unit: "mph", placeholder: "65.0", icon: Zap, color: "text-[#E8425A]" },
  { key: "onPlaneEfficiencyPercent", label: "On-Plane Efficiency", unit: "%", placeholder: "85.0", icon: Target, color: "text-teal-400" },
  { key: "attackAngleDeg", label: "Attack Angle", unit: "deg", placeholder: "10.5", icon: Crosshair, color: "text-lime-400" },
  { key: "exitVelocityMph", label: "Exit Velocity", unit: "mph", placeholder: "80.0", icon: Gauge, color: "text-violet-400" },
] as const;

type MetricKey = typeof METRIC_FIELDS[number]["key"];

export interface SessionData {
  id: string;
  sessionDate: Date | string | null;
  sessionType: string | null;
  batSpeedMph: string | null;
  onPlaneEfficiencyPercent: string | null;
  attackAngleDeg: string | null;
  exitVelocityMph: string | null;
}

interface EditBlastSessionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionData | null;
  playerName: string;
}

export function EditBlastSession({ open, onOpenChange, session, playerName }: EditBlastSessionProps) {
  const [sessionDate, setSessionDate] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const utils = trpc.useUtils();

  // Populate form when session data changes
  useEffect(() => {
    if (session && open) {
      // Parse date
      const date = session.sessionDate
        ? new Date(session.sessionDate).toISOString().split("T")[0]
        : "";
      setSessionDate(date);
      setSessionType(session.sessionType || "");

      // Populate metrics
      const m: Record<string, string> = {};
      for (const field of METRIC_FIELDS) {
        const val = session[field.key as keyof SessionData];
        if (val != null && val !== "") {
          m[field.key] = String(val);
        }
      }
      setMetrics(m);
    }
  }, [session, open]);

  const updateMutation = trpc.blastMetrics.updateSession.useMutation({
    onSuccess: () => {
      toast.success("Session updated successfully!", {
        description: `${sessionType} session for ${playerName}`,
      });
      utils.blastMetrics.invalidate();
      utils.sessionNotes.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to update session", { description: error.message });
    },
    onSettled: () => setSaving(false),
  });

  function handleMetricChange(key: string, value: string) {
    setMetrics((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (!session) return;
    if (!sessionDate) {
      toast.error("Please select a session date");
      return;
    }
    if (!sessionType) {
      toast.error("Please select a session type");
      return;
    }

    setSaving(true);

    // Build metrics payload
    const metricsPayload: Record<string, any> = {};
    for (const field of METRIC_FIELDS) {
      const val = metrics[field.key]?.trim();
      if (!val) {
        metricsPayload[field.key] = null;
        continue;
      }
      metricsPayload[field.key] = val;
    }

    updateMutation.mutate({
      sessionId: session.id,
      sessionDate,
      sessionType,
      metrics: metricsPayload,
    });
  }

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-border text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Pencil className="h-5 w-5 text-amber-400" />
            Edit Blast Session
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update session data for <span className="text-foreground font-medium">{playerName}</span>
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
            Clear a field to remove that metric. Changes will also update any linked session note.
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
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
