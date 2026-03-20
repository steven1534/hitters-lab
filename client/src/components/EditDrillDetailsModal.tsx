import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface EditDrillDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drillId: string;
  drillName: string;
  onSuccess?: () => void;
}

export function EditDrillDetailsModal({
  open,
  onOpenChange,
  drillId,
  drillName,
  onSuccess,
}: EditDrillDetailsModalProps) {
  const [formData, setFormData] = useState({
    skillSet: "",
    difficulty: "Medium",
    athletes: "",
    time: "",
    equipment: "",
    goal: "",
    description: [""],
    commonMistakes: [""],
    progressions: [""],
  });

  // Load existing drill details
  const { data: existingDetails } = trpc.drillDetails.getDrillDetail.useQuery(
    { drillId },
    { enabled: open }
  );

  // Pre-populate form with existing details
  useEffect(() => {
    if (existingDetails) {
      setFormData({
        skillSet: existingDetails.skillSet || "",
        difficulty: existingDetails.difficulty || "Medium",
        athletes: existingDetails.athletes || "",
        time: existingDetails.time || "",
        equipment: existingDetails.equipment || "",
        goal: existingDetails.goal || "",
        description: existingDetails.description || [""],
        commonMistakes: existingDetails.commonMistakes || [""],
        progressions: existingDetails.progressions || [""],
      });
    }
  }, [existingDetails]);

  const saveMutation = trpc.drillDetails.saveDrillInstructions.useMutation({
    onSuccess: () => {
      alert("Drill details updated successfully!");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      alert("Error: " + (error.message || "Failed to save drill details"));
    },
  });

  const handleSave = () => {
    if (!formData.goal || !formData.skillSet) {
      alert("Please fill in all required fields");
      return;
    }

    saveMutation.mutate({
      drillId,
      skillSet: formData.skillSet,
      difficulty: formData.difficulty,
      athletes: formData.athletes,
      time: formData.time,
      equipment: formData.equipment,
      goal: formData.goal,
      description: formData.description.filter(d => d.trim()),
      commonMistakes: formData.commonMistakes.filter(m => m.trim()),
      progressions: formData.progressions.filter(p => p.trim()),
    });
  };

  const addField = (field: "description" | "commonMistakes" | "progressions") => {
    setFormData({
      ...formData,
      [field]: [...formData[field], ""],
    });
  };

  const removeField = (field: "description" | "commonMistakes" | "progressions", index: number) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index),
    });
  };

  const updateField = (field: "description" | "commonMistakes" | "progressions", index: number, value: string) => {
    const updated = [...formData[field]];
    updated[index] = value;
    setFormData({
      ...formData,
      [field]: updated,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Drill Details: {drillName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="goal">Goal / Title *</Label>
              <Input
                id="goal"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                placeholder="e.g., Improve batting stance"
              />
            </div>
            <div>
              <Label htmlFor="skillSet">Skill Set *</Label>
              <Input
                id="skillSet"
                value={formData.skillSet}
                onChange={(e) => setFormData({ ...formData, skillSet: e.target.value })}
                placeholder="e.g., Hitting"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                placeholder="e.g., 10 minutes"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="athletes">Athletes</Label>
              <Input
                id="athletes"
                value={formData.athletes}
                onChange={(e) => setFormData({ ...formData, athletes: e.target.value })}
                placeholder="e.g., 1-4 athletes"
              />
            </div>
            <div>
              <Label htmlFor="equipment">Equipment</Label>
              <Input
                id="equipment"
                value={formData.equipment}
                onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                placeholder="e.g., Baseballs, bats, gloves"
              />
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Step-by-Step Instructions *</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addField("description")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Step
              </Button>
            </div>
            <div className="space-y-2">
              {formData.description.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Textarea
                      value={step}
                      onChange={(e) => updateField("description", index, e.target.value)}
                      placeholder={`Step ${index + 1}...`}
                      className="min-h-20"
                    />
                  </div>
                  {formData.description.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeField("description", index)}
                      className="mt-1"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Common Mistakes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Common Mistakes</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addField("commonMistakes")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Mistake
              </Button>
            </div>
            <div className="space-y-2">
              {formData.commonMistakes.map((mistake, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Textarea
                      value={mistake}
                      onChange={(e) => updateField("commonMistakes", index, e.target.value)}
                      placeholder="Describe a common mistake..."
                      className="min-h-16"
                    />
                  </div>
                  {formData.commonMistakes.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeField("commonMistakes", index)}
                      className="mt-1"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Progressions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Progressions</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addField("progressions")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Progression
              </Button>
            </div>
            <div className="space-y-2">
              {formData.progressions.map((progression, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Textarea
                      value={progression}
                      onChange={(e) => updateField("progressions", index, e.target.value)}
                      placeholder="Describe a progression or variation..."
                      className="min-h-16"
                    />
                  </div>
                  {formData.progressions.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeField("progressions", index)}
                      className="mt-1"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
