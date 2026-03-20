import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DrillData {
  drillName: string;
  description?: string;
  goal?: string;
}

export function BulkImportDrills() {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const bulkImportDescriptionsMutation = trpc.admin.bulkImportDescriptions.useMutation();
  const bulkImportGoalsMutation = trpc.admin.bulkImportGoals.useMutation();

  const handleImport = async () => {
    setIsImporting(true);
    setProgress(0);
    setResults(null);

    try {
      // Fetch the parsed data from the server
      const [descriptionsRes, goalsRes] = await Promise.all([
        fetch("/drill_descriptions.json"),
        fetch("/drill_goals.json"),
      ]);

      if (!descriptionsRes.ok || !goalsRes.ok) {
        throw new Error("Failed to load backup files");
      }

      const descriptions: DrillData[] = await descriptionsRes.json();
      const goals: DrillData[] = await goalsRes.json();

      setProgress(25);

      // Import descriptions
      const descResult = await bulkImportDescriptionsMutation.mutateAsync({
        drillsData: descriptions.map((d) => ({
          drillName: d.drillName,
          description: d.description || "",
        })),
      });

      setProgress(50);

      // Import goals
      const goalResult = await bulkImportGoalsMutation.mutateAsync({
        goalsData: goals.map((g) => ({
          drillName: g.drillName,
          goal: g.goal || "",
        })),
      });

      setProgress(100);

      const totalSuccess = descResult.success + goalResult.success;
      const totalFailed = descResult.failed + goalResult.failed;
      const allErrors = [...(descResult.errors || []), ...(goalResult.errors || [])];

      setResults({
        success: totalSuccess,
        failed: totalFailed,
        errors: allErrors,
      });

      if (totalFailed === 0) {
        toast.success(`Successfully imported ${totalSuccess} drills!`);
      } else {
        toast.warning(`Imported ${totalSuccess} drills with ${totalFailed} failures`);
      }
    } catch (error) {
      toast.error(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setResults({
        success: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Import Drills
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Import Drill Data</DialogTitle>
          <DialogDescription>
            Import drill descriptions and goals from backup files to restore all 72+ drills.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!results ? (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will import drill descriptions and goals from the backup files. Existing drills will be updated.
                </AlertDescription>
              </Alert>

              {isImporting && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Importing drills...</p>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">{progress}% complete</p>
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="w-full"
              >
                {isImporting ? "Importing..." : "Start Import"}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">Import Complete</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">{results.success}</div>
                    <p className="text-xs text-muted-foreground">Drills Imported</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className={`text-2xl font-bold ${results.failed > 0 ? "text-red-600" : "text-green-600"}`}>
                      {results.failed}
                    </div>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </CardContent>
                </Card>
              </div>

              {results.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Errors encountered:</p>
                      <ul className="text-xs space-y-1">
                        {results.errors.slice(0, 5).map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                        {results.errors.length > 5 && (
                          <li>• ... and {results.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={() => {
                  setIsOpen(false);
                  setResults(null);
                  setProgress(0);
                }}
                className="w-full"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
