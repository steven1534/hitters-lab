import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAllDrills } from "@/hooks/useAllDrills";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Trash2, GripVertical, Clock, Dumbbell, MapPin,
  Search, ChevronUp, ChevronDown, Users, Edit3, X as XIcon,
} from "lucide-react";

const LOCATIONS = ["Anywhere", "Garage", "Cage", "Field", "Indoor", "Low Space"];
const ROUTINE_TYPES = ["Warm-Up", "Pre-Work", "Tee Work", "Full Session", "Movement", "Cool Down"];

interface RoutineDrillRow {
  drillId: string;
  drillName: string;
  orderIndex: number;
  durationSeconds: number | null;
  reps: number | null;
  sets: number | null;
  coachNotes: string | null;
}

// ── Main Manager ────────────────────────────────────────────────
export function RoutinesManager() {
  const utils = trpc.useUtils();
  const { data: routines = [], isLoading } = trpc.routines.getAll.useQuery();
  const { data: allUsers = [] } = trpc.admin.getAllUsers.useQuery();
  const athletes = useMemo(() => allUsers.filter((u: any) => u.role === "athlete"), [allUsers]);
  const deleteMutation = trpc.routines.delete.useMutation({
    onSuccess: () => { utils.routines.getAll.invalidate(); toast.success("Routine deleted"); },
  });
  const assignMutation = trpc.routines.assign.useMutation({
    onSuccess: () => { utils.routines.getAll.invalidate(); toast.success("Routine assigned"); },
  });
  const unassignMutation = trpc.routines.unassign.useMutation({
    onSuccess: () => { utils.routines.getAll.invalidate(); toast.success("Routine unassigned"); },
  });

  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [assignDialog, setAssignDialog] = useState<number | null>(null);
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [assignFrequency, setAssignFrequency] = useState("");

  if (isLoading) {
    return <div className="text-muted-foreground text-center py-12">Loading routines...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Routines</h2>
          <p className="text-sm text-muted-foreground">Create structured sessions athletes can follow at home</p>
        </div>
        <Button onClick={() => setEditing("new")} className="gap-2 bg-[#DC143C] hover:bg-[#DC143C]/90">
          <Plus className="h-4 w-4" />New Routine
        </Button>
      </div>

      {routines.length === 0 ? (
        <div className="glass-card rounded-xl p-10 text-center">
          <Dumbbell className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">No routines yet. Create one to build structured at-home sessions.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {routines.map((r: any) => (
            <div key={r.id} className="glass-card rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-foreground">{r.name}</h3>
                  {r.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(r.id)}>
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ id: r.id })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.durationMinutes && (
                  <Badge variant="outline" className="text-xs gap-1"><Clock className="h-3 w-3" />{r.durationMinutes} min</Badge>
                )}
                {r.location && (
                  <Badge variant="outline" className="text-xs gap-1"><MapPin className="h-3 w-3" />{r.location}</Badge>
                )}
                {r.routineType && <Badge variant="outline" className="text-xs">{r.routineType}</Badge>}
                {r.equipment && <Badge variant="outline" className="text-xs gap-1"><Dumbbell className="h-3 w-3" />{r.equipment}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                {r.drills?.length || 0} drills · {r.assignments?.length || 0} assigned
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => setAssignDialog(r.id)}>
                <Users className="h-3 w-3" />Assign to Athlete
              </Button>
              {r.assignments?.length > 0 && (
                <div className="space-y-1">
                  {r.assignments.map((a: any) => {
                    const athlete = allUsers.find((u: any) => u.id === a.userId);
                    return (
                      <div key={a.id} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-2.5 py-1.5">
                        <span className="text-foreground">{athlete?.name || `User #${a.userId}`}</span>
                        <div className="flex items-center gap-2">
                          {a.frequency && <span className="text-muted-foreground">{a.frequency}</span>}
                          <button onClick={() => unassignMutation.mutate({ routineId: r.id, userId: a.userId })} className="text-destructive hover:text-destructive/80">
                            <XIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Editor Dialog */}
      {editing !== null && (
        <RoutineEditor
          routineId={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialog !== null} onOpenChange={(o) => { if (!o) setAssignDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Assign Routine</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Athlete</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger><SelectValue placeholder="Select athlete..." /></SelectTrigger>
                <SelectContent>
                  {athletes.map((a: any) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name || a.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frequency (optional)</Label>
              <Input placeholder="e.g. Daily, 3x/week, Before lessons" value={assignFrequency} onChange={(e) => setAssignFrequency(e.target.value)} />
            </div>
            <Button
              className="w-full bg-[#DC143C] hover:bg-[#DC143C]/90"
              disabled={!assignUserId}
              onClick={() => {
                assignMutation.mutate({
                  routineId: assignDialog!,
                  userId: Number(assignUserId),
                  frequency: assignFrequency || undefined,
                });
                setAssignDialog(null);
                setAssignUserId("");
                setAssignFrequency("");
              }}
            >
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Routine Editor ──────────────────────────────────────────────
function RoutineEditor({ routineId, onClose }: { routineId: number | null; onClose: () => void }) {
  const utils = trpc.useUtils();
  const allDrills = useAllDrills();
  const { data: existing } = trpc.routines.getById.useQuery(
    { id: routineId! },
    { enabled: routineId !== null }
  );

  const [name, setName] = useState(existing?.name || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [durationMinutes, setDurationMinutes] = useState<string>(existing?.durationMinutes?.toString() || "");
  const [equipment, setEquipment] = useState(existing?.equipment || "");
  const [location, setLocation] = useState(existing?.location || "");
  const [routineType, setRoutineType] = useState(existing?.routineType || "");
  const [drillRows, setDrillRows] = useState<RoutineDrillRow[]>(
    existing?.drills?.map((d: any) => ({
      drillId: d.drillId,
      drillName: d.drillName,
      orderIndex: d.orderIndex,
      durationSeconds: d.durationSeconds,
      reps: d.reps,
      sets: d.sets,
      coachNotes: d.coachNotes,
    })) || []
  );
  const [drillSearch, setDrillSearch] = useState("");
  const [initialized, setInitialized] = useState(routineId === null);

  // Sync from server on load
  if (existing && !initialized) {
    setName(existing.name);
    setDescription(existing.description || "");
    setDurationMinutes(existing.durationMinutes?.toString() || "");
    setEquipment(existing.equipment || "");
    setLocation(existing.location || "");
    setRoutineType(existing.routineType || "");
    setDrillRows(
      existing.drills?.map((d: any) => ({
        drillId: d.drillId,
        drillName: d.drillName,
        orderIndex: d.orderIndex,
        durationSeconds: d.durationSeconds,
        reps: d.reps,
        sets: d.sets,
        coachNotes: d.coachNotes,
      })) || []
    );
    setInitialized(true);
  }

  const createMutation = trpc.routines.create.useMutation({
    onSuccess: () => { utils.routines.getAll.invalidate(); toast.success("Routine created"); onClose(); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.routines.update.useMutation({
    onSuccess: () => { utils.routines.getAll.invalidate(); toast.success("Routine updated"); onClose(); },
    onError: (err) => toast.error(err.message),
  });

  const filteredDrills = useMemo(() => {
    if (!drillSearch.trim()) return [];
    const q = drillSearch.toLowerCase();
    const usedIds = new Set(drillRows.map((r) => r.drillId));
    return (allDrills as any[])
      .filter((d) => !usedIds.has(d.id) && d.name?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [drillSearch, allDrills, drillRows]);

  function addDrill(drill: any) {
    setDrillRows((prev) => [
      ...prev,
      {
        drillId: drill.id,
        drillName: drill.name,
        orderIndex: prev.length,
        durationSeconds: null,
        reps: null,
        sets: null,
        coachNotes: null,
      },
    ]);
    setDrillSearch("");
  }

  function removeDrill(idx: number) {
    setDrillRows((prev) => prev.filter((_, i) => i !== idx).map((d, i) => ({ ...d, orderIndex: i })));
  }

  function moveDrill(idx: number, direction: -1 | 1) {
    setDrillRows((prev) => {
      const arr = [...prev];
      const target = idx + direction;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr.map((d, i) => ({ ...d, orderIndex: i }));
    });
  }

  function updateDrillField(idx: number, field: keyof RoutineDrillRow, value: any) {
    setDrillRows((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  }

  function handleSave() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      equipment: equipment.trim() || undefined,
      location: location || undefined,
      routineType: routineType || undefined,
      drills: drillRows.map((d) => ({
        drillId: d.drillId,
        drillName: d.drillName,
        orderIndex: d.orderIndex,
        durationSeconds: d.durationSeconds,
        reps: d.reps,
        sets: d.sets,
        coachNotes: d.coachNotes,
      })),
    };

    if (routineId) {
      updateMutation.mutate({ id: routineId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{routineId ? "Edit Routine" : "New Routine"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Routine Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 15-Min Garage Tee Session" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this routine for?" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (min)</Label>
              <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="15" />
            </div>
            <div className="space-y-1.5">
              <Label>Equipment</Label>
              <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="Tee, bat, balls" />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select value={location || "__none__"} onValueChange={(v) => setLocation(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Any location" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Any location</SelectItem>
                  {LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={routineType || "__none__"} onValueChange={(v) => setRoutineType(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No type</SelectItem>
                  {ROUTINE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Drill list */}
          <div className="space-y-2">
            <Label>Drills in this routine</Label>
            {drillRows.length === 0 && (
              <p className="text-xs text-muted-foreground">No drills added yet. Search below to add drills.</p>
            )}
            <div className="space-y-2">
              {drillRows.map((row, idx) => (
                <div key={`${row.drillId}-${idx}`} className="glass rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                    <span className="font-medium text-sm flex-1 truncate">{row.drillName}</span>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <button onClick={() => moveDrill(idx, -1)} disabled={idx === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20">
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => moveDrill(idx, 1)} disabled={idx === drillRows.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => removeDrill(idx)} className="p-1 text-destructive hover:text-destructive/80">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pl-11">
                    <div>
                      <Label className="text-[10px]">Reps</Label>
                      <Input type="number" className="h-7 text-xs" placeholder="—" value={row.reps ?? ""} onChange={(e) => updateDrillField(idx, "reps", e.target.value ? Number(e.target.value) : null)} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Sets</Label>
                      <Input type="number" className="h-7 text-xs" placeholder="—" value={row.sets ?? ""} onChange={(e) => updateDrillField(idx, "sets", e.target.value ? Number(e.target.value) : null)} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Time (sec)</Label>
                      <Input type="number" className="h-7 text-xs" placeholder="—" value={row.durationSeconds ?? ""} onChange={(e) => updateDrillField(idx, "durationSeconds", e.target.value ? Number(e.target.value) : null)} />
                    </div>
                  </div>
                  <div className="pl-11">
                    <Input className="h-7 text-xs" placeholder="Coach notes for this step..." value={row.coachNotes ?? ""} onChange={(e) => updateDrillField(idx, "coachNotes", e.target.value || null)} />
                  </div>
                </div>
              ))}
            </div>

            {/* Drill search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-8 text-sm"
                placeholder="Search drills to add..."
                value={drillSearch}
                onChange={(e) => setDrillSearch(e.target.value)}
              />
            </div>
            {filteredDrills.length > 0 && (
              <div className="glass rounded-lg max-h-48 overflow-y-auto divide-y divide-white/5">
                {filteredDrills.map((d: any) => (
                  <button
                    key={d.id}
                    onClick={() => addDrill(d)}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-sm"
                  >
                    <Plus className="h-3.5 w-3.5 text-electric flex-shrink-0" />
                    <span className="truncate">{d.name}</span>
                    {d.difficulty && <Badge variant="outline" className="text-[10px] ml-auto flex-shrink-0">{d.difficulty}</Badge>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()} className="bg-[#DC143C] hover:bg-[#DC143C]/90">
              {saving ? "Saving..." : routineId ? "Save Changes" : "Create Routine"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
