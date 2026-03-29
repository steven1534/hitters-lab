import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, Download } from "lucide-react";

interface DrillRow {
  drillId: string;
  name: string;
  difficulty: string;
  category: string;
  duration: string;
  videoUrl: string;
  _error?: string;
}

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const CATEGORIES = ["Hitting", "Pitching", "Infield", "Outfield", "Bunting"];
const DURATIONS = ["5m", "10m", "15m", "20m", "30m"];

function validateRow(row: DrillRow): string | null {
  if (!row.drillId?.trim()) return "drillId is required";
  if (!row.name?.trim()) return "name is required";
  if (!DIFFICULTIES.includes(row.difficulty)) return `difficulty must be: ${DIFFICULTIES.join(", ")}`;
  if (!row.category?.trim()) return "category is required";
  if (!row.duration?.trim()) return "duration is required";
  return null;
}

function parseCSV(text: string): DrillRow[] {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (!lines.length) return [];

  // Detect if first line is a header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes("drillid") || firstLine.includes("name") || firstLine.includes("difficulty");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map(line => {
    // Handle quoted CSV fields
    const cols: string[] = [];
    let inQuote = false;
    let current = "";
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { cols.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    cols.push(current.trim());

    const [drillId = "", name = "", difficulty = "Medium", category = "Hitting", duration = "10m", videoUrl = ""] = cols;
    const row: DrillRow = { drillId: drillId.trim(), name: name.trim(), difficulty: difficulty.trim(), category: category.trim(), duration: duration.trim(), videoUrl: videoUrl.trim() };
    const err = validateRow(row);
    if (err) row._error = err;
    return row;
  }).filter(r => r.drillId || r.name); // skip fully blank lines
}

const TEMPLATE_CSV = `drillId,name,difficulty,category,duration,videoUrl
slow---controlled---explode-drill,Slow - Controlled - Explode Drill,Medium,Hitting,5m,https://youtube.com/watch?v=example
one-handed-drills,One Handed Drills,Medium,Hitting,10m,
crossover-drill,Crossover Drill,Medium,Hitting,10m,`;

const SAMPLE_DATA = `drillId,name,difficulty,category,duration,videoUrl
slow---controlled---explode-drill,Slow - Controlled - Explode Drill,Medium,Hitting,5m,
one-handed-drills,One Handed Drills,Medium,Hitting,10m,
crossover-drill,Crossover Drill,Medium,Hitting,10m,
elevated-front-toss-drill,Elevated Front Toss Drill,Hard,Hitting,10m,
step-back-drill,Step-back Drill,Medium,Hitting,10m,`;

