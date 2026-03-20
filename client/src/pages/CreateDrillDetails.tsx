import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { ArrowLeft, Plus, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

import drillsData from "@/data/drills";

export default function CreateDrillDetails() {
  const [selectedDrill, setSelectedDrill] = useState<string>("");
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

  const saveMutation = trpc.drillDetails.saveDrillInstructions.useMutation({
    onSuccess: () => {
      alert("Drill details saved successfully!");
      setSelectedDrill("");
      setFormData({
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
    },
    onError: (error) => {
      alert("Error: " + (error.message || "Failed to save drill details"));
    },
  });

  const handleSave = () => {
    if (!selectedDrill) {
      alert("Please select a drill");
      return;
    }

    if (!formData.goal || !formData.skillSet) {
      alert("Please fill in all required fields");
      return;
    }

    saveMutation.mutate({
      drillId: selectedDrill,
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

  const selectedDrillData = drillsData.find(d => d.id === selectedDrill);

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="container max-w-4xl py-8">
        <Link href="/coach-dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="grid gap-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Create Drill Details</h1>
            <p className="text-muted-foreground">
              Create detailed instructions and coaching content for drills. This content will appear on the drill detail pages.
            </p>
          </div>

          {/* Drill Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Drill</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="drill-select" className="mb-2 block">
                Drill *
              </Label>
              <Select value={selectedDrill} onValueChange={setSelectedDrill}>
                <SelectTrigger id="drill-select">
                  <SelectValue placeholder="Select a drill..." />
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  {drillsData.map(drill => (
                    <SelectItem key={drill.id} value={drill.id}>
                      {drill.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDrillData && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: <strong>{selectedDrillData.name}</strong> ({selectedDrillData.difficulty})
                </p>
              )}
            </CardContent>
          </Card>

          {/* Form */}
          {selectedDrill && (
            <Card>
              <CardHeader>
                <CardTitle>Drill Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
                      placeholder="e.g., Hitting, Infield, Pitching"
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

                {/* Save Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="flex-1"
                  >
                    {saveMutation.isPending ? "Saving..." : "Save Drill Details"}
                  </Button>
                  <Link href="/coach-dashboard">
                    <Button variant="outline" className="flex-1">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
