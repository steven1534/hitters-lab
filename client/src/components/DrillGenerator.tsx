import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Copy, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface GeneratedDrill {
  name: string;
  goal: string;
  difficulty: "Easy" | "Medium" | "Hard";
  duration: string;
  skillSet: string;
  instructions: string;
  equipment?: string;
  tips?: string;
}

export default function DrillGenerator() {
  const [issue, setIssue] = useState("");
  const [skillLevel, setSkillLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [generatedDrill, setGeneratedDrill] = useState<GeneratedDrill | null>(null);
  const [copied, setCopied] = useState(false);

  const generateMutation = trpc.drillGenerator.generateDrill.useMutation({
    onSuccess: (data) => {
      setGeneratedDrill(data.drill);
      toast.success("Drill generated successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate drill");
    },
  });

  const handleGenerate = async () => {
    if (!issue.trim()) {
      toast.error("Please describe the issue or skill gap");
      return;
    }

    generateMutation.mutate({
      issue: issue.trim(),
      skillLevel,
    });
  };

  const handleCopyDrill = () => {
    if (!generatedDrill) return;

    const drillText = `
Drill: ${generatedDrill.name}
Goal: ${generatedDrill.goal}
Difficulty: ${generatedDrill.difficulty}
Duration: ${generatedDrill.duration}
Skill Set: ${generatedDrill.skillSet}
${generatedDrill.equipment ? `Equipment: ${generatedDrill.equipment}\n` : ""}
Instructions:
${generatedDrill.instructions}
${generatedDrill.tips ? `\nTips:\n${generatedDrill.tips}` : ""}
    `.trim();

    navigator.clipboard.writeText(drillText);
    setCopied(true);
    toast.success("Drill copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "Hard":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Drill Generator
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Describe a baseball issue or skill gap, and our AI coach will generate a custom drill to fix it.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Issue Input */}
          <div>
            <label className="text-sm font-semibold text-muted-foreground mb-2 block">
              What's the issue or skill gap?
            </label>
            <Textarea
              placeholder="e.g., 'Players are dropping their hands during the swing', 'Struggling with footwork on ground balls', 'Can't throw accurately from the outfield'"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              className="min-h-24 resize-none"
            />
          </div>

          {/* Skill Level Select */}
          <div>
            <label className="text-sm font-semibold text-muted-foreground mb-2 block">
              Player Skill Level
            </label>
            <Select value={skillLevel} onValueChange={(val: any) => setSkillLevel(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !issue.trim()}
            className="w-full"
            size="lg"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating drill...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Drill
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Drill Display */}
      {generatedDrill && (
        <Card className="border-2 border-green-200 dark:border-green-900/50">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{generatedDrill.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{generatedDrill.goal}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyDrill}
                className="ml-4"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Metadata Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className={getDifficultyColor(generatedDrill.difficulty)}>
                {generatedDrill.difficulty}
              </Badge>
              <Badge variant="outline">{generatedDrill.duration}</Badge>
              <Badge variant="secondary">{generatedDrill.skillSet}</Badge>
            </div>

            {/* Equipment */}
            {generatedDrill.equipment && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Equipment Needed</h4>
                <p className="text-sm text-muted-foreground">{generatedDrill.equipment}</p>
              </div>
            )}

            {/* Instructions */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Step-by-Step Instructions</h4>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                {generatedDrill.instructions.split("\n").map((line, idx) => (
                  <p key={idx} className="text-sm leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
            </div>

            {/* Tips */}
            {generatedDrill.tips && (
              <div>
                <h4 className="font-semibold text-sm mb-3">Coach Tips & Common Mistakes</h4>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg space-y-2">
                  {generatedDrill.tips.split("\n").map((line, idx) => (
                    <p key={idx} className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedDrill(null);
                  setIssue("");
                }}
                className="flex-1"
              >
                Generate Another
              </Button>
              <Button className="flex-1">
                Save to Drills Library
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