export function BulkImportCustomDrills() {
  const [rows, setRows] = useState<DrillRow[]>([]);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const bulkMutation = trpc.drillDetails.bulkImportCustomDrills.useMutation({
    onSuccess: (data) => {
      setResult(data);
      utils.drillDetails.getCustomDrills.invalidate();
      if (data.imported > 0) {
        toast.success(`${data.imported} drills imported successfully!`);
      }
    },
    onError: (e) => toast.error(e.message || "Import failed"),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text");
    setRows(parseCSV(text));
    setResult(null);
  };

  const handleTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRows(parseCSV(e.target.value));
    setResult(null);
  };

  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const validRows = rows.filter(r => !r._error);
  const errorRows = rows.filter(r => r._error);

  const handleImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    try {
      await bulkMutation.mutateAsync({ drills: validRows.map(r => ({ ...r, videoUrl: r.videoUrl || undefined })) });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "drill_import_template.csv";
    a.click();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">Bulk Import Drills</h2>
          <p className="text-muted-foreground text-sm mt-1">Import custom drills via CSV. First 5 fields required; videoUrl is optional.</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
          <Download className="h-4 w-4" /> Download Template
        </Button>
      </div>

      {/* Field reference card */}
      <div className="bg-muted/40 border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#DC143C]" /> Required CSV Columns (in order)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { col: "drillId", desc: "URL-safe ID", example: "step-back-drill", note: "Unique, lowercase, hyphens only" },
            { col: "name", desc: "Display name", example: "Step-back Drill", note: "Human-readable title" },
            { col: "difficulty", desc: "Level", example: "Medium", note: "Easy · Medium · Hard" },
            { col: "category", desc: "Skill set", example: "Hitting", note: "Hitting · Pitching · Infield · Outfield · Bunting" },
            { col: "duration", desc: "Time", example: "10m", note: "5m · 10m · 15m · 20m · 30m" },
            { col: "videoUrl", desc: "Video (optional)", example: "https://youtube.com/...", note: "YouTube or any video URL" },
          ].map(f => (
            <div key={f.col} className="bg-muted/40 rounded-lg p-3 border border-border/60">
              <div className="font-mono text-[#DC143C] text-xs font-bold mb-1">{f.col}</div>
              <div className="text-foreground/80 text-xs mb-1">{f.desc}</div>
              <div className="font-mono text-muted-foreground text-[10px] bg-black/20 rounded px-1.5 py-0.5 mb-1">{f.example}</div>
              <div className="text-muted-foreground/60 text-[10px]">{f.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Input area */}
      {!result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* CSV paste */}
          <div className="bg-muted/40 border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Paste CSV</h3>
            <textarea
              className="w-full h-48 bg-black/30 border border-border rounded-lg p-3 text-foreground/80 text-xs font-mono resize-none focus:outline-none focus:border-[#DC143C]/40"
              placeholder={`drillId,name,difficulty,category,duration,videoUrl\nstep-back-drill,Step-back Drill,Medium,Hitting,10m,https://youtube.com/watch?v=abc\nbounce-drill,Bounce Drill,Medium,Hitting,10m,`}
              onPaste={handlePaste}
              onChange={handleTextarea}
            />
            <p className="text-muted-foreground/60 text-xs">Include or omit the header row — both work.</p>
          </div>

          {/* File upload */}
          <div className="bg-muted/40 border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Upload CSV File</h3>
            <label
              htmlFor="csv-file-input"
              className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-[#DC143C]/40 hover:bg-muted/20 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground/60 mb-3" />
              <p className="text-muted-foreground text-sm font-medium">Click to upload CSV</p>
              <p className="text-muted-foreground/50 text-xs mt-1">or drag and drop</p>
              {rows.length > 0 && <p className="text-[#DC143C] text-xs mt-2">{rows.length} rows loaded</p>}
            </label>
            <input id="csv-file-input" ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
          </div>
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && !result && (
        <div className="bg-muted/40 border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-foreground">Preview</h3>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{validRows.length} valid</Badge>
              {errorRows.length > 0 && <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{errorRows.length} errors</Badge>}
            </div>
            <Button
              onClick={handleImport}
              disabled={!validRows.length || importing}
              className="bg-[#DC143C] hover:bg-[#DC143C]/90 text-white gap-2"
              size="sm"
            >
              <Upload className="h-3.5 w-3.5" />
              {importing ? "Importing..." : `Import ${validRows.length} Drills`}
            </Button>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  {["drillId", "name", "difficulty", "category", "duration", "videoUrl", "status", ""].map(h => (
                    <th key={h} className="text-left text-muted-foreground font-semibold uppercase tracking-wider px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={`border-t border-border/40 ${row._error ? "bg-red-500/5" : "hover:bg-muted/20"}`}>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{row.drillId || <span className="text-red-400">—</span>}</td>
                    <td className="px-4 py-2.5 text-foreground">{row.name || <span className="text-red-400">—</span>}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        row.difficulty === "Easy" ? "bg-green-500/20 text-green-400" :
                        row.difficulty === "Hard" ? "bg-red-500/20 text-red-400" :
                        "bg-amber-500/20 text-amber-400"
                      }`}>{row.difficulty}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.category}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.duration}</td>
                    <td className="px-4 py-2.5 max-w-[160px] truncate">
                      {row.videoUrl
                        ? <a href={row.videoUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-[10px] truncate block">{row.videoUrl}</a>
                        : <span className="text-muted-foreground/40">—</span>
                      }
                    </td>
                    <td className="px-4 py-2.5">
                      {row._error
                        ? <span className="text-red-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{row._error}</span>
                        : <span className="text-green-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" />OK</span>
                      }
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => removeRow(i)} className="text-muted-foreground/40 hover:text-red-400 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-muted/40 border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-400" />
            <h3 className="text-lg font-semibold text-foreground">Import Complete</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-400">{result.imported}</div>
              <div className="text-muted-foreground text-xs mt-1">Imported</div>
            </div>
            <div className={`${result.skipped > 0 ? "bg-red-500/10 border-red-500/20" : "bg-muted/40 border-border"} border rounded-lg p-4 text-center`}>
              <div className={`text-3xl font-bold ${result.skipped > 0 ? "text-red-400" : "text-muted-foreground"}`}>{result.skipped}</div>
              <div className="text-muted-foreground text-xs mt-1">Skipped</div>
            </div>
            <div className="bg-muted/40 border border-border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-muted-foreground">{result.imported + result.skipped}</div>
              <div className="text-muted-foreground text-xs mt-1">Total</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm font-semibold mb-2">Errors:</p>
              <ul className="space-y-1">
                {result.errors.map((e, i) => <li key={i} className="text-red-300/70 text-xs font-mono">• {e}</li>)}
              </ul>
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => { setRows([]); setResult(null); }} variant="outline">Import More</Button>
            <Button onClick={() => window.location.reload()} className="bg-[#DC143C] hover:bg-[#DC143C]/90 text-white">View Drill Library</Button>
          </div>
        </div>
      )}
    </div>
  );
}
