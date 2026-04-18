import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, FileSpreadsheet, AlertTriangle, CheckCircle2, X, Info } from "lucide-react";

// Known Blast Motion CSV column names mapped to our metric keys
const COLUMN_MAP: Record<string, string> = {
  // Bat Speed
  "bat speed (mph)": "batSpeedMph",
  "bat speed": "batSpeedMph",
  "batspeed": "batSpeedMph",
  // On-Plane Efficiency
  "on plane efficiency (%)": "onPlaneEfficiencyPercent",
  "on-plane efficiency": "onPlaneEfficiencyPercent",
  "on plane efficiency": "onPlaneEfficiencyPercent",
  "onplaneefficiency": "onPlaneEfficiencyPercent",
  // Attack Angle
  "attack angle (deg)": "attackAngleDeg",
  "attack angle": "attackAngleDeg",
  "attackangle": "attackAngleDeg",
  // Exit Velocity
  "exit velocity (mph)": "exitVelocityMph",
  "exit velocity": "exitVelocityMph",
  "exitvelocity": "exitVelocityMph",
  "exit velo": "exitVelocityMph",
  "exitvelo": "exitVelocityMph",
  // Date columns
  "date": "sessionDate",
  "session date": "sessionDate",
  "sessiondate": "sessionDate",
  // Type columns
  "type": "sessionType",
  "session type": "sessionType",
  "sessiontype": "sessionType",
  "drill type": "sessionType",
  "drill": "sessionType",
};

interface ParsedRow {
  sessionDate: string;
  sessionType: string;
  metrics: Record<string, any>;
  warnings: string[];
}

interface ImportBlastCSVProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  playerName: string;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  return { headers, rows };
}

function tryParseDate(val: string): string | null {
  if (!val) return null;
  // Try ISO format first
  const isoMatch = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) return val.split("T")[0];
  // Try MM/DD/YYYY or M/D/YYYY
  const usMatch = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    const year = usMatch[3].length === 2 ? `20${usMatch[3]}` : usMatch[3];
    return `${year}-${usMatch[1].padStart(2, "0")}-${usMatch[2].padStart(2, "0")}`;
  }
  // Try Date constructor
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return null;
}

