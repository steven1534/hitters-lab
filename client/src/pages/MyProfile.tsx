import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Save,
  Pencil,
  Loader2,
  Users,
  Dumbbell,
  Home,
  Target,
} from "lucide-react";
import { Link } from "wouter";

const POSITIONS = [
  "P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF",
  "RHP", "LHP", "DH", "IF", "OF", "UTL",
];

export default function MyProfile() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const { data: profile, isLoading: profileLoading } = trpc.athleteProfiles.getMyProfile.useQuery(
    undefined,
    { enabled: !!user?.id }
  );

  const updateMutation = trpc.athleteProfiles.update.useMutation({
    onSuccess: () => {
      toast.success("Profile updated!");
      utils.athleteProfiles.getMyProfile.invalidate();
      setIsEditing(false);
    },
    onError: (err) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [position, setPosition] = useState("");
  const [secondaryPosition, setSecondaryPosition] = useState("");
  const [bats, setBats] = useState<"L" | "R" | "S" | "">("");
  const [throws_, setThrows] = useState<"L" | "R" | "">("");
  const [teamName, setTeamName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  useEffect(() => {
    if (profile) {
      setBirthDate(profile.birthDate ? new Date(profile.birthDate).toISOString().split("T")[0] : "");
      setPosition(profile.position ?? "");
      setSecondaryPosition(profile.secondaryPosition ?? "");
      setBats((profile.bats as "L" | "R" | "S") ?? "");
      setThrows((profile.throws as "L" | "R") ?? "");
      setTeamName(profile.teamName ?? "");
      setParentName(profile.parentName ?? "");
      setParentEmail(profile.parentEmail ?? "");
      setParentPhone(profile.parentPhone ?? "");
    }
  }, [profile]);

  const age = useMemo(() => {
    if (!birthDate) return null;
    const bd = new Date(birthDate);
    const today = new Date();
    let a = today.getFullYear() - bd.getFullYear();
    const m = today.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) a--;
    return a;
  }, [birthDate]);

  const handleSave = () => {
    if (!user?.id) return;
    updateMutation.mutate({
      userId: user.id,
      birthDate: birthDate || null,
      position: position || null,
      secondaryPosition: secondaryPosition || null,
      bats: (bats as "L" | "R" | "S") || null,
      throws: (throws_ as "L" | "R") || null,
      teamName: teamName || null,
      parentName: parentName || null,
      parentEmail: parentEmail || null,
      parentPhone: parentPhone || null,
    });
  };

  const isLoading = loading || profileLoading;

  if (isLoading) {
    return (
      <div className="coach-dark min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-electric" />
      </div>
    );
  }

  // Check if profile is empty (show setup prompt)
  const isProfileEmpty = !position && !parentEmail && !birthDate;

  return (
    <div className="coach-dark min-h-screen bg-background">
      {/* Header */}
      <header className="glass sticky top-0 z-40 border-b border-border">
        <div className="flex items-center justify-between max-w-lg mx-auto px-4 py-3">
          <Link href="/athlete-portal">
            <button className="flex items-center gap-1 text-muted-foreground hover:text-electric text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          </Link>
          <h1 className="font-bold text-lg text-gradient">My Profile</h1>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Player Card */}
        <div className="glass-card rounded-2xl overflow-hidden border-glow animate-fade-in-up">
          <div className="relative p-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-electric/20 rounded-full blur-3xl" />
            <div className="relative flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-electric/20 border-2 border-electric/30 flex items-center justify-center">
                <User className="w-8 h-8 text-electric" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{user?.name || "Athlete"}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {position && (
                    <Badge className="bg-electric/20 text-electric border border-electric/30 text-xs">
                      {position}
                    </Badge>
                  )}
                  {age !== null && (
                    <Badge className="bg-muted text-foreground border border-border text-xs">
                      {age}y
                    </Badge>
                  )}
                  {bats && (
                    <Badge className="bg-muted text-foreground border border-border text-xs">
                      B: {bats}
                    </Badge>
                  )}
                  {throws_ && (
                    <Badge className="bg-muted text-foreground border border-border text-xs">
                      T: {throws_}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty state / setup prompt */}
        {isProfileEmpty && !isEditing && (
          <div className="glass-card rounded-2xl p-6 text-center animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="w-14 h-14 rounded-full bg-electric/20 flex items-center justify-center mx-auto mb-3">
              <Pencil className="w-7 h-7 text-electric" />
            </div>
            <h3 className="font-bold text-lg mb-1">Complete Your Profile</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your position, age, and parent contact info so your coach can send progress reports.
            </p>
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-electric hover:bg-electric/90 gap-2"
            >
              <Pencil className="h-4 w-4" />
              Set Up Profile
            </Button>
          </div>
        )}

        {/* View Mode */}
        {!isEditing && !isProfileEmpty && (
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            {/* Player Details */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  Player Details
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-7 text-xs text-electric hover:text-electric/80"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <DetailItem label="Age" value={age ? `${age} years` : "—"} />
                <DetailItem label="Position" value={position || "—"} />
                <DetailItem label="2nd Position" value={secondaryPosition || "—"} />
                <DetailItem label="Bats / Throws" value={bats || throws_ ? `${bats || "—"} / ${throws_ || "—"}` : "—"} />
                <DetailItem label="Team" value={teamName || "—"} className="col-span-2" />
              </div>
            </div>

            {/* Parent Contact */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Parent / Guardian
              </h3>
              <div className="space-y-2">
                <ContactRow icon={<User className="h-3.5 w-3.5" />} value={parentName || "Not set"} />
                <ContactRow icon={<Mail className="h-3.5 w-3.5" />} value={parentEmail || "Not set"} />
                <ContactRow icon={<Phone className="h-3.5 w-3.5" />} value={parentPhone || "Not set"} />
              </div>
            </div>
          </div>
        )}

        {/* Edit Mode */}
        {isEditing && (
          <div className="space-y-5 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            {/* Player Details Form */}
            <div className="glass-card rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Player Details
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
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
                      <SelectValue placeholder="—" />
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
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="L">Left</SelectItem>
                      <SelectItem value="R">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Team</label>
                  <Input
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g., Westside Tigers"
                    className="bg-muted/40 border-border"
                  />
                </div>
              </div>
            </div>

            {/* Parent Contact Form */}
            <div className="glass-card rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Parent / Guardian
              </h3>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                <Input
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="e.g., John Smith"
                  className="bg-muted/40 border-border"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <Input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@email.com"
                  className="bg-muted/40 border-border"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Progress reports will be sent to this email.
                </p>
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

            {/* Save / Cancel */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 glass hover:bg-muted/50"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-electric hover:bg-electric/90 gap-2"
                onClick={handleSave}
                disabled={updateMutation.isPending}
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
        )}
      </main>
    </div>
  );
}

function DetailItem({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-medium ${value === "—" ? "text-muted-foreground/50" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function ContactRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className={`${value === "Not set" ? "text-muted-foreground/50" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
