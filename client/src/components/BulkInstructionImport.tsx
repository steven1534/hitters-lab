import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface BulkImportResult {
  drillName: string;
  success: boolean;
  error?: string;
}

export function BulkInstructionImport() {
  const [pastedContent, setPastedContent] = useState("");
  const [results, setResults] = useState<BulkImportResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const bulkUpdateMutation = trpc.drillDetails.bulkUpdateInstructions.useMutation({
    onSuccess: (data) => {
      setResults(data.results);
      setShowResults(true);
      setPastedContent("");
    },
    onError: (error) => {
      setResults([
        {
          drillName: "Bulk Import",
          success: false,
          error: error.message || "Failed to import instructions",
        },
      ]);
      setShowResults(true);
    },
  });

  const handleImport = () => {
    if (!pastedContent.trim()) {
      alert("Please paste instruction content");
      return;
    }

    setIsProcessing(true);
    
    // Parse the pasted content
    const lines = pastedContent.split("\n").filter((line) => line.trim());
    const instructionMap: Record<string, string> = {};
    
    let currentDrill = "";
    let currentInstructions: string[] = [];

    for (const line of lines) {
      // Check if this line is a drill name (starts with "Drill:" or is followed by instructions)
      if (line.match(/^Drill:\s*(.+)$/i)) {
        // Save previous drill if exists
        if (currentDrill && currentInstructions.length > 0) {
          instructionMap[currentDrill] = currentInstructions.join("\n").trim();
        }
        
        // Start new drill
        const match = line.match(/^Drill:\s*(.+)$/i);
        currentDrill = match?.[1]?.trim() || "";
        currentInstructions = [];
      } else if (line.match(/^---+$/)) {
        // Separator line - save current drill
        if (currentDrill && currentInstructions.length > 0) {
          instructionMap[currentDrill] = currentInstructions.join("\n").trim();
        }
        currentDrill = "";
        currentInstructions = [];
      } else if (currentDrill) {
        // Add to current drill's instructions
        currentInstructions.push(line);
      } else {
        // First drill without "Drill:" prefix - treat as drill name
        if (!currentDrill && line.trim()) {
          currentDrill = line.trim();
        }
      }
    }

    // Don't forget the last drill
    if (currentDrill && currentInstructions.length > 0) {
      instructionMap[currentDrill] = currentInstructions.join("\n").trim();
    }

    // Call mutation with parsed data
    bulkUpdateMutation.mutate({
      instructions: instructionMap,
    });

    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Instructions
          </CardTitle>
          <CardDescription>
            Paste instructions for multiple drills at once. Use the format below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Format Instructions */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">Supported Formats:</h4>
            <div className="text-sm space-y-2 font-mono">
              <p className="text-muted-foreground">
                <strong>Format 1: Drill name followed by instructions</strong>
              </p>
              <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
{`1-2-3 Drill
Start with the bat on your shoulder. Watch the pitcher's release. Swing on the first pitch.

1-2-3 Rhythm Tee
Position yourself in the batter's box. Tee the ball at chest height. Take three practice swings.

---

Back Foot Cone Tee
Place cone behind back foot. Focus on hip rotation. Keep hands inside the ball.`}
              </pre>

              <p className="text-muted-foreground mt-4">
                <strong>Format 2: Using "Drill:" prefix</strong>
              </p>
              <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
{`Drill: 1-2-3 Drill
Start with the bat on your shoulder.
Watch the pitcher's release.
Swing on the first pitch.

Drill: Back Foot Cone Tee
Place cone behind back foot.
Focus on hip rotation.
Keep hands inside the ball.`}
              </pre>
            </div>
          </div>

          {/* Paste Area */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Paste Instructions</label>
            <textarea
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              placeholder="Paste your drill instructions here..."
              className="w-full h-64 p-3 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={isProcessing || !pastedContent.trim()}
            className="w-full"
            size="lg"
          >
            {isProcessing ? "Importing..." : "Import Instructions"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {showResults && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    result.success ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${result.success ? "text-green-900" : "text-red-900"}`}>
                      {result.drillName}
                    </p>
                    {result.error && (
                      <p className="text-sm text-red-700">{result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Tips:</strong> Drill names must match existing drills exactly (case-insensitive). Use "---" to separate drills if not using "Drill:" prefix. Each drill can have multiple lines of instructions.
        </AlertDescription>
      </Alert>
    </div>
  );
}
