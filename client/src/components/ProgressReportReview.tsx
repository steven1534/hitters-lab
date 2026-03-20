import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Send,
  Pencil,
  Eye,
  Loader2,
  Check,
  Mail,
  FileText,
  Sparkles,
  RefreshCw,
  X,
} from "lucide-react";

interface ReportContent {
  greeting: string;
  sessionSummary: string;
  strengths: string;
  areasForImprovement: string;
  homeworkAndNextSteps: string;
  playerNote: string;
  signOff: string;
}

/** Section heading labels — editable by the coach */
interface SectionHeadings {
  strengths: string;
  areasForImprovement: string;
  homeworkAndNextSteps: string;
}

const DEFAULT_HEADINGS: SectionHeadings = {
  strengths: "What Stood Out",
  areasForImprovement: "What We're Building On",
  homeworkAndNextSteps: "Next Steps & Homework",
};

interface ProgressReportReviewProps {
  sessionNoteId: number;
  athleteId: number;
  athleteName: string;
  parentEmail?: string;
  parentName?: string;
  onBack: () => void;
  /** If provided, load an existing report instead of generating a new one */
  existingReportId?: number;
}

export function ProgressReportReview({
  sessionNoteId,
  athleteId,
  athleteName,
  parentEmail: initialParentEmail,
  parentName: initialParentName,
  onBack,
  existingReportId,
}: ProgressReportReviewProps) {
  const [reportId, setReportId] = useState<number | null>(existingReportId ?? null);
  const [reportContent, setReportContent] = useState<ReportContent | null>(null);
  const [sectionHeadings, setSectionHeadings] = useState<SectionHeadings>({ ...DEFAULT_HEADINGS });
  const [reportTitle, setReportTitle] = useState<string>("");
  const [status, setStatus] = useState<"draft" | "reviewed" | "sent">("draft");
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendEmail, setSendEmail] = useState(initialParentEmail ?? "");
  const [sendName, setSendName] = useState(initialParentName ?? "");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track which field is currently being edited
  const [editingField, setEditingField] = useState<string | null>(null);

  // Generate report mutation
  const generateMutation = trpc.progressReports.generate.useMutation({
    onSuccess: (data: any) => {
      setReportId(data.id);
      setReportContent(data.reportContent as ReportContent);
      setReportTitle(data.title);
      setStatus(data.status);
      // Extract custom headings if stored
      if (data.reportContent?.sectionHeadings) {
        setSectionHeadings(data.reportContent.sectionHeadings);
      }
      setHasUnsavedChanges(false);
      toast.success("Report generated — click any section to edit.");
    },
    onError: (err: any) => {
      toast.error(`Generation failed: ${err.message}`);
    },
  });

  // Load existing report
  const existingReport = trpc.progressReports.getById.useQuery(
    { id: existingReportId! },
    { enabled: !!existingReportId }
  );

  // Update report mutation
  const updateMutation = trpc.progressReports.update.useMutation({
    onSuccess: () => {
      toast.success("Report saved");
      setHasUnsavedChanges(false);
      if (status === "draft") setStatus("reviewed");
    },
    onError: (err: any) => {
      toast.error(`Save failed: ${err.message}`);
    },
  });

  // Send report mutation
  const sendMutation = trpc.progressReports.sendToParent.useMutation({
    onSuccess: () => {
      setStatus("sent");
      setShowSendDialog(false);
      toast.success(`Report sent to ${sendEmail}`);
    },
    onError: (err: any) => {
      toast.error(`Send failed: ${err.message}`);
    },
  });

  // Auto-generate on mount if no existing report
  useEffect(() => {
    if (!existingReportId) {
      generateMutation.mutate({
        sessionNoteId,
        parentName: initialParentName,
        parentEmail: initialParentEmail,
      });
    }
  }, []);

  // Load existing report data
  useEffect(() => {
    if (existingReport.data) {
      const data = existingReport.data as any;
      setReportContent(data.reportContent as ReportContent);
      setReportTitle(data.title);
      setStatus(data.status);
      if (data.reportContent?.sectionHeadings) {
        setSectionHeadings(data.reportContent.sectionHeadings);
      }
    }
  }, [existingReport.data]);

  const isLoading = generateMutation.isPending || existingReport.isLoading;

  const handleFieldChange = (field: keyof ReportContent, value: string) => {
    if (!reportContent) return;
    setReportContent({ ...reportContent, [field]: value });
    setHasUnsavedChanges(true);
  };

  const handleHeadingChange = (field: keyof SectionHeadings, value: string) => {
    setSectionHeadings({ ...sectionHeadings, [field]: value });
    setHasUnsavedChanges(true);
  };

  const handleTitleChange = (value: string) => {
    setReportTitle(value);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    if (!reportId || !reportContent) return;
    // Store headings alongside content so they persist
    const contentWithHeadings = { ...reportContent, sectionHeadings };
    updateMutation.mutate({
      id: reportId,
      reportContent: contentWithHeadings,
      status: "reviewed",
    });
    setStatus("reviewed");
  };

  const handleSend = () => {
    if (!reportId || !sendEmail) return;
    // Save before sending to ensure latest edits are persisted
    if (hasUnsavedChanges && reportContent) {
      const contentWithHeadings = { ...reportContent, sectionHeadings };
      updateMutation.mutate({
        id: reportId,
        reportContent: contentWithHeadings,
        status: "reviewed",
      });
    }
    sendMutation.mutate({
      reportId,
      parentEmail: sendEmail,
      parentName: sendName || undefined,
    });
  };

  const handleRegenerate = () => {
    generateMutation.mutate({
      sessionNoteId,
      parentName: sendName || initialParentName,
      parentEmail: sendEmail || initialParentEmail,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#DC143C]/20 to-[#DC143C]/20 flex items-center justify-center animate-pulse">
            <Sparkles className="h-8 w-8 text-[#DC143C] animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <h3 className="font-heading font-bold text-lg mb-1">
            Generating Progress Report
          </h3>
          <p className="text-sm text-muted-foreground">
            Writing in Coach Steve's voice...
          </p>
        </div>
      </div>
    );
  }

  if (!reportContent) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to generate report. Please try again.</p>
        <Button onClick={onBack} variant="outline" className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h2 className="font-heading font-bold text-lg leading-tight">
              {reportTitle || "Progress Report"}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="outline"
                className={
                  status === "sent"
                    ? "bg-green-500/10 text-green-400 border-green-500/30"
                    : status === "reviewed"
                      ? "bg-[#DC143C]/10 text-[#E8425A] border-[#DC143C]/30"
                      : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                }
              >
                {status === "sent" ? "Sent" : status === "reviewed" ? "Reviewed" : "Draft"}
              </Badge>
              <span className="text-xs text-muted-foreground">{athleteName}</span>
              {hasUnsavedChanges && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                  Unsaved changes
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={generateMutation.isPending}
            className="h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${generateMutation.isPending ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
          {hasUnsavedChanges && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="h-8 bg-[#DC143C] hover:bg-[#DC143C]/90"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1" />
              )}
              Save
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setShowSendDialog(true)}
            className="h-8 bg-green-600 hover:bg-green-700"
            disabled={status === "sent"}
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            {status === "sent" ? "Sent" : "Send to Parent"}
          </Button>
        </div>
      </div>

      {/* Inline hint */}
      <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
        <Pencil className="h-3 w-3" />
        Click any text below to edit it directly. All sections, headings, and the title are editable.
      </p>

      {/* Report Preview — All sections are inline-editable */}
      <div className="rounded-xl overflow-hidden shadow-2xl border border-white/[0.06]">
        {/* Branded Header */}
        <div className="bg-gradient-to-br from-[#0a1628] via-[#0f1f3d] to-[#1a2744] text-white px-8 py-10 text-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(96,165,250,0.08),transparent_50%)]" />
          <div className="relative">
            <h3 className="font-heading font-bold text-2xl mb-2 tracking-tight">Coach Steve</h3>
            <p className="text-[11px] text-blue-400/80 font-semibold tracking-[0.2em] uppercase">
              Division 1 All-American | Elite Player Development
            </p>
          </div>
        </div>

        {/* Meta bar — editable title */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#1a3050] text-slate-400 px-8 py-3 flex justify-between items-center text-xs">
          <InlineEditableText
            value={reportTitle.split("—")[0]?.trim() || `${athleteName} — Session`}
            onChange={(v) => handleTitleChange(v + (reportTitle.includes("—") ? " — " + reportTitle.split("—")[1]?.trim() : ""))}
            className="text-slate-300 text-xs"
            editingField={editingField}
            setEditingField={setEditingField}
            fieldId="meta-left"
          />
          <InlineEditableText
            value={reportTitle.split("—")[1]?.trim() || ""}
            onChange={(v) => handleTitleChange((reportTitle.split("—")[0]?.trim() || "") + " — " + v)}
            className="text-slate-400 text-xs"
            editingField={editingField}
            setEditingField={setEditingField}
            fieldId="meta-right"
          />
        </div>

        {/* Report Body */}
        <div className="px-8 py-8 space-y-5 bg-white dark:bg-[#0d1117]">
          {/* Greeting */}
          <InlineEditableText
            value={reportContent.greeting}
            onChange={(v) => handleFieldChange("greeting", v)}
            className="text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]"
            multiline
            editingField={editingField}
            setEditingField={setEditingField}
            fieldId="greeting"
          />

          {/* Session Summary */}
          <InlineEditableText
            value={reportContent.sessionSummary}
            onChange={(v) => handleFieldChange("sessionSummary", v)}
            className="text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]"
            multiline
            editingField={editingField}
            setEditingField={setEditingField}
            fieldId="sessionSummary"
          />

          {/* What Stood Out */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-1 rounded-full bg-emerald-500" />
              <InlineEditableText
                value={sectionHeadings.strengths}
                onChange={(v) => handleHeadingChange("strengths", v)}
                className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400"
                editingField={editingField}
                setEditingField={setEditingField}
                fieldId="heading-strengths"
              />
            </div>
            <div className="pl-3 border-l-2 border-emerald-200 dark:border-emerald-900/50">
              <InlineEditableText
                value={reportContent.strengths}
                onChange={(v) => handleFieldChange("strengths", v)}
                className="text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]"
                multiline
                editingField={editingField}
                setEditingField={setEditingField}
                fieldId="strengths"
              />
            </div>
          </div>

          {/* What We're Building On */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-1 rounded-full bg-amber-500" />
              <InlineEditableText
                value={sectionHeadings.areasForImprovement}
                onChange={(v) => handleHeadingChange("areasForImprovement", v)}
                className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400"
                editingField={editingField}
                setEditingField={setEditingField}
                fieldId="heading-improvement"
              />
            </div>
            <div className="pl-3 border-l-2 border-amber-200 dark:border-amber-900/50">
              <InlineEditableText
                value={reportContent.areasForImprovement}
                onChange={(v) => handleFieldChange("areasForImprovement", v)}
                className="text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]"
                multiline
                editingField={editingField}
                setEditingField={setEditingField}
                fieldId="areasForImprovement"
              />
            </div>
          </div>

          {/* Next Steps & Homework */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-1 rounded-full bg-blue-500" />
              <InlineEditableText
                value={sectionHeadings.homeworkAndNextSteps}
                onChange={(v) => handleHeadingChange("homeworkAndNextSteps", v)}
                className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400"
                editingField={editingField}
                setEditingField={setEditingField}
                fieldId="heading-homework"
              />
            </div>
            <div className="pl-3 border-l-2 border-blue-200 dark:border-blue-900/50">
              <InlineEditableText
                value={reportContent.homeworkAndNextSteps}
                onChange={(v) => handleFieldChange("homeworkAndNextSteps", v)}
                className="text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]"
                multiline
                editingField={editingField}
                setEditingField={setEditingField}
                fieldId="homeworkAndNextSteps"
              />
            </div>
          </div>

          {/* Player Note */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-l-4 border-blue-500 dark:border-blue-400 p-5 rounded-r-lg mt-6">
            <InlineEditableText
              value={reportContent.playerNote}
              onChange={(v) => handleFieldChange("playerNote", v)}
              className="text-blue-900 dark:text-blue-300 italic leading-relaxed text-[15px]"
              multiline
              editingField={editingField}
              setEditingField={setEditingField}
              fieldId="playerNote"
            />
          </div>

          {/* Sign-Off */}
          <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
            <InlineEditableText
              value={reportContent.signOff}
              onChange={(v) => handleFieldChange("signOff", v)}
              className="font-semibold text-slate-900 dark:text-slate-100 text-[15px]"
              editingField={editingField}
              setEditingField={setEditingField}
              fieldId="signOff"
            />
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 italic">
              Coach Steve — Elite private hitting instruction in Westbury, NY. Building powerful, confident players through professional mechanics and mental preparation.
            </p>
          </div>
        </div>

        {/* Branded Footer */}
        <div className="bg-gradient-to-br from-[#0a1628] to-[#0f1f3d] text-center py-8 px-8">
          <p className="text-blue-400 font-semibold text-sm tracking-wide">Coach Steve Goldstein</p>
          <p className="text-slate-600 text-[10px] tracking-[0.2em] uppercase mt-1.5">
            Elite Instruction. Measurable Growth.
          </p>
        </div>
      </div>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#DC143C]" />
              Send Report to Parent
            </DialogTitle>
            <DialogDescription>
              Send {athleteName}'s progress report via email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">
                Parent Email
              </label>
              <Input
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="parent@email.com"
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">
                Parent Name (optional)
              </label>
              <Input
                value={sendName}
                onChange={(e) => setSendName(e.target.value)}
                placeholder="e.g., Mr. Johnson"
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!sendEmail || sendMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Inline editable text — click to edit, click away to stop editing */
function InlineEditableText({
  value,
  onChange,
  className = "",
  multiline = false,
  editingField,
  setEditingField,
  fieldId,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  multiline?: boolean;
  editingField: string | null;
  setEditingField: (field: string | null) => void;
  fieldId: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = editingField === fieldId;

  useEffect(() => {
    if (isEditing) {
      if (multiline && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
      } else if (!multiline && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.selectionStart = inputRef.current.value.length;
      }
    }
  }, [isEditing]);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && multiline && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [isEditing, value]);

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            // Auto-resize
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onBlur={() => setEditingField(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditingField(null);
          }}
          className={`w-full bg-transparent border border-blue-400/40 dark:border-blue-500/30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none ${className}`}
          style={{ minHeight: "60px" }}
        />
      );
    }
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditingField(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") setEditingField(null);
        }}
        className={`bg-transparent border border-blue-400/40 dark:border-blue-500/30 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${className}`}
      />
    );
  }

  return (
    <div
      onClick={() => setEditingField(fieldId)}
      className={`cursor-pointer rounded-md px-2 py-1 -mx-2 -my-1 transition-all duration-150 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:ring-1 hover:ring-blue-300/30 dark:hover:ring-blue-500/20 group relative ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-muted-foreground italic">Click to add text...</span>}
      <Pencil className="h-3 w-3 absolute top-1 right-1 opacity-0 group-hover:opacity-60 text-blue-500 transition-opacity" />
    </div>
  );
}
