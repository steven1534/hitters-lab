/**
 * EditableStatBar — DB-backed version
 * Reads/writes stat cards via tRPC drillDetails.getStatCards / saveStatCards.
 * Falls back to defaultCards when no DB records exist yet.
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Plus, Trash2, ChevronUp, ChevronDown,
  Clock, Users, Dumbbell, Target, Zap, Star, Hash,
  Pencil, Check, X
} from "lucide-react";
import { toast } from "sonner";

export interface StatCard {
  id: string;
  label: string;
  value: string;
  icon?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  clock: Clock, users: Users, dumbbell: Dumbbell,
  target: Target, zap: Zap, star: Star, hash: Hash,
};
const ICON_COLORS: Record<string, string> = {
  clock: "text-[#E8425A]", users: "text-purple-400", dumbbell: "text-amber-400",
  target: "text-green-400", zap: "text-yellow-400", star: "text-blue-400", hash: "text-teal-400",
};
const DEFAULT_ICONS = ["clock", "users", "dumbbell", "target", "zap", "star", "hash"];

function getNextIcon(existing: StatCard[]): string {
  const used = existing.map((c) => c.icon || "hash");
  return DEFAULT_ICONS.find((i) => !used.includes(i)) || "hash";
}

interface EditableStatBarProps {
  drillId: string;
  defaultCards: StatCard[];
  isCoach: boolean;
}

export function EditableStatBar({ drillId, defaultCards, isCoach }: EditableStatBarProps) {
  const [cards, setCards] = useState<StatCard[]>(defaultCards);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  // Load from DB
  const { data: dbCards } = trpc.drillDetails.getStatCards.useQuery({ drillId });
  const utils = trpc.useUtils();
  const saveMutation = trpc.drillDetails.saveStatCards.useMutation({
    onSuccess: () => {
      utils.drillDetails.getStatCards.invalidate({ drillId });
      toast.success("Stats saved");
    },
    onError: () => toast.error("Failed to save stats"),
  });

  // Sync DB cards into local state once loaded
  useEffect(() => {
    if (dbCards && dbCards.length > 0) {
      setCards(
        dbCards.map((c) => ({
          id: String(c.id),
          label: c.label,
          value: c.value,
          icon: c.icon ?? "hash",
        }))
      );
    }
  }, [dbCards]);

  const persistCards = (updated: StatCard[]) => {
    saveMutation.mutate({
      drillId,
      cards: updated.map((c, i) => ({
        label: c.label,
        value: c.value,
        icon: c.icon ?? "hash",
        position: i,
        isVisible: 1,
      })),
    });
  };

  const startEdit = (card: StatCard) => {
    setEditingId(card.id);
    setEditLabel(card.label);
    setEditValue(card.value);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const updated = cards.map((c) =>
      c.id === editingId
        ? { ...c, label: editLabel.trim() || c.label, value: editValue.trim() || c.value }
        : c
    );
    setCards(updated);
    setEditingId(null);
    persistCards(updated);
  };

  const cancelEdit = () => setEditingId(null);

  const addCard = () => {
    const newCard: StatCard = {
      id: `new-${Date.now()}`,
      label: "New Stat",
      value: "—",
      icon: getNextIcon(cards),
    };
    const updated = [...cards, newCard];
    setCards(updated);
    startEdit(newCard);
  };

  const removeCard = (id: string) => {
    const updated = cards.filter((c) => c.id !== id);
    setCards(updated);
    persistCards(updated);
    toast.success("Stat card removed");
  };

  const moveCard = (index: number, direction: "up" | "down") => {
    const next = [...cards];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCards(next);
    persistCards(next);
  };

  const resetToDefault = () => {
    setCards(defaultCards);
    persistCards(defaultCards);
    toast.success("Reset to default stats");
  };

  const colCount = Math.min(Math.max(cards.length, 2), 6);

  return (
    <div className="space-y-3">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${Math.min(colCount, 4)}, minmax(0, 1fr))` }}
      >
        {cards.map((card, index) => {
          const IconComp = ICON_MAP[card.icon || "hash"] || Hash;
          const iconColor = ICON_COLORS[card.icon || "hash"] || "text-muted-foreground";
          const isEditing = editingId === card.id;

          return (
            <div key={card.id} className="glass-card rounded-xl p-3 md:p-4 relative group">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Label"
                    className="h-6 text-[10px] uppercase font-semibold bg-transparent border-b border-border rounded-none px-0 focus-visible:ring-0"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }}
                  />
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Value"
                    className="h-7 text-sm font-bold bg-transparent border-b border-border rounded-none px-0 focus-visible:ring-0"
                    onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }}
                  />
                  <div className="flex gap-1 mt-1">
                    <button onClick={commitEdit} className="p-1 rounded hover:bg-green-500/20 text-green-400"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={cancelEdit} className="p-1 rounded hover:bg-red-500/20 text-red-400"><X className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-1">
                    <IconComp className={`h-3.5 w-3.5 ${iconColor}`} />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{card.label}</span>
                  </div>
                  <div className="font-bold text-foreground text-sm md:text-base leading-tight">{card.value}</div>
                  {isCoach && isEditMode && (
                    <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => moveCard(index, "up")} disabled={index === 0} className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30" title="Move left"><ChevronUp className="h-3 w-3" /></button>
                      <button onClick={() => moveCard(index, "down")} disabled={index === cards.length - 1} className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30" title="Move right"><ChevronDown className="h-3 w-3" /></button>
                      <button onClick={() => startEdit(card)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Edit"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => removeCard(card.id)} className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400" title="Remove"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {isCoach && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsEditMode(!isEditMode)} className={`h-7 text-xs gap-1.5 ${isEditMode ? "text-secondary" : "text-muted-foreground"}`}>
            <Pencil className="h-3 w-3" />
            {isEditMode ? "Done Editing" : "Edit Stats"}
          </Button>
          {isEditMode && (
            <>
              <Button variant="ghost" size="sm" onClick={addCard} className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                <Plus className="h-3 w-3" /> Add Stat
              </Button>
              <Button variant="ghost" size="sm" onClick={resetToDefault} className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-red-400">
                <X className="h-3 w-3" /> Reset
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
