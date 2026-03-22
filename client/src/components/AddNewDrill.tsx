import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function AddNewDrill() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drillName, setDrillName] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [category, setCategory] = useState("Hitting");
  const [duration, setDuration] = useState("10m");
  const [goal, setGoal] = useState("");
  const [instructions, setInstructions] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const utils = trpc.useUtils();
  const createDrillMutation = trpc.drillDetails.createNewDrill.useMutation();

  const handleSave = () => {
    if (!drillName.trim()) {
      toast.error("Please enter a drill name");
      return;
    }

    createDrillMutation.mutate(
      {
        name: drillName.trim(),
        difficulty,
        category,
        duration,
        goal: goal.trim(),
        instructions: instructions.trim(),
        videoUrl: videoUrl.trim(),
      },
      {
        onSuccess: () => {
          toast.success(`Drill "${drillName}" created successfully!`);
          handleReset();
          setDialogOpen(false);
          utils.drillDetails.getCustomDrills.invalidate();
        },
        onError: (error: any) => {
          toast.error(error.message || "Failed to create drill");
        },
      }
    );
  };

  const handleReset = () => {
    setDrillName("");
    setDifficulty("Medium");
    setCategory("Hitting");
    setDuration("10m");
    setGoal("");
    setInstructions("");
    setVideoUrl("");
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Drill
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Drill
          </DialogTitle>
          <DialogDescription>
            Add a completely new drill to the directory with all details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drill Name */}
          <div className="space-y-2">
            <Label htmlFor="drillName">Drill Name *</Label>
            <Input
              id="drillName"
              placeholder="e.g., 3-Plate Adjustment Drill"
              value={drillName}
              onChange={(e) => setDrillName(e.target.value)}
            />
          </div>

          {/* Row: Difficulty, Category, Duration */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hitting">Hitting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5m">5 min</SelectItem>
                  <SelectItem value="10m">10 min</SelectItem>
                  <SelectItem value="15m">15 min</SelectItem>
                  <SelectItem value="20m">20 min</SelectItem>
                  <SelectItem value="30m">30 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Goal */}
          <div className="space-y-2">
            <Label htmlFor="goal">Goal</Label>
            <Textarea
              id="goal"
              placeholder="What is the main objective of this drill?"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              placeholder="Step-by-step instructions for performing this drill..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
            />
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label htmlFor="videoUrl">YouTube Video URL (optional)</Label>
            <Input
              id="videoUrl"
              placeholder="https://youtu.be/... or https://youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={createDrillMutation.isPending || !drillName.trim()}
          >
            {createDrillMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Drill"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
