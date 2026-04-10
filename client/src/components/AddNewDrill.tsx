import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { filterOptions } from "@/data/drills";

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold text-foreground bg-muted/40 hover:bg-muted/60 transition-colors">
        {title}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 py-3 space-y-3">{children}</div>}
    </div>
  );
}

function DynamicList({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={item}
            onChange={(e) => { const next = [...items]; next[i] = e.target.value; onChange(next); }}
            placeholder={placeholder || `Item ${i + 1}`}
            className="text-sm"
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])} className="text-xs">
        <Plus className="h-3 w-3 mr-1" /> Add
      </Button>
    </div>
  );
}

const DRILL_TYPES = ["Tee Work", "Front Toss", "Soft Toss", "Side Toss", "Decision Making", "Constraint", "Movement", "Flaw Fix", "No Stride", "Warm-Up", "Mirror"];
const DURATIONS = ["5 minutes", "8 minutes", "10 minutes", "15 minutes", "20 minutes", "30 minutes"];
const AGE_LEVELS = filterOptions.ageLevel;

export function AddNewDrill() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [bestFor, setBestFor] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [drillType, setDrillType] = useState("Tee Work");
  const [duration, setDuration] = useState("10 minutes");
  const [equipment, setEquipment] = useState("");
  const [athletes, setAthletes] = useState("");
  const [skillSet] = useState("Hitting");
  const [ageLevel, setAgeLevel] = useState<string[]>([]);
  const [description, setDescription] = useState<string[]>([""]);
  const [videoUrl, setVideoUrl] = useState("");
  const [whatThisFixes, setWhatThisFixes] = useState<string[]>([]);
  const [whatToFeel, setWhatToFeel] = useState<string[]>([]);
  const [coachCue, setCoachCue] = useState("");
  const [commonMistakes, setCommonMistakes] = useState<string[]>([]);
  const [watchFor, setWatchFor] = useState("");
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [problems, setProblems] = useState<Set<string>>(new Set());
  const [goals, setGoals] = useState<Set<string>>(new Set());
  const [tagsStr, setTagsStr] = useState("");

  const utils = trpc.useUtils();
  const createMutation = trpc.drillDetails.createNewDrill.useMutation();

  const handleSave = () => {
    if (!name.trim()) { toast.error("Drill name is required"); return; }

    const clean = (arr: string[]) => arr.map(s => s.trim()).filter(Boolean);

    createMutation.mutate({
      name: name.trim(),
      difficulty,
      category: skillSet,
      duration,
      purpose: purpose.trim() || undefined,
      bestFor: bestFor.trim() || undefined,
      equipment: equipment.trim() || undefined,
      athletes: athletes.trim() || undefined,
      description: clean(description).length ? clean(description) : undefined,
      videoUrl: videoUrl.trim() || undefined,
      drillType,
      drillTypeRaw: drillType.toLowerCase().replace(/\s+/g, "-"),
      skillSet,
      ageLevel: ageLevel.length ? ageLevel : undefined,
      tags: tagsStr.trim() ? tagsStr.split(",").map(t => t.trim()).filter(Boolean) : undefined,
      problem: problems.size ? Array.from(problems) : undefined,
      goalTags: goals.size ? Array.from(goals) : undefined,
      whatThisFixes: clean(whatThisFixes).length ? clean(whatThisFixes) : undefined,
      whatToFeel: clean(whatToFeel).length ? clean(whatToFeel) : undefined,
      commonMistakes: clean(commonMistakes).length ? clean(commonMistakes) : undefined,
      coachCue: coachCue.trim() || undefined,
      watchFor: watchFor.trim() || undefined,
      nextSteps: clean(nextSteps).length ? clean(nextSteps) : undefined,
    }, {
      onSuccess: () => {
        toast.success(`Drill "${name}" created!`);
        setOpen(false);
        resetForm();
        utils.drillDetails.getCustomDrills.invalidate();
      },
      onError: (e: any) => toast.error(e.message || "Failed to create drill"),
    });
  };

  const resetForm = () => {
    setName(""); setPurpose(""); setBestFor(""); setDifficulty("Medium"); setDrillType("Tee Work");
    setDuration("10 minutes"); setEquipment(""); setAthletes(""); setAgeLevel([]);
    setDescription([""]); setVideoUrl(""); setWhatThisFixes([]); setWhatToFeel([]);
    setCoachCue(""); setCommonMistakes([]); setWatchFor(""); setNextSteps([]);
    setProblems(new Set()); setGoals(new Set()); setTagsStr("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Add New Drill</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Create New Drill</DialogTitle>
          <DialogDescription>Fill in the basics. Coaching content and filters are optional.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* === Section 1: Basics (always open) === */}
          <Section title="Basics" defaultOpen>
            <div className="space-y-2">
              <Label>Drill Name *</Label>
              <Input placeholder="e.g., 3-Plate Adjustment Drill" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Input placeholder="One-line description of what this drill does" value={purpose} onChange={e => setPurpose(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Best For</Label>
              <Input placeholder="e.g., hitters who rush the move" value={bestFor} onChange={e => setBestFor(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Foundation</SelectItem>
                    <SelectItem value="Medium">Build</SelectItem>
                    <SelectItem value="Hard">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Drill Type</Label>
                <Select value={drillType} onValueChange={setDrillType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DRILL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          {/* === Section 2: Details === */}
          <Section title="Details (equipment, athletes, age levels)">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Equipment</Label>
                <Input placeholder="tee, baseballs, net" value={equipment} onChange={e => setEquipment(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Athletes</Label>
                <Input placeholder="1-2 athletes and 1 coach" value={athletes} onChange={e => setAthletes(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Age Levels</Label>
              <div className="flex flex-wrap gap-2">
                {AGE_LEVELS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ageLevel.includes(opt.value)}
                      onChange={e => setAgeLevel(e.target.checked ? [...ageLevel, opt.value] : ageLevel.filter(v => v !== opt.value))}
                      className="h-3.5 w-3.5 rounded accent-primary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </Section>

          {/* === Section 3: How to Run === */}
          <Section title="How to Run (steps + video)">
            <DynamicList label="Step-by-step instructions" items={description} onChange={setDescription} placeholder="Step..." />
            <div className="space-y-1.5">
              <Label className="text-xs">YouTube Video URL</Label>
              <Input placeholder="https://youtube.com/embed/..." value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
            </div>
          </Section>

          {/* === Section 4: Coaching Content === */}
          <Section title="Coaching Content (cues, mistakes, feel)">
            <DynamicList label="What This Drill Helps Fix" items={whatThisFixes} onChange={setWhatThisFixes} placeholder="e.g., rushing through the load" />
            <DynamicList label="What to Feel" items={whatToFeel} onChange={setWhatToFeel} placeholder="e.g., controlled load into the back side" />
            <div className="space-y-1.5">
              <Label className="text-xs">Coach Cue</Label>
              <Input placeholder="The key coaching phrase" value={coachCue} onChange={e => setCoachCue(e.target.value)} />
            </div>
            <DynamicList label="Common Mistakes" items={commonMistakes} onChange={setCommonMistakes} placeholder="e.g., drifting forward too early" />
            <div className="space-y-1.5">
              <Label className="text-xs">Watch For</Label>
              <Textarea placeholder="What should the coach watch for to know the drill is working?" value={watchFor} onChange={e => setWatchFor(e.target.value)} rows={2} />
            </div>
            <DynamicList label="Next Steps (drill IDs)" items={nextSteps} onChange={setNextSteps} placeholder="e.g., double-tee" />
          </Section>

          {/* === Section 5: Filter Tags === */}
          <Section title="Filter Tags (problems, goals)">
            <div className="space-y-1.5">
              <Label className="text-xs">Problems this drill fixes</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {filterOptions.problem.map(opt => (
                  <label key={opt.value} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={problems.has(opt.value)}
                      onChange={e => { const s = new Set(problems); e.target.checked ? s.add(opt.value) : s.delete(opt.value); setProblems(s); }}
                      className="h-3.5 w-3.5 rounded accent-primary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Training goals</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {filterOptions.goal.map(opt => (
                  <label key={opt.value} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={goals.has(opt.value)}
                      onChange={e => { const s = new Set(goals); e.target.checked ? s.add(opt.value) : s.delete(opt.value); setGoals(s); }}
                      className="h-3.5 w-3.5 rounded accent-primary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input placeholder="foundation, tee, rhythm" value={tagsStr} onChange={e => setTagsStr(e.target.value)} />
            </div>
          </Section>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={resetForm}>Reset</Button>
          <Button onClick={handleSave} disabled={createMutation.isPending || !name.trim()}>
            {createMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Drill"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
