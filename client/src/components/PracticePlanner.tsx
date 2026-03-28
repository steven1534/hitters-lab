import { useState, useMemo, useCallback, useEffect, useRef } from "react";

// Helper: safely parse focusAreas which may come from DB as JSON string or array
function parseFocusAreas(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Trash2, Clock, Search, Copy, Share2, Edit3,
  ChevronDown, ChevronUp, Calendar, Target, Dumbbell,
  Coffee, Zap, ArrowLeft, Check, Eye, EyeOff,
  MoreVertical, BookOpen, Play, Pause, SkipForward,
  X, GripVertical, AlertCircle, Flame, Snowflake,
  Activity, ChevronRight, FileText, Timer, Maximize2,
  Minimize2, MessageSquare, Lightbulb, Wrench,
  CalendarDays, List, ChevronLeft,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAllDrills, type UnifiedDrill } from "@/hooks/useAllDrills";
import { toast } from "sonner";
import { InlineEdit } from "./InlineEdit";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DrillItem {
  id: string;
  name: string;
  difficulty: string;
  categories: string[];
  duration: string;
}

interface PlanBlock {
  id: string;
  sortOrder: number;
  blockType: "drill" | "warmup" | "cooldown" | "break" | "custom";
  drillId?: string | null;
  title: string;
  duration: number;
  sets?: number | null;
  reps?: number | null;
  notes?: string | null;
  coachingCues?: string | null;
  keyPoints?: string | null;
  equipment?: string | null;
  intensity?: "low" | "medium" | "high" | null;
  goal?: string | null;
}

type ViewMode = "list" | "calendar" | "create" | "edit" | "detail" | "session";

const FOCUS_AREAS = [
  "Hitting", "Swing Mechanics", "Bat Speed", "Pitch Recognition",
  "Plate Approach", "Exit Velocity", "Mental Game", "Conditioning",
  "Warm-Up", "Cool-Down",
];