export function ImportBlastCSV({ open, onOpenChange, playerId, playerName }: ImportBlastCSVProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [rawCSV, setRawCSV] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const [unmappedHeaders, setUnmappedHeaders] = useState<string[]>([]);
  const [defaultSessionType, setDefaultSessionType] = useState("General");
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);

  const utils = trpc.useUtils();

  const bulkImportMutation = trpc.blastMetrics.bulkImportSessions.useMutation({
    onSuccess: (data) => {
      setImportResult({ imported: data.imported, errors: data.errors });
      setStep("done");
      utils.blastMetrics.invalidate();
    },
    onError: (error) => {
      toast.error("Import failed", { description: error.message });
      setStep("preview");
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRawCSV(text);
      processCSV(text);
    };
    reader.readAsText(file);
  }, [defaultSessionType]);

  function processCSV(text: string) {
    const { headers: csvHeaders, rows } = parseCSV(text);
    if (csvHeaders.length === 0) {
      toast.error("Could not parse CSV", { description: "No headers found" });
      return;
    }

    setHeaders(csvHeaders);

    // Auto-map columns
    const mapping: Record<string, string> = {};
    const unmapped: string[] = [];
    for (const header of csvHeaders) {
      const normalized = header.toLowerCase().trim();
      if (COLUMN_MAP[normalized]) {
        mapping[header] = COLUMN_MAP[normalized];
      } else {
        unmapped.push(header);
      }
    }
    setColumnMapping(mapping);
    setUnmappedHeaders(unmapped);

    // Parse rows
    const parsed: ParsedRow[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.every((c) => !c.trim())) continue; // skip empty rows

      const warnings: string[] = [];
      let sessionDate = "";
      let sessionType = defaultSessionType;
      const metrics: Record<string, any> = {};

      for (let j = 0; j < csvHeaders.length; j++) {
        const header = csvHeaders[j];
        const metricKey = mapping[header];
        const val = row[j]?.trim() || "";

        if (!metricKey || !val) continue;

        if (metricKey === "sessionDate") {
          const parsed = tryParseDate(val);
          if (parsed) {
            sessionDate = parsed;
          } else {
            warnings.push(`Could not parse date: "${val}"`);
          }
        } else if (metricKey === "sessionType") {
          sessionType = val;
        } else {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            metrics[metricKey] = String(num);
          } else {
            warnings.push(`Invalid number "${val}" for ${header}`);
          }
        }
      }

      if (!sessionDate) {
        // Use today's date as fallback
        sessionDate = new Date().toISOString().split("T")[0];
        warnings.push("No date found — using today's date");
      }

      parsed.push({ sessionDate, sessionType, metrics, warnings });
    }

    setParsedRows(parsed);
    setStep("preview");
  }

  function handleImport() {
    if (parsedRows.length === 0) return;
    setStep("importing");

    const sessions = parsedRows.map((r) => ({
      sessionDate: r.sessionDate,
      sessionType: r.sessionType,
      metrics: r.metrics,
    }));

    bulkImportMutation.mutate({
      playerId,
      sessions,
    });
  }

  function handleReset() {
    setStep("upload");
    setRawCSV("");
    setParsedRows([]);
    setColumnMapping({});
    setHeaders([]);
    setUnmappedHeaders([]);
    setImportResult(null);
  }

  const warningCount = useMemo(() => parsedRows.filter((r) => r.warnings.length > 0).length, [parsedRows]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleReset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-border text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-400" />
            Import Blast Sessions from CSV
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Import sessions for <span className="text-foreground font-medium">{playerName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-6 py-4">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-green-500/30 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground mb-3">
                Drop a CSV file or click to browse
              </p>
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button asChild variant="outline" className="text-green-400 border-green-500/30 hover:bg-green-500/10 cursor-pointer">
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </span>
                </Button>
              </label>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 border border-border/60">
              <div className="flex items-start gap-2 text-muted-foreground text-sm">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground/80 mb-1">Expected CSV format</p>
                  <p>The importer auto-detects Blast Motion export columns. At minimum, include a <span className="text-foreground">Date</span> column. Recognized metrics: Bat Speed, On-Plane Efficiency, Attack Angle, Exit Velocity.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">Default Session Type (when not in CSV)</label>
              <Select value={defaultSessionType} onValueChange={setDefaultSessionType}>
                <SelectTrigger className="bg-muted/60 border-border text-foreground w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Tee", "Soft Toss", "Front Toss", "Live BP", "Machine BP", "Game At-Bat", "Live Pitching", "Overload/Underload", "General"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && (
          <div className="space-y-4 py-2">
            {/* Summary */}
            <div className="flex items-center gap-4 flex-wrap">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                {parsedRows.length} sessions found
              </Badge>
              {warningCount > 0 && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {warningCount} with warnings
                </Badge>
              )}
              {unmappedHeaders.length > 0 && (
                <Badge variant="outline" className="text-muted-foreground border-border">
                  {unmappedHeaders.length} unmapped columns
                </Badge>
              )}
            </div>

            {/* Column mapping info */}
            {unmappedHeaders.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3 text-xs text-amber-300/70">
                <p className="font-medium mb-1">Unmapped columns (will be skipped):</p>
                <p>{unmappedHeaders.join(", ")}</p>
              </div>
            )}

            {/* Preview table */}
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#1a1a1a]">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground">#</th>
                    <th className="text-left py-2 px-3 text-muted-foreground">Date</th>
                    <th className="text-left py-2 px-3 text-muted-foreground">Type</th>
                    <th className="text-center py-2 px-2 text-muted-foreground">Bat Speed</th>
                    <th className="text-center py-2 px-2 text-muted-foreground">On-Plane Eff.</th>
                    <th className="text-center py-2 px-2 text-muted-foreground">Attack Angle</th>
                    <th className="text-center py-2 px-2 text-muted-foreground">Exit Velo</th>
                    <th className="text-left py-2 px-2 text-muted-foreground">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-border/40 hover:bg-white/[0.02]">
                      <td className="py-2 px-3 text-muted-foreground/60">{idx + 1}</td>
                      <td className="py-2 px-3 text-foreground">{row.sessionDate}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-muted-foreground border-border text-[10px]">
                          {row.sessionType}
                        </Badge>
                      </td>
                      <td className="text-center py-2 px-2 text-[#E8425A]">{row.metrics.batSpeedMph || "—"}</td>
                      <td className="text-center py-2 px-2 text-emerald-400">{row.metrics.onPlaneEfficiencyPercent || "—"}</td>
                      <td className="text-center py-2 px-2 text-lime-400">{row.metrics.attackAngleDeg || "—"}</td>
                      <td className="text-center py-2 px-2 text-violet-400">{row.metrics.exitVelocityMph || "—"}</td>
                      <td className="py-2 px-2">
                        {row.warnings.length > 0 && (
                          <span className="text-amber-400/70 text-[10px]" title={row.warnings.join("\n")}>
                            <AlertTriangle className="h-3 w-3 inline mr-1" />
                            {row.warnings.length}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="h-10 w-10 text-green-400 animate-spin mx-auto" />
            <p className="text-muted-foreground">Importing {parsedRows.length} sessions...</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && importResult && (
          <div className="py-6 space-y-4">
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
              <h3 className="text-lg font-bold text-foreground">Import Complete</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{importResult.imported}</p>
                <p className="text-xs text-muted-foreground">Sessions Imported</p>
              </div>
              <div className={`${importResult.errors.length > 0 ? "bg-red-500/10 border-red-500/20" : "bg-muted/40 border-border"} border rounded-lg p-3 text-center`}>
                <p className={`text-2xl font-bold ${importResult.errors.length > 0 ? "text-red-400" : "text-muted-foreground/60"}`}>
                  {importResult.errors.length}
                </p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3 max-h-32 overflow-y-auto">
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-400/80 mb-1">{err}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "upload" && (
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              Cancel
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button
                variant="ghost"
                onClick={handleReset}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/60"
              >
                <X className="h-4 w-4 mr-1" />
                Start Over
              </Button>
              <Button
                onClick={handleImport}
                disabled={parsedRows.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import {parsedRows.length} Sessions
              </Button>
            </>
          )}
          {step === "done" && (
            <Button
              onClick={() => { handleReset(); onOpenChange(false); }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
