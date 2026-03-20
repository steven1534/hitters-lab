import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface BulkGoalUploadProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkGoalUpload({ isOpen, onClose }: BulkGoalUploadProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Array<{ drillName: string; success: boolean; error?: string }> | null>(null);

  const bulkUpdateGoals = trpc.drillDetails.bulkUpdateGoals.useMutation();

  const handleUpload = async () => {
    if (!input.trim()) {
      alert('Please paste drill goals');
      return;
    }

    setIsLoading(true);
    try {
      // Parse the input: each line should be "Drill Name | Goal"
      const lines = input.split('\n').filter(line => line.trim());
      const goals: Record<string, string> = {};

      for (const line of lines) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length === 2) {
          const [drillName, goal] = parts;
          if (drillName && goal) {
            goals[drillName] = goal;
          }
        }
      }

      if (Object.keys(goals).length === 0) {
        alert('No valid drill goals found. Please use format: "Drill Name | Goal"');
        setIsLoading(false);
        return;
      }

      const response = await bulkUpdateGoals.mutateAsync({ goals });
      setResults(response.results);
    } catch (error) {
      console.error('Error uploading goals:', error);
      alert('Failed to upload goals. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const successCount = results?.filter(r => r.success).length || 0;
  const failureCount = results?.filter(r => !r.success).length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Drill Goals</DialogTitle>
          <DialogDescription>
            Paste drill goals in the format: "Drill Name | Goal"
            <br />
            One drill per line. Example:
            <br />
            <code className="text-xs bg-muted p-1 rounded">
              1-2-3 Drill | Understand zones and hitting the ball where the zone dictates
            </code>
          </DialogDescription>
        </DialogHeader>

        {!results ? (
          <div className="space-y-4">
            <Textarea
              placeholder={`1-2-3 Drill | Understand zones and hitting the ball where the zone dictates
Angle Flips | Develop quick hands and proper footwork for infield flips
Back Foot Cone Tee | Improve back foot mechanics and balance`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={isLoading || !input.trim()}
                className="flex-1"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload Goals
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className={successCount > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {successCount > 0 && (
                  <span className="text-green-800">
                    ✓ {successCount} drill{successCount !== 1 ? 's' : ''} updated successfully
                  </span>
                )}
                {failureCount > 0 && (
                  <span className={successCount > 0 ? 'block text-red-800 mt-1' : 'text-red-800'}>
                    ✗ {failureCount} drill{failureCount !== 1 ? 's' : ''} failed
                  </span>
                )}
              </AlertDescription>
            </Alert>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {results.map((result, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{result.drillName}</p>
                    {result.error && <p className="text-xs text-red-600">{result.error}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setResults(null);
                  setInput('');
                }}
                variant="outline"
                className="flex-1"
              >
                Upload More
              </Button>
              <Button
                onClick={onClose}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
