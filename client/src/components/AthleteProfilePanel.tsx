import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Target,
  Save,
  X,
  Pencil,
  Loader2,
  Shield,
  Users,
  Dumbbell,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

/** Baseball positions */
const POSITIONS = [
  "P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF",
  "RHP", "LHP", "DH", "IF", "OF", "UTL",
];

/** Focus area options (matching session note skill categories) */
const FOCUS_AREAS = [
  "Swing Mechanics",
  "Pitch Recognition",
  "Plate Approach",
  "Bat Speed Development",
  "Exit Velocity",
  "Timing & Rhythm",
  "Game IQ / Situational Awareness",
  "Confidence / Mindset",
  "Contact Quality",
];

interface AthleteProfilePanelProps {
  userId: number;
  onClose?: () => void;
  /** Compact mode for inline display */
  compact?: boolean;
}

export function AthleteProfilePanel({ userId, onClose, compact }: AthleteProfilePanelProps) {
  const utils = trpc.useUtils();
  const { data: profile, isLoading } = trpc.athleteProfiles.get.useQuery({ userId });
  const updateMutation = trpc.athleteProfiles.update.useMutation({
    onSuccess: () => {
      toast.success("Profile saved");
      utils.athleteProfiles.get.invalidate({ userId });
      setIsEditing(false);
    },
    onError: (err) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [birthDate, setBirthDate] = useState("");
  const [position, setPosition] = useState("");
  const [secondaryPosition, setSecondaryPosition] = useState("");
  const [bats, setBats] = useState<"L" | "R" | "S" | "">("");
  const [throws_, setThrows] = useState<"L" | "R" | "">("");
  const [teamName, setTeamName] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [coachNotes, setCoachNotes] = useState("");

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setBirthDate(profile.birthDate ? new Date(profile.birthDate).toISOString().split("T")[0] : "");
      setPosition(profile.position ?? "");
      setSecondaryPosition(profile.secondaryPosition ?? "");
      setBats((profile.bats as "L" | "R" | "S") ?? "");
      setThrows((profile.throws as "L" | "R") ?? "");
      setTeamName(profile.teamName ?? "");
      setFocusAreas((profile.focusAreas as string[]) ?? []);
      setParentName(profile.parentName ?? "");
      setParentEmail(profile.parentEmail ?? "");
      setParentPhone(profile.parentPhone ?? "");
      setCoachNotes(profile.coachProfileNotes ?? "");
    }
  }, [profile]);

  const handleSave = () => {
    updateMutation.mutate({
      userId,
      birthDate: birthDate || null,
      position: position || null,
      secondaryPosition: secondaryPosition || null,
      bats: (bats as "L" | "R" | "S") || null,
      throws: (throws_ as "L" | "R") || null,
      teamName: teamName || null,
      focusAreas,
      parentName: parentName || null,
      parentEmail: parentEmail || null,
      parentPhone: parentPhone || null,
      coachProfileNotes: coachNotes || null,
    });
  };

  const toggleFocusArea = (area: string) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const age = useMemo(() => {
    if (!birthDate) return null;
    const bd = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - bd.getFullYear();
    const monthDiff = today.getMonth() - bd.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bd.getDate())) {
      age--;
    }
    return age;
  }, [birthDate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // View mode (read-only)
  if (!isEditing) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h3 className="font-heading font-bold text-lg">
                {profile?.userName ?? "Player Profile"}
              </h3>
              {profile?.userEmail && (
                <p className="text-xs text-muted-foreground">{profile.userEmail}</p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>

        {/* Player Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InfoCard
            icon={<Calendar className="h-4 w-4" />}
            label="Age"
            value={age ? `${age} years old` : "Not set"}
            subvalue={birthDate ? new Date(birthDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined}
          />
          <InfoCard
            icon={<MapPin className="h-4 w-4" />}
            label="Position"
            value={position || "Not set"}
            subvalue={secondaryPosition ? `2nd: ${secondaryPosition}` : undefined}
          />
          <InfoCard
            icon={<Dumbbell className="h-4 w-4" />}
            label="Bats / Throws"
            value={
              bats || throws_
                ? `${bats || "—"} / ${throws_ || "—"}`
                : "Not set"
            }
          />
        </div>

        {/* Team */}
        {teamName && (
          <div className="glass-card rounded-xl p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Team</p>
            <p className="font-medium text-sm">{teamName}</p>
          </div>
        )}

        {/* Focus Areas */}
        {focusAreas.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Focus Areas</p>
            <div className="flex flex-wrap gap-1.5">
              {focusAreas.map((area) => (
                <Badge key={area} variant="secondary" className="text-xs">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Parent / Guardian Info */}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Parent / Guardian
          </p>
          <div className="space-y-2">
            <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Name" value={parentName || "Not set"} />
            <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={parentEmail || "Not set"} />
            <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={parentPhone || "Not set"} />
          </div>
        </div>

        {/* Coach Notes */}
        {coachNotes && (
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Coach Notes</p>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{coachNotes}</p>
          </div>
        )}

        {/* Empty state prompt */}
        {!position && !parentEmail && !birthDate && focusAreas.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <User className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No profile details yet</p>
            <p className="text-xs mt-1">Click Edit to add player info, parent contact, and focus areas.</p>
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-lg">Edit Profile</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-[#DC143C] hover:bg-[#DC143C]/90 gap-1.5"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Player Details */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Player Details
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date of Birth</label>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="bg-muted/40 border-border"
            />
            {age !== null && (
              <p className="text-xs text-muted-foreground mt-1">{age} years old</p>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Team</label>
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Westside Tigers"
              className="bg-muted/40 border-border"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Position</label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger className="bg-muted/40 border-border">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {POSITIONS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">2nd Position</label>
            <Select value={secondaryPosition} onValueChange={setSecondaryPosition}>
              <SelectTrigger className="bg-muted/40 border-border">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {POSITIONS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Bats</label>
            <Select value={bats} onValueChange={(v) => setBats(v as "L" | "R" | "S")}>
              <SelectTrigger className="bg-muted/40 border-border">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="L">Left</SelectItem>
                <SelectItem value="R">Right</SelectItem>
                <SelectItem value="S">Switch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Throws</label>
            <Select value={throws_} onValueChange={(v) => setThrows(v as "L" | "R")}>
              <SelectTrigger className="bg-muted/40 border-border">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="L">Left</SelectItem>
                <SelectItem value="R">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </fieldset>

      {/* Focus Areas */}
      <fieldset>
        <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Focus Areas
        </legend>
        <div className="flex flex-wrap gap-2">
          {FOCUS_AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => toggleFocusArea(area)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                focusAreas.includes(area)
                  ? "bg-[#DC143C]/20 text-[#DC143C] border-[#DC143C]/40"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Parent / Guardian */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Parent / Guardian
        </legend>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Name</label>
          <Input
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            placeholder="e.g., John Smith"
            className="bg-muted/40 border-border"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <Input
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="parent@email.com"
              className="bg-muted/40 border-border"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
            <Input
              type="tel"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="bg-muted/40 border-border"
            />
          </div>
        </div>
      </fieldset>

      {/* Coach Notes */}
      <fieldset>
        <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Coach Notes (Private)
        </legend>
        <Textarea
          value={coachNotes}
          onChange={(e) => setCoachNotes(e.target.value)}
          placeholder="Private notes about this player (not shared with parents or athletes)..."
          rows={3}
          className="bg-muted/40 border-border resize-none"
        />
      </fieldset>

      {/* Save button (bottom) */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={() => setIsEditing(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="bg-[#DC143C] hover:bg-[#DC143C]/90 gap-1.5"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Profile
        </Button>
      </div>
    </div>
  );
}

/** Small info card for view mode */
function InfoCard({
  icon,
  label,
  value,
  subvalue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <div className="glass-card rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-muted-foreground">{icon}</span>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className={`font-medium text-sm ${value === "Not set" ? "text-muted-foreground/50" : ""}`}>
        {value}
      </p>
      {subvalue && <p className="text-xs text-muted-foreground mt-0.5">{subvalue}</p>}
    </div>
  );
}

/** Inline info row for view mode */
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground w-14 shrink-0">{label}</span>
      <span className={`font-medium ${value === "Not set" ? "text-muted-foreground/50" : ""}`}>
        {value}
      </span>
    </div>
  );
}