const BLOCK_TYPE_CONFIG = {
  drill: { icon: Target, label: "Drill", color: "text-[#E8425A]", bg: "bg-[#DC143C]/10", border: "border-[#DC143C]/30", accent: "#DC143C", gradient: "from-[#DC143C]/20 to-[#B91030]/5" },
  warmup: { icon: Flame, label: "Warm-Up", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", accent: "#f59e0b", gradient: "from-amber-500/20 to-amber-600/5" },
  cooldown: { icon: Snowflake, label: "Cool-Down", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", accent: "#10b981", gradient: "from-emerald-500/20 to-emerald-600/5" },
  break: { icon: Coffee, label: "Break", color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30", accent: "#6b7280", gradient: "from-gray-500/20 to-gray-600/5" },
  custom: { icon: Dumbbell, label: "Custom", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", accent: "#a855f7", gradient: "from-purple-500/20 to-purple-600/5" },
};

const INTENSITY_CONFIG = {
  low: { label: "Low", color: "text-green-400", bg: "bg-green-500/15", icon: "🟢" },
  medium: { label: "Medium", color: "text-yellow-400", bg: "bg-yellow-500/15", icon: "🟡" },
  high: { label: "High", color: "text-red-400", bg: "bg-red-500/15", icon: "🔴" },
};

let _tempId = 0;
function tempId() { return `tmp-${++_tempId}-${Date.now()}`; }

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PracticePlanner() {
  const [view, setView] = useState<ViewMode>("list");
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [detailPlanId, setDetailPlanId] = useState<number | null>(null);
  const [sessionPlanId, setSessionPlanId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const utils = trpc.useUtils();
  const { data: plans, isLoading } = trpc.practicePlans.getAll.useQuery();

  const deleteMut = trpc.practicePlans.delete.useMutation({
    onSuccess: () => { utils.practicePlans.getAll.invalidate(); toast.success("Plan deleted"); },
  });
  const duplicateMut = trpc.practicePlans.duplicate.useMutation({
    onSuccess: () => { utils.practicePlans.getAll.invalidate(); toast.success("Plan duplicated"); },
  });
  const shareMut = trpc.practicePlans.toggleShare.useMutation({
    onSuccess: () => { utils.practicePlans.getAll.invalidate(); },
  });

  const filteredPlans = useMemo(() => {
    if (!plans) return [];
    return plans.filter((p) => {
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.athleteName && p.athleteName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [plans, statusFilter, searchQuery]);

  // ─── Session Mode ───────────────────────────────────────────────────────────
  if (view === "session" && sessionPlanId) {
    return (
      <SessionMode
        planId={sessionPlanId}
        onExit={() => { setView("list"); setSessionPlanId(null); }}
      />
    );
  }

  // ─── Detail View ────────────────────────────────────────────────────────────
  if (view === "detail" && detailPlanId) {
    return (
      <PlanDetail
        planId={detailPlanId}
        onBack={() => { setView("list"); setDetailPlanId(null); }}
        onEdit={() => { setEditingPlanId(detailPlanId); setView("edit"); setDetailPlanId(null); }}
        onStartSession={() => { setSessionPlanId(detailPlanId); setView("session"); setDetailPlanId(null); }}
        onShare={(planId, shared) => shareMut.mutate({ planId, isShared: shared })}
      />
    );
  }

  // ─── Create / Edit Form ─────────────────────────────────────────────────────
  if (view === "create" || view === "edit") {
    return (
      <PlanForm
        planId={view === "edit" ? editingPlanId : null}
        onCancel={() => { setView("list"); setEditingPlanId(null); }}
        onSaved={() => { setView("list"); setEditingPlanId(null); utils.practicePlans.getAll.invalidate(); }}
      />
    );
  }

  // ─── Calendar View ──────────────────────────────────────────────────────────
  if (view === "calendar") {
    return (
      <CalendarView
        plans={plans || []}
        onBack={() => setView("list")}
        onViewPlan={(id) => { setDetailPlanId(id); setView("detail"); }}
        onCreatePlan={(date) => { setView("create"); }}
        onStartSession={(id) => { setSessionPlanId(id); setView("session"); }}
      />
    );
  }

  // ─── List View ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <InlineEdit contentKey="coach.planner.title" defaultValue="Practice Plans" as="h2" className="text-2xl font-heading font-bold text-foreground" />
          <p className="text-sm text-muted-foreground mt-1">{plans?.length || 0} plans created</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-muted/40 rounded-lg border border-border p-0.5">
            <button
              onClick={() => setView("list")}
              className="p-2 rounded-md transition-all bg-white/[0.1] text-foreground"
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("calendar")}
              className="p-2 rounded-md transition-all text-muted-foreground hover:text-foreground/80"
              aria-label="Calendar view"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={() => setView("create")} className="bg-[#DC143C] hover:bg-[#B91030] text-white gap-2 shadow-lg shadow-[#DC143C]/20">
            <Plus className="h-4 w-4" /> <InlineEdit contentKey="coach.planner.newPlan" defaultValue="New Plan" as="span" />
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plans or athletes..."
            className="pl-9 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {["all", "draft", "scheduled", "completed", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === s
                  ? "bg-[#DC143C] text-white shadow-lg shadow-[#DC143C]/20"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-muted/30 rounded-xl animate-pulse border border-border/60" />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.02] rounded-xl border border-dashed border-border">
          <FileText className="h-12 w-12 text-white/15 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-muted-foreground mb-2">
            {plans?.length === 0 ? "No practice plans yet" : "No plans match your filters"}
          </h3>
          <p className="text-sm text-muted-foreground/60 mb-6 max-w-md mx-auto">
            {plans?.length === 0
              ? "Create your first session plan to stay organized during training."
              : "Try adjusting your search or filter criteria."}
          </p>
          {plans?.length === 0 && (
            <Button onClick={() => setView("create")} className="bg-[#DC143C] hover:bg-[#B91030] text-white gap-2">
              <Plus className="h-4 w-4" /> Create First Plan
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onView={() => { setDetailPlanId(plan.id); setView("detail"); }}
              onEdit={() => { setEditingPlanId(plan.id); setView("edit"); }}
              onStartSession={() => { setSessionPlanId(plan.id); setView("session"); }}
              onDuplicate={() => duplicateMut.mutate({ planId: plan.id })}
              onDelete={() => { if (confirm("Delete this plan?")) deleteMut.mutate({ planId: plan.id }); }}
              onToggleShare={() => shareMut.mutate({ planId: plan.id, isShared: !plan.isShared })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Plan Card ──────────────────────────────────────────────────────────────

function PlanCard({ plan, onView, onEdit, onStartSession, onDuplicate, onDelete, onToggleShare }: {
  plan: any;
  onView: () => void;
  onEdit: () => void;
  onStartSession: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleShare: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const focusAreas = parseFocusAreas(plan.focusAreas);
  const statusColors: Record<string, string> = {
    draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    scheduled: "bg-[#DC143C]/20 text-[#E8425A] border-[#DC143C]/30",
    completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <Card
      className="bg-muted/30 border-border hover:bg-muted/50 hover:border-border transition-all duration-300 cursor-pointer group overflow-hidden"
      onClick={onView}
    >
      <CardContent className="p-0">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-[#DC143C] via-[#DC143C] to-[#B91030] opacity-60 group-hover:opacity-100 transition-opacity" />

        <div className="p-4 sm:p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-bold text-foreground text-lg leading-tight truncate group-hover:text-[#E8425A] transition-colors">
                {plan.title}
              </h3>
              {plan.athleteName && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{plan.athleteName}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={`${statusColors[plan.status] || statusColors.draft} border text-[10px] font-medium uppercase tracking-wider`}>
                {plan.status}
              </Badge>
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                  className="p-1.5 rounded-lg hover:bg-white/[0.1] text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-[#1a1f2e] border border-border rounded-xl shadow-2xl py-1.5 min-w-[180px]">
                      <button onClick={(e) => { e.stopPropagation(); onStartSession(); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted/60 flex items-center gap-2.5 transition-colors">
                        <Play className="h-4 w-4 text-green-400" /> Start Session
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onEdit(); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted/60 flex items-center gap-2.5 transition-colors">
                        <Edit3 className="h-4 w-4 text-[#E8425A]" /> Edit Plan
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDuplicate(); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted/60 flex items-center gap-2.5 transition-colors">
                        <Copy className="h-4 w-4 text-[#E8425A]" /> Duplicate
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onToggleShare(); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted/60 flex items-center gap-2.5 transition-colors">
                        {plan.isShared ? <EyeOff className="h-4 w-4 text-yellow-400" /> : <Share2 className="h-4 w-4 text-yellow-400" />}
                        {plan.isShared ? "Unshare" : "Share with Athlete"}
                      </button>
                      <div className="border-t border-border/60 my-1" />
                      <button onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors">
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/35 mb-3">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {plan.duration} min</span>
            {plan.sessionDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(plan.sessionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
            {plan.isShared === 1 && (
              <span className="flex items-center gap-1 text-green-400/60"><Share2 className="h-3 w-3" /> Shared</span>
            )}
          </div>

          {/* Focus areas */}
          {focusAreas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {focusAreas.slice(0, 4).map((area) => (
                <span key={area} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted/50 text-muted-foreground border border-border/60">
                  {area}
                </span>
              ))}
              {focusAreas.length > 4 && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-muted-foreground/50">+{focusAreas.length - 4}</span>
              )}
            </div>
          )}

          {/* Quick action row */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
            <button
              onClick={(e) => { e.stopPropagation(); onStartSession(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all"
            >
              <Play className="h-3 w-3" /> Session
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/40 text-muted-foreground border border-border/60 hover:bg-muted hover:text-foreground transition-all"
            >
              <Edit3 className="h-3 w-3" /> Edit
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Plan Detail View ───────────────────────────────────────────────────────

function PlanDetail({ planId, onBack, onEdit, onStartSession, onShare }: {
  planId: number;
  onBack: () => void;
  onEdit: () => void;
  onStartSession: () => void;
  onShare: (planId: number, shared: boolean) => void;
}) {
  const { data: plan, isLoading } = trpc.practicePlans.getById.useQuery({ planId });

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-muted/60 rounded animate-pulse" />
      <div className="h-64 bg-muted/40 rounded-xl animate-pulse" />
    </div>
  );

  if (!plan) return (
    <div className="text-center py-16">
      <AlertCircle className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
      <p className="text-muted-foreground">Plan not found</p>
      <Button variant="outline" onClick={onBack} className="mt-4 bg-transparent border-border text-muted-foreground">Go Back</Button>
    </div>
  );

  const focusAreas = parseFocusAreas(plan.focusAreas);
  const blocks = plan.blocks || [];
  let runningTime = 0;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.1] text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-heading font-bold text-foreground truncate">{plan.title}</h2>
          {plan.athleteName && <p className="text-sm text-muted-foreground">{plan.athleteName}</p>}
        </div>
      </div>

      {/* Session Overview Card */}
      <Card className="bg-gradient-to-br from-[#DC143C]/10 via-white/[0.03] to-[#DC143C]/5 border-border overflow-hidden">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1">Duration</p>
              <p className="text-xl font-bold text-foreground flex items-center gap-1.5"><Clock className="h-4 w-4 text-[#E8425A]" /> {plan.duration} min</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1">Blocks</p>
              <p className="text-xl font-bold text-foreground flex items-center gap-1.5"><Activity className="h-4 w-4 text-[#E8425A]" /> {blocks.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1">Status</p>
              <Badge className="bg-[#DC143C]/20 text-[#E8425A] border border-[#DC143C]/30 text-xs">{plan.status}</Badge>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1">Date</p>
              <p className="text-sm font-medium text-foreground/80">
                {plan.sessionDate ? new Date(plan.sessionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not set"}
              </p>
            </div>
          </div>

          {focusAreas.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {focusAreas.map((area) => (
                <Badge key={area} className="bg-muted/60 text-muted-foreground border border-border text-xs">{area}</Badge>
              ))}
            </div>
          )}

          {plan.sessionNotes && (
            <div className="bg-muted/40 rounded-lg p-3 border border-border/60">
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1.5 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Session Notes</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{plan.sessionNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Timeline */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Timer className="h-4 w-4" /> Session Timeline
        </h3>

        <div className="space-y-3">
          {blocks.map((block: any, idx: number) => {
            const config = BLOCK_TYPE_CONFIG[block.blockType as keyof typeof BLOCK_TYPE_CONFIG] || BLOCK_TYPE_CONFIG.custom;
            const Icon = config.icon;
            const startTime = runningTime;
            runningTime += block.duration;
            const intensityConf = block.intensity ? INTENSITY_CONFIG[block.intensity as keyof typeof INTENSITY_CONFIG] : null;

            return (
              <DetailBlock
                key={block.id}
                block={block}
                index={idx}
                startTime={startTime}
                config={config}
                intensityConf={intensityConf}
              />
            );
          })}
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a]/95 backdrop-blur-xl border-t border-border px-4 py-3 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onEdit} className="bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 gap-2">
              <Edit3 className="h-4 w-4" /> Edit
            </Button>
            <button
              onClick={() => onShare(planId, !(plan.isShared === 1))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                plan.isShared === 1
                  ? "bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {plan.isShared === 1 ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {plan.isShared === 1 ? "Shared" : "Share"}
            </button>
          </div>
          <Button onClick={onStartSession} className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg shadow-green-600/20 px-6">
            <Play className="h-4 w-4" /> Start Session
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Block (Read-Only Visual Block) ──────────────────────────────────

function DetailBlock({ block, index, startTime, config, intensityConf }: {
  block: any; index: number; startTime: number; config: any; intensityConf: any;
}) {
  const [expanded, setExpanded] = useState(true);
  const Icon = config.icon;
  const hasDetails = block.notes || block.coachingCues || block.keyPoints || block.equipment || block.goal;

  return (
    <div className={`rounded-xl border ${config.border} overflow-hidden transition-all`}>
      {/* Block Header */}
      <div
        className={`flex items-center gap-3 p-4 cursor-pointer bg-gradient-to-r ${config.gradient}`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Timeline indicator */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-12">
          <span className="text-[10px] font-mono text-muted-foreground/60">{startTime}m</span>
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${config.bg}`}>
            <Icon className={`h-4 w-4 ${config.color}`} />
          </div>
        </div>

        {/* Block info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-foreground truncate">{block.title}</span>
            {intensityConf && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${intensityConf.bg} ${intensityConf.color} font-medium`}>
                {intensityConf.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-white/35">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {block.duration} min</span>
            {block.sets && <span>{block.sets} sets</span>}
            {block.reps && <span>{block.reps} reps</span>}
            {block.equipment && <span className="flex items-center gap-1"><Wrench className="h-3 w-3" /> {block.equipment}</span>}
          </div>
        </div>

        {/* Expand toggle */}
        {hasDetails && (
          <div className="text-muted-foreground/40">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && hasDetails && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.05] pt-3">
          {block.goal && (
            <div className="flex items-start gap-2">
              <Target className="h-3.5 w-3.5 text-[#E8425A] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-medium text-[#E8425A]/60 uppercase tracking-wider mb-0.5">Goal</p>
                <p className="text-sm text-foreground/80">{block.goal}</p>
              </div>
            </div>
          )}

          {block.coachingCues && (
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3">
              <p className="text-[10px] font-medium text-amber-400/70 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" /> Coaching Cues
              </p>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{block.coachingCues}</p>
            </div>
          )}

          {block.keyPoints && (
            <div className="bg-[#DC143C]/5 border border-[#DC143C]/15 rounded-lg p-3">
              <p className="text-[10px] font-medium text-[#E8425A]/70 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Key Points / What to Watch
              </p>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{block.keyPoints}</p>
            </div>
          )}

          {block.notes && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Notes
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{block.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Session Mode (Full-Screen Live View) ───────────────────────────────────

function SessionMode({ planId, onExit }: { planId: number; onExit: () => void; }) {
  const { data: plan, isLoading } = trpc.practicePlans.getById.useQuery({ planId });
  const [currentBlockIdx, setCurrentBlockIdx] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const blocks = plan?.blocks || [];
  const currentBlock = blocks[currentBlockIdx];
  const totalBlocks = blocks.length;

  // Timer logic
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const goToBlock = (idx: number) => {
    if (idx >= 0 && idx < totalBlocks) {
      setCurrentBlockIdx(idx);
      setElapsedSeconds(0);
    }
  };

  const startSession = () => {
    setSessionStarted(true);
    setIsTimerRunning(true);
    setCurrentBlockIdx(0);
    setElapsedSeconds(0);
  };

  if (isLoading) return (
    <div className="fixed inset-0 bg-[#1a1a1a] z-[100] flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground/60 text-lg">Loading session...</div>
    </div>
  );

  if (!plan) return null;

  const config = currentBlock ? (BLOCK_TYPE_CONFIG[currentBlock.blockType as keyof typeof BLOCK_TYPE_CONFIG] || BLOCK_TYPE_CONFIG.custom) : BLOCK_TYPE_CONFIG.custom;
  const Icon = config.icon;
  const blockDurationSec = currentBlock ? currentBlock.duration * 60 : 0;
  const progress = blockDurationSec > 0 ? Math.min((elapsedSeconds / blockDurationSec) * 100, 100) : 0;
  const isOvertime = elapsedSeconds > blockDurationSec;
  const intensityConf = currentBlock?.intensity ? INTENSITY_CONFIG[currentBlock.intensity as keyof typeof INTENSITY_CONFIG] : null;

  // Pre-session start screen
  if (!sessionStarted) {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] z-[100] flex flex-col safe-area-inset-top safe-area-inset-bottom" role="dialog" aria-label="Session Mode">
        <div className="flex items-center justify-between p-4 border-b border-border/60">
          <button onClick={onExit} aria-label="Exit session" className="p-2 rounded-lg hover:bg-white/[0.1] text-muted-foreground hover:text-foreground transition-colors touch-target">
            <X className="h-5 w-5" />
          </button>
          <span className="text-sm text-muted-foreground/60 font-medium">Session Mode</span>
          <div className="w-9" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#DC143C]/20 to-[#DC143C]/10 flex items-center justify-center mb-6 border border-[#DC143C]/20">
            <Play className="h-10 w-10 text-[#E8425A]" />
          </div>
          <h2 className="text-3xl font-heading font-bold text-foreground mb-2">{plan.title}</h2>
          {plan.athleteName && <p className="text-lg text-muted-foreground mb-2">{plan.athleteName}</p>}
          <p className="text-muted-foreground/60 mb-8">{totalBlocks} blocks · {plan.duration} min</p>

          {/* Block preview list */}
          <div className="w-full max-w-sm space-y-2 mb-8 max-h-[40vh] overflow-y-auto">
            {blocks.map((b: any, i: number) => {
              const bConfig = BLOCK_TYPE_CONFIG[b.blockType as keyof typeof BLOCK_TYPE_CONFIG] || BLOCK_TYPE_CONFIG.custom;
              const BIcon = bConfig.icon;
              return (
                <div key={b.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${bConfig.bg} border ${bConfig.border}`}>
                  <span className="text-xs text-muted-foreground/50 font-mono w-5">{i + 1}</span>
                  <BIcon className={`h-4 w-4 ${bConfig.color} flex-shrink-0`} />
                  <span className="text-sm text-foreground/80 flex-1 truncate text-left">{b.title}</span>
                  <span className="text-xs text-muted-foreground/60">{b.duration}m</span>
                </div>
              );
            })}
          </div>

          <Button onClick={startSession} size="lg" className="bg-green-600 hover:bg-green-700 text-white gap-3 px-10 py-6 text-lg shadow-2xl shadow-green-600/30 rounded-xl">
            <Play className="h-6 w-6" /> Start Session
          </Button>
        </div>
      </div>
    );
  }

  // Active session view
  return (
    <div className="fixed inset-0 bg-[#1a1a1a] z-[100] flex flex-col safe-area-inset-top safe-area-inset-bottom" role="dialog" aria-label="Active Session">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-[#1a1a1a]/95 backdrop-blur-lg flex-shrink-0">
        <button onClick={() => { setIsTimerRunning(false); onExit(); }} aria-label="Exit session" className="p-2 rounded-lg hover:bg-white/[0.1] text-muted-foreground hover:text-foreground transition-colors touch-target">
          <X className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">Session</p>
          <p className="text-sm text-foreground/80 font-medium truncate max-w-[200px]">{plan.title}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Block</p>
          <p className="text-sm text-foreground/80 font-mono">{currentBlockIdx + 1}/{totalBlocks}</p>
        </div>
      </div>

      {/* Progress bar across all blocks */}
      <div className="flex gap-1 px-4 py-2 flex-shrink-0">
        {blocks.map((_: any, i: number) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all cursor-pointer ${
              i < currentBlockIdx ? "bg-green-500" : i === currentBlockIdx ? "bg-[#DC143C]" : "bg-muted"
            }`}
            onClick={() => goToBlock(i)}
          />
        ))}
      </div>

      {/* Main content - scrollable */}
      {currentBlock && (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {/* Block type & timer */}
          <div className="text-center mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${config.bg} border ${config.border} mb-4`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
              <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
              {intensityConf && (
                <span className={`text-xs px-2 py-0.5 rounded-md ${intensityConf.bg} ${intensityConf.color} font-medium ml-1`}>
                  {intensityConf.label}
                </span>
              )}
            </div>

            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-3 leading-tight px-2">
              {currentBlock.title}
            </h2>

            {/* Timer */}
            <div className="mb-4">
              <p className={`text-5xl sm:text-6xl font-mono font-bold tracking-tight ${isOvertime ? "text-red-400" : "text-foreground"}`}>
                {formatTime(elapsedSeconds)}
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                {isOvertime ? "Over time!" : `of ${currentBlock.duration}:00`}
              </p>
            </div>

            {/* Progress */}
            <div className="max-w-xs mx-auto mb-2">
              <Progress value={progress} className="h-2 bg-muted/60" />
            </div>

            {/* Timer controls */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                aria-label={isTimerRunning ? "Pause timer" : "Resume timer"}
                className={`h-14 w-14 rounded-full flex items-center justify-center transition-all shadow-lg touch-target ${
                  isTimerRunning
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
                    : "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                }`}
              >
                {isTimerRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </button>
              <button
                onClick={() => setElapsedSeconds(0)}
                aria-label="Reset timer"
                className="h-10 w-10 rounded-full flex items-center justify-center bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-white/[0.1] transition-all border border-border touch-target"
              >
                <Timer className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Sets & Reps */}
          {(currentBlock.sets || currentBlock.reps) && (
            <div className="flex justify-center gap-6 mb-6">
              {currentBlock.sets && (
                <div className="text-center bg-muted/40 rounded-xl px-6 py-3 border border-border/60">
                  <p className="text-3xl font-bold text-foreground">{currentBlock.sets}</p>
                  <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mt-0.5">Sets</p>
                </div>
              )}
              {currentBlock.reps && (
                <div className="text-center bg-muted/40 rounded-xl px-6 py-3 border border-border/60">
                  <p className="text-3xl font-bold text-foreground">{currentBlock.reps}</p>
                  <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mt-0.5">Reps</p>
                </div>
              )}
            </div>
          )}

          {/* Equipment */}
          {currentBlock.equipment && (
            <div className="flex items-center justify-center gap-2 mb-4 text-muted-foreground">
              <Wrench className="h-4 w-4" />
              <span className="text-sm">{currentBlock.equipment}</span>
            </div>
          )}

          {/* Goal */}
          {currentBlock.goal && (
            <div className="bg-[#DC143C]/8 border border-[#DC143C]/15 rounded-xl p-4 mb-4 max-w-lg mx-auto">
              <p className="text-[10px] font-medium text-[#E8425A]/60 uppercase tracking-wider mb-1.5 flex items-center gap-1 justify-center">
                <Target className="h-3 w-3" /> Block Goal
              </p>
              <p className="text-base text-foreground text-center leading-relaxed">{currentBlock.goal}</p>
            </div>
          )}

          {/* Coaching Cues - PROMINENT */}
          {currentBlock.coachingCues && (
            <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-5 mb-4 max-w-lg mx-auto">
              <p className="text-xs font-bold text-amber-400/80 uppercase tracking-wider mb-2 flex items-center gap-1.5 justify-center">
                <Lightbulb className="h-4 w-4" /> Coaching Cues
              </p>
              <p className="text-lg text-foreground text-center leading-relaxed whitespace-pre-wrap font-medium">{currentBlock.coachingCues}</p>
            </div>
          )}

          {/* Key Points */}
          {currentBlock.keyPoints && (
            <div className="bg-[#DC143C]/8 border border-[#DC143C]/15 rounded-xl p-4 mb-4 max-w-lg mx-auto">
              <p className="text-[10px] font-medium text-[#E8425A]/60 uppercase tracking-wider mb-1.5 flex items-center gap-1 justify-center">
                <AlertCircle className="h-3 w-3" /> What to Watch
              </p>
              <p className="text-base text-foreground/80 text-center leading-relaxed whitespace-pre-wrap">{currentBlock.keyPoints}</p>
            </div>
          )}

          {/* Notes */}
          {currentBlock.notes && (
            <div className="bg-muted/30 border border-border/60 rounded-xl p-4 max-w-lg mx-auto">
              <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-1.5 flex items-center gap-1 justify-center">
                <FileText className="h-3 w-3" /> Notes
              </p>
              <p className="text-sm text-muted-foreground text-center whitespace-pre-wrap">{currentBlock.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Bottom navigation */}
      <div className="flex items-center justify-between px-4 py-4 border-t border-border/60 bg-[#1a1a1a]/95 backdrop-blur-lg flex-shrink-0">
        <button
          onClick={() => goToBlock(currentBlockIdx - 1)}
          disabled={currentBlockIdx === 0}
          aria-label="Previous block"
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-border/60 touch-target"
        >
          <ArrowLeft className="h-4 w-4" /> Prev
        </button>

        {/* Block dots */}
        <div className="flex gap-1.5 overflow-x-auto max-w-[40vw] scrollbar-hide">
          {blocks.map((_: any, i: number) => (
            <button
              key={i}
              onClick={() => goToBlock(i)}
              className={`h-2.5 w-2.5 rounded-full transition-all flex-shrink-0 ${
                i === currentBlockIdx ? "bg-[#DC143C] scale-125" : i < currentBlockIdx ? "bg-green-500/60" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {currentBlockIdx < totalBlocks - 1 ? (
          <button
            onClick={() => { goToBlock(currentBlockIdx + 1); setElapsedSeconds(0); }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-[#DC143C] text-white hover:bg-[#B91030] transition-all shadow-lg shadow-[#DC143C]/20"
          >
            Next <SkipForward className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => { setIsTimerRunning(false); toast.success("Session complete!"); onExit(); }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
          >
            <Check className="h-4 w-4" /> Done
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Plan Form (Create / Edit) ──────────────────────────────────────────────

function PlanForm({ planId, onCancel, onSaved }: { planId: number | null; onCancel: () => void; onSaved: () => void; }) {
  const { data: existingPlan, isLoading: loadingPlan } = trpc.practicePlans.getById.useQuery(
    { planId: planId! },
    { enabled: !!planId }
  );

  const [title, setTitle] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState<string>("none");
  const [sessionDate, setSessionDate] = useState("");
  const [status, setStatus] = useState<"draft" | "scheduled" | "completed" | "cancelled">("draft");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [sessionNotes, setSessionNotes] = useState("");
  const [blocks, setBlocks] = useState<PlanBlock[]>([]);

  const { data: overviewData } = trpc.drillAssignments.getAthleteAssignmentOverview.useQuery();
  const athleteOptions = useMemo(() => {
    if (!overviewData?.athletes) return [];
    return overviewData.athletes
      .filter((a: any) => a.type === 'user') // Only show registered users, not pending invites
      .map((a: any) => {
        // a.id is in format "user-5" — extract the numeric part
        const numericId = a.id.replace('user-', '');
        return { id: numericId, name: a.name || a.email, email: a.email };
      });
  }, [overviewData]);

  const createMut = trpc.practicePlans.create.useMutation({ onSuccess: () => { toast.success("Plan created!"); onSaved(); } });
  const updateMut = trpc.practicePlans.update.useMutation({ onSuccess: () => { toast.success("Plan updated!"); onSaved(); } });
  const isSaving = createMut.isPending || updateMut.isPending;

  // Load existing plan data
  useEffect(() => {
    if (existingPlan) {
      setTitle(existingPlan.title);
      setSelectedAthlete(existingPlan.athleteId ? String(existingPlan.athleteId) : "none");
      setSessionDate(existingPlan.sessionDate ? new Date(existingPlan.sessionDate).toISOString().slice(0, 16) : "");
      setStatus(existingPlan.status as any);
      setFocusAreas(parseFocusAreas(existingPlan.focusAreas));
      setSessionNotes(existingPlan.sessionNotes || "");
      setBlocks(
        existingPlan.blocks.map((b: any) => ({
          id: tempId(),
          sortOrder: b.sortOrder,
          blockType: b.blockType,
          drillId: b.drillId,
          title: b.title,
          duration: b.duration,
          sets: b.sets,
          reps: b.reps,
          notes: b.notes,
          coachingCues: b.coachingCues,
          keyPoints: b.keyPoints,
          equipment: b.equipment,
          intensity: b.intensity,
          goal: b.goal,
        }))
      );
    }
  }, [existingPlan]);

  const toggleFocusArea = (area: string) => {
    setFocusAreas((prev) => prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]);
  };

  const addBlock = (type: PlanBlock["blockType"]) => {
    const config = BLOCK_TYPE_CONFIG[type];
    setBlocks((prev) => [
      ...prev,
      {
        id: tempId(),
        sortOrder: prev.length,
        blockType: type,
        title: config.label,
        duration: type === "break" ? 5 : 15,
        sets: null,
        reps: null,
        notes: null,
        coachingCues: null,
        keyPoints: null,
        equipment: null,
        intensity: null,
        goal: null,
      },
    ]);
  };

  const updateBlock = (id: string, updates: Partial<PlanBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const removeBlock = (id: string) => setBlocks((prev) => prev.filter((b) => b.id !== id));

  const moveBlock = (id: string, dir: "up" | "down") => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if ((dir === "up" && idx === 0) || (dir === "down" && idx === prev.length - 1)) return prev;
      const next = [...prev];
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const totalDuration = blocks.reduce((sum, b) => sum + b.duration, 0);

  const handleSubmit = () => {
    if (!title.trim()) { toast.error("Please enter a plan title"); return; }
    const payload = {
      title: title.trim(),
      athleteId: selectedAthlete !== "none" ? parseInt(selectedAthlete) : null,
      sessionDate: sessionDate || null,
      duration: totalDuration || 1,
      sessionNotes: sessionNotes || null,
      focusAreas: focusAreas.length > 0 ? focusAreas : null,
      status,
      blocks: blocks.map((b, i) => ({
        sortOrder: i,
        blockType: b.blockType,
        drillId: b.drillId || null,
        title: b.title,
        duration: b.duration,
        sets: b.sets || null,
        reps: b.reps || null,
        notes: b.notes || null,
        coachingCues: b.coachingCues || null,
        keyPoints: b.keyPoints || null,
        equipment: b.equipment || null,
        intensity: b.intensity || null,
        goal: b.goal || null,
      })),
    };

    if (planId) {
      updateMut.mutate({ planId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  if (planId && loadingPlan) return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-muted/60 rounded animate-pulse" />
      <div className="h-64 bg-muted/40 rounded-xl animate-pulse" />
    </div>
  );

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-white/[0.1] text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-2xl font-heading font-bold text-foreground">{planId ? "Edit Plan" : "New Practice Plan"}</h2>
      </div>

      {/* Plan Details Card */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="p-4 sm:p-6 space-y-5">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Plan Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Hitting Mechanics - Joey T"
              className="bg-muted/60 border-border text-foreground placeholder:text-muted-foreground/50 text-lg font-medium" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Athlete</label>
              <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
                <SelectTrigger className="bg-muted/60 border-border text-foreground"><SelectValue placeholder="Select athlete (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific athlete</SelectItem>
                  {athleteOptions.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Session Date</label>
              <Input type="datetime-local" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)}
                className="bg-muted/60 border-border text-foreground" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Status</label>
            <div className="flex flex-wrap gap-2">
              {(["draft", "scheduled", "completed", "cancelled"] as const).map((s) => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${status === s ? "bg-[#DC143C] text-white" : "bg-muted/60 text-muted-foreground hover:text-foreground"}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Focus Areas</label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_AREAS.map((area) => (
                <button key={area} onClick={() => toggleFocusArea(area)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${focusAreas.includes(area) ? "bg-[#DC143C] text-white" : "bg-muted/60 text-muted-foreground hover:text-foreground"}`}>
                  {area}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Session Notes</label>
            <Textarea value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Pre-session notes, goals, things to focus on..." rows={3}
              className="bg-muted/60 border-border text-foreground placeholder:text-muted-foreground/50 resize-none" />
          </div>
        </CardContent>
      </Card>

      {/* Session Blocks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Session Blocks ({blocks.length})</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-3.5 w-3.5" />{totalDuration} min total</div>
        </div>

        {blocks.map((block, idx) => (
          <BlockEditor key={block.id} block={block} index={idx} total={blocks.length}
            onUpdate={(updates) => updateBlock(block.id, updates)} onRemove={() => removeBlock(block.id)}
            onMoveUp={() => moveBlock(block.id, "up")} onMoveDown={() => moveBlock(block.id, "down")} />
        ))}

        <div className="flex flex-wrap gap-2 pt-2">
          {(Object.keys(BLOCK_TYPE_CONFIG) as Array<keyof typeof BLOCK_TYPE_CONFIG>).map((type) => {
            const config = BLOCK_TYPE_CONFIG[type];
            const Icon = config.icon;
            return (
              <button key={type} onClick={() => addBlock(type)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all hover:scale-[1.02] ${config.bg} ${config.color} ${config.border}`}>
                <Icon className="h-3.5 w-3.5" /> {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a]/95 backdrop-blur-xl border-t border-border px-4 py-3 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Button variant="outline" onClick={onCancel} className="bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-muted/60">Cancel</Button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{blocks.length} blocks · {totalDuration} min</span>
            <Button onClick={handleSubmit} disabled={!title.trim() || isSaving} className="bg-[#DC143C] hover:bg-[#B91030] text-white gap-2 min-w-[120px]">
              {isSaving ? <span className="animate-pulse">Saving...</span> : <><Check className="h-4 w-4" />{planId ? "Save Changes" : "Create Plan"}</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Block Editor ────────────────────────────────────────────────────────────

function BlockEditor({ block, index, total, onUpdate, onRemove, onMoveUp, onMoveDown }: {
  block: PlanBlock; index: number; total: number;
  onUpdate: (updates: Partial<PlanBlock>) => void; onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const config = BLOCK_TYPE_CONFIG[block.blockType] || BLOCK_TYPE_CONFIG.custom;
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border transition-all ${config.border} ${config.bg}`}>
      {/* Block header */}
      <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex flex-col gap-0.5 text-muted-foreground/40">
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={index === 0} className="hover:text-muted-foreground disabled:opacity-20"><ChevronUp className="h-3.5 w-3.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={index === total - 1} className="hover:text-muted-foreground disabled:opacity-20"><ChevronDown className="h-3.5 w-3.5" /></button>
        </div>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}><Icon className={`h-4 w-4 ${config.color}`} /></div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground truncate block">{block.title}</span>
          <span className="text-[10px] text-muted-foreground/60">{block.duration} min{block.intensity ? ` · ${block.intensity}` : ""}</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground/40 hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground/40" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/40" />}
      </div>

      {expanded && (
        <div className="px-3 pb-4 space-y-3 border-t border-border/60 pt-3">
          {/* Title + Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground/60 uppercase mb-1 block">Title</label>
              <Input value={block.title} onChange={(e) => onUpdate({ title: e.target.value })} className="bg-muted/60 border-border/60 text-foreground text-sm h-9" />
            </div>
            <div className="w-24">
              <label className="text-[10px] font-medium text-muted-foreground/60 uppercase mb-1 block">Minutes</label>
              <Input type="number" min={1} value={block.duration} onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || 1 })} className="bg-muted/60 border-border/60 text-foreground text-sm h-9" />
            </div>
          </div>

          {/* Drill Library Picker */}
          {block.blockType === "drill" && (
            <div>
              <label className="text-[10px] font-medium text-muted-foreground/60 uppercase mb-1 block">Drill from Library</label>
              <DrillPickerButton currentDrillId={block.drillId || null} onSelect={(drill) => onUpdate({ drillId: drill.id, title: drill.name })} />
            </div>
          )}

          {/* Sets, Reps, Intensity */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground/60 uppercase mb-1 block">Sets</label>
              <Input type="number" min={0} value={block.sets || ""} onChange={(e) => onUpdate({ sets: parseInt(e.target.value) || null })} placeholder="—" className="bg-muted/60 border-border/60 text-foreground text-sm h-9" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground/60 uppercase mb-1 block">Reps</label>
              <Input type="number" min={0} value={block.reps || ""} onChange={(e) => onUpdate({ reps: parseInt(e.target.value) || null })} placeholder="—" className="bg-muted/60 border-border/60 text-foreground text-sm h-9" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground/60 uppercase mb-1 block">Intensity</label>
              <Select value={block.intensity || "none"} onValueChange={(v) => onUpdate({ intensity: v === "none" ? null : v as any })}>
                <SelectTrigger className="bg-muted/60 border-border/60 text-foreground text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground/60 uppercase mb-1 block flex items-center gap-1"><Wrench className="h-3 w-3" /> Equipment</label>
            <Input value={block.equipment || ""} onChange={(e) => onUpdate({ equipment: e.target.value || null })}
              placeholder="e.g., Tee, Batting cage, Cones..." className="bg-muted/60 border-border/60 text-foreground text-sm h-9 placeholder:text-muted-foreground/40" />
          </div>

          {/* Goal */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground/60 uppercase mb-1 block flex items-center gap-1"><Target className="h-3 w-3" /> Block Goal</label>
            <Input value={block.goal || ""} onChange={(e) => onUpdate({ goal: e.target.value || null })}
              placeholder="What should the athlete achieve in this block?" className="bg-muted/60 border-border/60 text-foreground text-sm h-9 placeholder:text-muted-foreground/40" />
          </div>

          {/* Coaching Cues */}
          <div>
            <label className="text-[10px] font-medium text-amber-400/60 uppercase mb-1 block flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Coaching Cues</label>
            <Textarea value={block.coachingCues || ""} onChange={(e) => onUpdate({ coachingCues: e.target.value || null })}
              placeholder="Key verbal cues to give during this drill (e.g., 'Stay back, let it travel, hands inside the ball')"
              rows={2} className="bg-amber-500/5 border-amber-500/10 text-white text-sm resize-none placeholder:text-muted-foreground/40" />
          </div>

          {/* Key Points */}
          <div>
            <label className="text-[10px] font-medium text-[#E8425A]/60 uppercase mb-1 block flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Key Points / What to Watch</label>
            <Textarea value={block.keyPoints || ""} onChange={(e) => onUpdate({ keyPoints: e.target.value || null })}
              placeholder="What to observe and correct (e.g., 'Watch for early hip rotation, head movement off the ball')"
              rows={2} className="bg-[#DC143C]/5 border-[#DC143C]/10 text-white text-sm resize-none placeholder:text-muted-foreground/40" />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground/60 uppercase mb-1 block flex items-center gap-1"><FileText className="h-3 w-3" /> Notes</label>
            <Textarea value={block.notes || ""} onChange={(e) => onUpdate({ notes: e.target.value || null })}
              placeholder="Additional notes, modifications, progressions..." rows={2}
              className="bg-muted/60 border-border/60 text-foreground text-sm resize-none placeholder:text-muted-foreground/40" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Drill Picker Button ─────────────────────────────────────────────────────

function DrillPickerButton({ currentDrillId, onSelect }: { currentDrillId: string | null; onSelect: (drill: DrillItem) => void; }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const allDrills = useAllDrills();
  const currentDrill = currentDrillId ? (allDrills as DrillItem[]).find((d) => d.id === currentDrillId) : null;

  const filtered = useMemo(() => {
    if (!search) return (allDrills as DrillItem[]).slice(0, 20);
    return (allDrills as DrillItem[]).filter((d) => d.name.toLowerCase().includes(search.toLowerCase())).slice(0, 20);
  }, [search, allDrills]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-border/60 text-left hover:bg-muted transition-colors">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
          <span className={`text-sm truncate ${currentDrill ? "text-foreground" : "text-muted-foreground/60"}`}>{currentDrill ? currentDrill.name : "Select from drill library..."}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-[#1a1f2e] border-border text-white max-w-md max-h-[80vh]">
        <DialogHeader><DialogTitle className="font-heading text-foreground">Drill Library</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drills..."
              className="pl-9 bg-muted/60 border-border text-foreground placeholder:text-muted-foreground/60" autoFocus />
          </div>
          <div className="max-h-[50vh] overflow-y-auto space-y-1">
            {filtered.map((drill) => (
              <button key={drill.id} onClick={() => { onSelect(drill); setOpen(false); setSearch(""); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between gap-2 ${currentDrillId === drill.id ? "bg-[#DC143C]/20 text-[#E8425A]" : "hover:bg-muted/60 text-foreground/80"}`}>
                <div className="min-w-0">
                  <span className="text-sm font-medium block truncate">{drill.name}</span>
                  <span className="text-[10px] text-muted-foreground/60">{drill.difficulty} · {drill.duration} · {drill.categories.join(", ")}</span>
                </div>
                {currentDrillId === drill.id && <Check className="h-4 w-4 text-[#E8425A] flex-shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground/60 text-center py-4">No drills found</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


// ─── Calendar View ──────────────────────────────────────────────────────────

function CalendarView({ plans, onBack, onViewPlan, onCreatePlan, onStartSession }: {
  plans: any[];
  onBack: () => void;
  onViewPlan: (id: number) => void;
  onCreatePlan: (date: Date) => void;
  onStartSession: (id: number) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  // Next month padding
  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    calendarDays.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
  }

  // Map plans to dates
  const plansByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    plans.forEach((p) => {
      if (p.sessionDate) {
        const d = new Date(p.sessionDate);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(p);
      }
    });
    return map;
  }, [plans]);

  const getPlansForDate = (date: Date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return plansByDate.get(key) || [];
  };

  const today = new Date();
  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  const isSelected = (date: Date) =>
    selectedDate &&
    date.getFullYear() === selectedDate.getFullYear() &&
    date.getMonth() === selectedDate.getMonth() &&
    date.getDate() === selectedDate.getDate();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const selectedPlans = selectedDate ? getPlansForDate(selectedDate) : [];

  const statusColors: Record<string, string> = {
    draft: "bg-gray-400",
    scheduled: "bg-[#DC143C]",
    completed: "bg-emerald-400",
    cancelled: "bg-red-400",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to list">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <InlineEdit contentKey="coach.planner.schedule" defaultValue="Schedule" as="h2" className="text-2xl font-heading font-bold text-foreground" />
            <p className="text-sm text-muted-foreground">{monthNames[month]} {year}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToToday} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-white/[0.1] transition-colors border border-border">
            Today
          </button>
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" aria-label="Previous month">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" aria-label="Next month">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-card rounded-xl overflow-hidden border border-border">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border/60">
          {dayNames.map((d) => (
            <div key={d} className="px-1 py-2.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayPlans = getPlansForDate(day.date);
            const hasPlans = dayPlans.length > 0;
            const isTodayCell = isToday(day.date);
            const isSelectedCell = isSelected(day.date);

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day.date)}
                className={`
                  relative min-h-[72px] sm:min-h-[90px] p-1 sm:p-1.5 border-b border-r border-border/40 text-left transition-all
                  ${!day.isCurrentMonth ? "opacity-30" : ""}
                  ${isSelectedCell ? "bg-[#DC143C]/10 ring-1 ring-inset ring-[#DC143C]/30" : "hover:bg-muted/30"}
                  ${isTodayCell ? "bg-muted/30" : ""}
                `}
                aria-label={`${day.date.toLocaleDateString()}, ${dayPlans.length} sessions`}
              >
                {/* Date number */}
                <span className={`
                  inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium
                  ${isTodayCell ? "bg-[#DC143C] text-white font-bold" : day.isCurrentMonth ? "text-foreground/80" : "text-muted-foreground/40"}
                `}>
                  {day.date.getDate()}
                </span>

                {/* Plan indicators */}
                {hasPlans && (
                  <div className="mt-0.5 space-y-0.5">
                    {dayPlans.slice(0, 3).map((p: any) => (
                      <div key={p.id} className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] sm:text-[10px] truncate bg-muted/40">
                        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${statusColors[p.status] || "bg-gray-400"}`} />
                        <span className="truncate text-muted-foreground hidden sm:inline">{p.title}</span>
                        <span className="truncate text-muted-foreground sm:hidden">{p.title.slice(0, 8)}</span>
                      </div>
                    ))}
                    {dayPlans.length > 3 && (
                      <span className="text-[9px] text-muted-foreground/60 px-1">+{dayPlans.length - 3} more</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Detail */}
      {selectedDate && (
        <div className="glass-card rounded-xl p-4 border border-border animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-heading font-bold text-foreground">
              {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
            <Button
              size="sm"
              onClick={() => onCreatePlan(selectedDate)}
              className="bg-[#DC143C] hover:bg-[#B91030] text-white gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> New Session
            </Button>
          </div>

          {selectedPlans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground/60">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No sessions scheduled</p>
              <p className="text-xs mt-1">Click "New Session" to plan one</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedPlans.map((plan: any) => {
                const focusAreas = parseFocusAreas(plan.focusAreas);
                return (
                  <div
                    key={plan.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/60 hover:bg-muted/60 transition-colors group"
                  >
                    {/* Status dot */}
                    <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${statusColors[plan.status] || "bg-gray-400"}`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{plan.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {plan.athleteName && (
                          <span className="text-[10px] text-muted-foreground">{plan.athleteName}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground/60">{plan.duration} min</span>
                        {focusAreas.slice(0, 2).map((fa: string) => (
                          <span key={fa} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">{fa}</span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); onStartSession(plan.id); }}
                        className="p-1.5 rounded-md hover:bg-green-500/20 text-green-400 transition-colors"
                        aria-label="Start session"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onViewPlan(plan.id); }}
                        className="p-1.5 rounded-md hover:bg-[#B91030]/20 text-[#E8425A] transition-colors"
                        aria-label="View plan details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground/60 px-1">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-400" /> Draft</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#DC143C]" /> Scheduled</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Completed</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" /> Cancelled</span>
      </div>
    </div>
  );
}
