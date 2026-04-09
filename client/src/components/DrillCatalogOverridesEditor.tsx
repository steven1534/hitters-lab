import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import drillsData from "@/data/drills";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Database, Trash2 } from "lucide-react";

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

function splitList(s: string): string[] | null {
  const parts = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length ? parts : null;
}

export function DrillCatalogOverridesEditor() {
  const utils = trpc.useUtils();
  const { data: customDrills = [] } = trpc.drillDetails.getCustomDrills.useQuery();

  const [drillId, setDrillId] = useState<string>("");
  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [duration, setDuration] = useState("");
  const [categoriesCsv, setCategoriesCsv] = useState("");
  const [tagsCsv, setTagsCsv] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [hidden, setHidden] = useState(false);

  const drillOptions = useMemo(() => {
    const builtIn = drillsData.map((d) => ({
      id: String(d.id),
      label: `${d.name} (built-in)`,
    }));
    const custom = customDrills.map((cd: { drillId: string; name: string }) => ({
      id: cd.drillId,
      label: `${cd.name} (custom)`,
    }));
    return [...builtIn, ...custom].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    );
  }, [customDrills]);

  const staticRef = useMemo(
    () => (drillId ? drillsData.find((d) => String(d.id) === drillId) : undefined),
    [drillId]
  );

  const { data: loadedRow, refetch: refetchRow, isFetching } = trpc.drillCatalog.get.useQuery(
    { drillId },
    { enabled: !!drillId }
  );

  useEffect(() => {
    if (!drillId) return;
    const r = loadedRow;
    setName(r?.name ?? "");
    setDifficulty(r?.difficulty ?? "");
    setDuration(r?.duration ?? "");
    setCategoriesCsv(r?.categories?.join(", ") ?? "");
    setTagsCsv((r?.tags ?? []).join(", "));
    setExternalUrl(r?.externalUrl ?? "");
    setHidden((r?.hiddenFromDirectory ?? 0) === 1);
  }, [drillId, loadedRow]);

  const upsertMutation = trpc.drillCatalog.upsert.useMutation({
    onSuccess: async () => {
      toast.success("Catalog override saved");
      await utils.drillCatalog.getAll.invalidate();
      await utils.drillCatalog.get.invalidate({ drillId });
      refetchRow();
    },
    onError: (e) => toast.error(e.message || "Save failed"),
  });

  const deleteMutation = trpc.drillCatalog.delete.useMutation({
    onSuccess: async () => {
      toast.success("Override removed — using built-in/custom defaults");
      setName("");
      setDifficulty("");
      setDuration("");
      setCategoriesCsv("");
      setTagsCsv("");
      setExternalUrl("");
      setHidden(false);
      await utils.drillCatalog.getAll.invalidate();
      await utils.drillCatalog.get.invalidate({ drillId });
      refetchRow();
    },
    onError: (e) => toast.error(e.message || "Delete failed"),
  });

  const handleSave = () => {
    if (!drillId) {
      toast.error("Select a drill");
      return;
    }
    upsertMutation.mutate({
      drillId,
      name: name.trim() || null,
      difficulty: difficulty.trim() || null,
      categories: splitList(categoriesCsv),
      duration: duration.trim() || null,
      tags: splitList(tagsCsv),
      externalUrl: externalUrl.trim() || null,
      hiddenFromDirectory: hidden ? 1 : 0,
    });
  };

  return (
    <Card className="border-white/[0.08] bg-white/[0.02]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5 text-[#E8425A]" />
          Catalog overrides (Phase 1)
        </CardTitle>
        <CardDescription>
          Override display name, difficulty, categories, duration, tags, or external URL for any drill id
          without changing code. Leave fields empty to keep the built-in or custom default. Same{" "}
          <code className="text-xs bg-white/10 px-1 rounded">drillId</code> everywhere — links stay valid.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Drill</Label>
          <Select
            value={drillId || undefined}
            onValueChange={(v) => setDrillId(v)}
          >
            <SelectTrigger className="bg-white/[0.04] border-white/[0.08]">
              <SelectValue placeholder="Choose a drill…" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {drillOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {staticRef && (
          <p className="text-xs text-muted-foreground rounded-lg bg-white/[0.04] px-3 py-2 border border-white/[0.06]">
            Built-in defaults:{" "}
            <span className="text-foreground/90 font-medium">{staticRef.name}</span> ·{" "}
            {staticRef.difficulty} · {staticRef.categories.join(", ")} · {staticRef.duration}
          </p>
        )}

        {drillId && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ov-name">Display name override</Label>
                <Input
                  id="ov-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Empty = use default"
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty override</Label>
                <Select
                  value={difficulty || "__none__"}
                  onValueChange={(v) => setDifficulty(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08]">
                    <SelectValue placeholder="Use default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Use default</SelectItem>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ov-dur">Duration override</Label>
                <Input
                  id="ov-dur"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 10m"
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ov-url">External URL override</Label>
                <Input
                  id="ov-url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="USA Baseball or YouTube link"
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ov-cat">Categories (comma-separated)</Label>
              <Input
                id="ov-cat"
                value={categoriesCsv}
                onChange={(e) => setCategoriesCsv(e.target.value)}
                placeholder="Hitting, Tee Work"
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ov-tags">Tags (comma-separated)</Label>
              <Input
                id="ov-tags"
                value={tagsCsv}
                onChange={(e) => setTagsCsv(e.target.value)}
                placeholder="timing, barrel path"
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/[0.08] px-3 py-2">
              <div>
                <p className="text-sm font-medium">Hide from directory lists</p>
                <p className="text-xs text-muted-foreground">
                  Drill page URL still works; hidden drills won’t appear in merged drill pickers.
                </p>
              </div>
              <Switch checked={hidden} onCheckedChange={setHidden} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={handleSave}
                disabled={upsertMutation.isPending || isFetching}
                className="bg-[#DC143C] hover:bg-[#DC143C]/90"
              >
                {upsertMutation.isPending ? "Saving…" : "Save override"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                disabled={deleteMutation.isPending || !loadedRow}
                onClick={() => drillId && deleteMutation.mutate({ drillId })}
              >
                <Trash2 className="h-4 w-4" />
                Remove all overrides
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
