/**
 * AthletePlayerReports — shown in the athlete portal.
 * Displays player reports (and session notes) the coach has written for this athlete.
 * Read-only with PDF download.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { exportHtmlToPdf } from "@/lib/exportPdf";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
  Calendar,
  Loader2,
} from "lucide-react";

// Inline read-only view styles for the portal (matches coach-side report view)
const PORTAL_REPORT_STYLES = `
.portal-report-view h1 { font-size:1.5rem;font-weight:800;margin:1.2em 0 0.4em;color:#fff;line-height:1.25; }
.portal-report-view h2 { font-size:1.2rem;font-weight:700;margin:1em 0 0.35em;color:rgba(255,255,255,.95);line-height:1.3; }
.portal-report-view h3 { font-size:1rem;font-weight:600;margin:0.9em 0 0.3em;color:rgba(255,255,255,.9);line-height:1.4; }
.portal-report-view h1:first-child,.portal-report-view h2:first-child,.portal-report-view h3:first-child { margin-top:0; }
.portal-report-view p { margin:0 0 0.65em;line-height:1.75;color:rgba(255,255,255,.82);font-size:14px; }
.portal-report-view ul,.portal-report-view ol { padding-left:1.4em;margin:0.4em 0 0.65em; }
.portal-report-view li { margin:0.2em 0;line-height:1.65;color:rgba(255,255,255,.82);font-size:14px; }
.portal-report-view li p { margin:0; }
.portal-report-view blockquote { border-left:3px solid rgba(99,179,237,.5);padding:0.5em 1em;margin:0.9em 0;color:rgba(255,255,255,.6);font-style:italic;background:rgba(255,255,255,.03);border-radius:0 6px 6px 0; }
.portal-report-view hr { border:none;border-top:1px solid rgba(255,255,255,.1);margin:1.3em 0; }
.portal-report-view a { color:#63b3ed;text-decoration:underline; }
.portal-report-view strong { color:#fff;font-weight:700; }
.portal-report-view em { color:rgba(255,255,255,.75); }
`;

export function AthletePlayerReports() {
  const { user } = useAuth();
  const { data: reports = [], isLoading } = trpc.playerReports.getMyReports.useQuery(
    undefined,
    { enabled: !!user?.id }
  );
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-[#E8425A]" />
          <h3 className="font-bold text-foreground">Player Reports</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#E8425A]" />
        </div>
      </div>
    );
  }

  if (reports.length === 0) return null;

  const handleDownload = async (report: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setExportingId(report.id);
    try {
      exportHtmlToPdf({
        title: report.title,
        athleteName: user?.name ?? "Athlete",
        date: new Date(report.reportDate).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        html: report.content,
        filename: `${(user?.name ?? "Athlete").replace(/\s+/g, "-")}_Report_${
          new Date(report.reportDate).toISOString().split("T")[0]
        }`,
      });
    } finally {
      // Give a small delay so button feedback is visible
      setTimeout(() => setExportingId(null), 800);
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: "0.28s" }}>
      <style>{PORTAL_REPORT_STYLES}</style>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#E8425A]" />
          Player Reports
        </h3>
        <Badge className="bg-[#DC143C]/20 text-[#E8425A] border border-[#DC143C]/30">
          {reports.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {(reports as any[]).map((report: any) => {
          const isExpanded = expandedId === report.id;
          const isExporting = exportingId === report.id;

          return (
            <div
              key={report.id}
              className="glass-card rounded-xl overflow-hidden border border-white/5"
            >
              {/* Header row — always visible */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : report.id)}
                className="w-full text-left p-4 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-lg bg-[#DC143C]/10 border border-[#DC143C]/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-[#E8425A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate text-sm">
                    {report.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {new Date(report.reportDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "America/New_York",
                    })}
                  </div>
                </div>

                {/* Download button */}
                <button
                  onClick={(e) => handleDownload(report, e)}
                  disabled={isExporting}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-white/50 hover:text-white text-xs transition-colors disabled:opacity-40 mr-1 shrink-0"
                  title="Download PDF"
                >
                  <Download className="h-3.5 w-3.5" />
                  {isExporting ? "…" : "PDF"}
                </button>

                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Expanded report content */}
              {isExpanded && (
                <div className="px-4 pb-5 border-t border-white/5 pt-4">
                  <div
                    className="portal-report-view"
                    dangerouslySetInnerHTML={{ __html: report.content }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
