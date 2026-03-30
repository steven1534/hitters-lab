import { useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Typography from "@tiptap/extension-typography";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import {
  Bold, Italic, UnderlineIcon, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight,
  Plus, Trash2, Edit3, ChevronLeft, FileText, Calendar, User,
  Save, X, Quote, Minus, Link2, Heading1, Heading2, Heading3,
  ChevronRight, Download, Check,
} from "lucide-react";
import { exportHtmlToPdf } from "@/lib/exportPdf";

// ── Safe date helper (reportDate can be Date object or string) ──
function toIsoDate(d: Date | string): string {
  if (d instanceof Date) return d.toISOString().split("T")[0];
  if (typeof d === "string") return d.includes("T") ? d.split("T")[0] : d;
  return String(d);
}
function formatReportDate(d: Date | string): string {
  return new Date(toIsoDate(d) + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// ── Toolbar Button ────────────────────────────────────────────
function TBtn({
  active, onClick, title, children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`flex items-center justify-center w-7 h-7 rounded transition-colors text-[13px] ${
        active
          ? "bg-electric/90 text-black"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-muted mx-0.5" />;
}

// ── Full Toolbar ──────────────────────────────────────────────
function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null;

  const setLink = () => {
    const url = window.prompt("Enter URL:");
    if (!url) return;
    editor.chain().focus().setLink({ href: url, target: "_blank" }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-border bg-[#111111] rounded-t-xl sticky top-0 z-10">
      {/* Headings */}
      <TBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
        <Heading1 className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
        <Heading2 className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
        <Heading3 className="w-3.5 h-3.5" />
      </TBtn>

      <Divider />

      {/* Text styling */}
      <TBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
        <Bold className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
        <Italic className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)">
        <UnderlineIcon className="w-3.5 h-3.5" />
      </TBtn>

      <Divider />

      {/* Lists */}
      <TBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
        <List className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
        <ListOrdered className="w-3.5 h-3.5" />
      </TBtn>

      <Divider />

      {/* Alignment */}
      <TBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align Left">
        <AlignLeft className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align Center">
        <AlignCenter className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align Right">
        <AlignRight className="w-3.5 h-3.5" />
      </TBtn>

      <Divider />

      {/* Blockquote + HR + Link */}
      <TBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
        <Quote className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
        <Minus className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn active={editor.isActive("link")} onClick={setLink} title="Insert Link">
        <Link2 className="w-3.5 h-3.5" />
      </TBtn>
    </div>
  );
}

// ── Document CSS (injected via style tag) ─────────────────────
const EDITOR_STYLES = `
.report-editor .ProseMirror {
  outline: none;
  min-height: 500px;
  padding: 2.5rem 3rem;
  font-size: 15px;
  line-height: 1.8;
  color: rgba(255,255,255,0.88);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.report-editor .ProseMirror p {
  margin: 0 0 0.75em 0;
}
.report-editor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: rgba(255,255,255,0.2);
  pointer-events: none;
  float: left;
  height: 0;
}
.report-editor .ProseMirror h1 {
  font-size: 1.875rem;
  font-weight: 800;
  line-height: 1.25;
  margin: 1.5em 0 0.5em;
  color: #fff;
  letter-spacing: -0.02em;
}
.report-editor .ProseMirror h2 {
  font-size: 1.375rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 1.25em 0 0.4em;
  color: rgba(255,255,255,0.95);
  letter-spacing: -0.01em;
}
.report-editor .ProseMirror h3 {
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.4;
  margin: 1em 0 0.35em;
  color: rgba(255,255,255,0.9);
}
.report-editor .ProseMirror h1:first-child,
.report-editor .ProseMirror h2:first-child,
.report-editor .ProseMirror h3:first-child {
  margin-top: 0;
}
.report-editor .ProseMirror ul,
.report-editor .ProseMirror ol {
  padding-left: 1.5em;
  margin: 0.5em 0 0.75em;
}
.report-editor .ProseMirror li {
  margin: 0.2em 0;
  line-height: 1.7;
}
.report-editor .ProseMirror li p {
  margin: 0;
}
.report-editor .ProseMirror blockquote {
  border-left: 3px solid rgba(99,179,237,0.5);
  padding: 0.5em 1em;
  margin: 1em 0;
  color: rgba(255,255,255,0.6);
  font-style: italic;
  background: rgba(255,255,255,0.03);
  border-radius: 0 6px 6px 0;
}
.report-editor .ProseMirror hr {
  border: none;
  border-top: 1px solid rgba(255,255,255,0.1);
  margin: 1.5em 0;
}
.report-editor .ProseMirror a {
  color: #63b3ed;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.report-editor .ProseMirror strong { color: #fff; font-weight: 700; }
.report-editor .ProseMirror em { color: rgba(255,255,255,0.75); }

/* Read-only view */
.report-view h1 { font-size: 1.875rem; font-weight: 800; margin: 1.5em 0 0.5em; color: #fff; letter-spacing: -0.02em; line-height: 1.25; }
.report-view h2 { font-size: 1.375rem; font-weight: 700; margin: 1.25em 0 0.4em; color: rgba(255,255,255,0.95); line-height: 1.3; }
.report-view h3 { font-size: 1.1rem; font-weight: 600; margin: 1em 0 0.35em; color: rgba(255,255,255,0.9); line-height: 1.4; }
.report-view h1:first-child, .report-view h2:first-child, .report-view h3:first-child { margin-top: 0; }
.report-view p { margin: 0 0 0.75em; line-height: 1.8; color: rgba(255,255,255,0.85); font-size: 15px; }
.report-view ul, .report-view ol { padding-left: 1.5em; margin: 0.5em 0 0.75em; }
.report-view li { margin: 0.2em 0; line-height: 1.7; color: rgba(255,255,255,0.85); font-size: 15px; }
.report-view li p { margin: 0; }
.report-view blockquote { border-left: 3px solid rgba(99,179,237,0.5); padding: 0.5em 1em; margin: 1em 0; color: rgba(255,255,255,0.6); font-style: italic; background: rgba(255,255,255,0.03); border-radius: 0 6px 6px 0; }
.report-view hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1.5em 0; }
.report-view a { color: #63b3ed; text-decoration: underline; text-underline-offset: 2px; }
.report-view strong { color: #fff; font-weight: 700; }
.report-view em { color: rgba(255,255,255,0.75); }
`;

// ── Report Editor ─────────────────────────────────────────────
function ReportEditor({
  athleteId,
  athleteName,
  report,
  onSaved,
  onCancel,
}: {
  athleteId: number;
  athleteName: string;
  report?: { id: number; title: string; content: string; reportDate: string } | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!report;
  const [title, setTitle] = useState(report?.title ?? "");
  const [reportDate, setReportDate] = useState(
    report?.reportDate
      ? new Date(report.reportDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Start writing your report…" }),
      Link.configure({ openOnClick: false, autolink: true }),
      Typography,
      HorizontalRule,
    ],
    content: report?.content ?? "",
    editorProps: {
      attributes: { class: "report-editor-inner" },
    },
  });

  const createMutation = trpc.playerReports.create.useMutation();
  const updateMutation = trpc.playerReports.update.useMutation();

  const handleSave = useCallback(async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    if (!editor) return;
    setSaving(true);
    setError("");
    try {
      const content = editor.getHTML();
      if (isEdit && report) {
        await updateMutation.mutateAsync({ id: report.id, title, content, reportDate });
      } else {
        await createMutation.mutateAsync({ athleteId, title, content, reportDate });
      }
      onSaved();
    } catch (e: any) {
      setError(e.message ?? "Failed to save report");
    } finally {
      setSaving(false);
    }
  }, [title, reportDate, editor, isEdit, report, athleteId]);

  return (
    <>
      <style>{EDITOR_STYLES}</style>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/60">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">{isEdit ? "Edit Report" : "New Report"}</h2>
            <p className="text-muted-foreground text-xs">{athleteName}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors text-sm">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-electric text-black font-semibold text-sm hover:bg-electric/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Save Report"}
            </button>
          </div>
        </div>

        {/* Meta: title + date */}
        <div className="flex gap-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Report title…"
            className="flex-1 bg-muted/40 border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-electric/40 transition-colors"
          />
          <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-lg px-3 py-2.5">
            <Calendar className="w-4 h-4 text-muted-foreground/60 shrink-0" />
            <input
              type="date"
              value={reportDate}
              onChange={e => setReportDate(e.target.value)}
              className="bg-transparent text-foreground text-sm focus:outline-none"
            />
          </div>
        </div>

        {/* Document editor */}
        <div className="report-editor rounded-xl border border-border bg-[#0e0e0e] overflow-hidden shadow-xl">
          <EditorToolbar editor={editor} />
          <EditorContent editor={editor} />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </>
  );
}

// ── Report Viewer ─────────────────────────────────────────────
function ReportViewer({
  report,
  athleteName,
  onEdit,
  onBack,
  onDelete,
  onDateChange,
}: {
  report: { id: number; title: string; content: string; reportDate: string };
  athleteName: string;
  onEdit: () => void;
  onBack: () => void;
  onDelete: () => void;
  onDateChange: (newDate: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState(toIsoDate(report.reportDate));
  const [savingDate, setSavingDate] = useState(false);

  const updateMutation = trpc.playerReports.update.useMutation();

  // Sync dateValue when parent updates reportDate after save
  useEffect(() => {
    setDateValue(toIsoDate(report.reportDate));
  }, [report.reportDate]);

  const handleSaveDate = async (val: string) => {
    if (!val) { setEditingDate(false); return; }
    setSavingDate(true);
    try {
      await updateMutation.mutateAsync({ id: report.id, reportDate: val });
      onDateChange(val);
    } catch (e) {
      console.error("Failed to update date", e);
    } finally {
      setSavingDate(false);
      setEditingDate(false);
    }
  };

  const handleExport = () => {
    const dateStr = toIsoDate(report.reportDate);
    exportHtmlToPdf({
      title: report.title,
      athleteName,
      date: formatReportDate(report.reportDate),
      html: report.content,
      filename: `${athleteName.replace(/\s+/g, "-")}_Report_${dateStr}`,
    });
  };

  return (
    <>
      <style>{EDITOR_STYLES}</style>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 p-1 rounded-lg hover:bg-muted/60">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-foreground leading-snug">{report.title}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-muted-foreground/70 text-xs">{athleteName} ·</span>
                {editingDate ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={dateValue}
                      onChange={e => setDateValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleSaveDate(dateValue); if (e.key === "Escape") setEditingDate(false); }}
                      autoFocus
                      className="bg-muted border border-electric/40 rounded px-2 py-0.5 text-foreground text-xs focus:outline-none focus:border-electric"
                    />
                    <button
                      onClick={() => handleSaveDate(dateValue)}
                      disabled={savingDate}
                      className="p-1 rounded text-electric hover:bg-electric/10 disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingDate(false)} className="p-1 rounded text-muted-foreground/60 hover:text-muted-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingDate(true)}
                    className="flex items-center gap-1 text-muted-foreground/70 text-xs hover:text-foreground/80 hover:bg-muted/50 px-1.5 py-0.5 rounded transition-colors group"
                    title="Click to edit date"
                  >
                    <Calendar className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {formatReportDate(report.reportDate)}
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground text-sm transition-colors">
              <Download className="w-3.5 h-3.5" /> Export PDF
            </button>
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground text-sm transition-colors">
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
            {confirmDelete ? (
              <div className="flex gap-2 items-center">
                <span className="text-muted-foreground text-sm">Delete?</span>
                <button onClick={onDelete} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm transition-colors">Yes</button>
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground text-sm transition-colors">No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Document view */}
        <div className="report-view rounded-xl border border-border bg-[#0e0e0e] px-12 py-10 shadow-xl"
          dangerouslySetInnerHTML={{ __html: report.content }}
        />
      </div>
    </>
  );
}

// ── Report List ───────────────────────────────────────────────
function ReportList({
  athleteId,
  athleteName,
  onSelect,
  onNew,
}: {
  athleteId: number;
  athleteName: string;
  onSelect: (report: any) => void;
  onNew: () => void;
}) {
  const { data: reports = [], isLoading } = trpc.playerReports.listByAthlete.useQuery({ athleteId });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">{athleteName}</h3>
          <p className="text-muted-foreground/70 text-xs mt-0.5">{reports.length} report{reports.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-electric text-black font-semibold text-sm hover:bg-electric/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Report
        </button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground/60 text-sm py-12 text-center">Loading…</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground/70 text-sm">No reports yet for {athleteName}</p>
          <button onClick={onNew} className="mt-4 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground text-sm transition-colors">
            Create First Report
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(reports as any[]).map((r: any) => (
            <button
              key={r.id}
              onClick={() => onSelect(r)}
              className="w-full text-left p-4 rounded-xl bg-muted/20 border border-border/70 hover:border-electric/25 hover:bg-muted/50 transition-all group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-electric/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-electric" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground font-medium text-sm truncate">{r.title}</p>
                    <p className="text-muted-foreground/70 text-xs mt-0.5">
                      {new Date(r.reportDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────
type View =
  | { type: "select-athlete" }
  | { type: "list"; athleteId: number; athleteName: string }
  | { type: "new"; athleteId: number; athleteName: string }
  | { type: "view"; athleteId: number; athleteName: string; report: any }
  | { type: "edit"; athleteId: number; athleteName: string; report: any };

export function PlayerReportsTab({ initialAthleteId, blastUserIds: blastUserIdsProp }: { initialAthleteId?: number; blastUserIds?: Set<number> } = {}) {
  const { data: allUsers = [] } = trpc.admin.getAllUsers.useQuery();
  const athletes = (allUsers as any[]).filter((u: any) => u.role === "athlete");

  const [view, setView] = useState<View>({ type: "select-athlete" });
  const [athleteSearch, setAthleteSearch] = useState("");

  // Auto-select athlete once data loads (navigated from Blast Metrics)
  useEffect(() => {
    if (initialAthleteId && athletes.length > 0) {
      const a = athletes.find((u: any) => u.id === initialAthleteId);
      if (a) setView({ type: "list", athleteId: a.id, athleteName: a.name });
    }
  }, [initialAthleteId, athletes.length]);
  const utils = trpc.useUtils();

  const deleteMutation = trpc.playerReports.delete.useMutation({
    onSuccess: () => {
      if (view.type === "view") {
        utils.playerReports.listByAthlete.invalidate({ athleteId: view.athleteId });
        setView({ type: "list", athleteId: view.athleteId, athleteName: view.athleteName });
      }
    },
  });

  // Blast badge — use prop if provided (from CoachDashboard), else empty set
  const blastUserIds = blastUserIdsProp ?? new Set<number>();

  const filteredAthletes = athletes.filter((a: any) =>
    a.name?.toLowerCase().includes(athleteSearch.toLowerCase())
  );

  const handleSaved = () => {
    if (view.type === "new" || view.type === "edit") {
      utils.playerReports.listByAthlete.invalidate({ athleteId: view.athleteId });
      setView({ type: "list", athleteId: view.athleteId, athleteName: view.athleteName });
    }
  };

  const activeAthleteId =
    view.type !== "select-athlete" ? view.athleteId : null;

  return (
    <div className="flex gap-5 min-h-[600px]">
      {/* Sidebar */}
      <div className="w-52 shrink-0 flex flex-col gap-2">
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1 flex items-center gap-1.5 px-1">
          <User className="w-3 h-3" /> Athletes
        </p>
        <input
          type="text"
          value={athleteSearch}
          onChange={e => setAthleteSearch(e.target.value)}
          placeholder="Search…"
          className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground/50 text-xs focus:outline-none focus:border-electric/30 transition-colors"
        />
        <div className="flex flex-col gap-0.5">
          {filteredAthletes.map((a: any) => {
            const isActive = activeAthleteId === a.id;
            const hasBlast = blastUserIds.has(a.id);
            return (
              <button
                key={a.id}
                onClick={() => setView({ type: "list", athleteId: a.id, athleteName: a.name })}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-1 ${
                  isActive
                    ? "bg-electric/15 text-electric border border-electric/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <span className="truncate">{a.name}</span>
                {hasBlast && (
                  <span title="Has Blast Motion data" className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {view.type === "select-athlete" && (
          <div className="flex flex-col items-center justify-center h-full py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground/60 text-sm">Select an athlete to view or create reports</p>
          </div>
        )}

        {view.type === "list" && (
          <ReportList
            athleteId={view.athleteId}
            athleteName={view.athleteName}
            onSelect={(report) => setView({ type: "view", athleteId: view.athleteId, athleteName: view.athleteName, report })}
            onNew={() => setView({ type: "new", athleteId: view.athleteId, athleteName: view.athleteName })}
          />
        )}

        {view.type === "new" && (
          <ReportEditor
            athleteId={view.athleteId}
            athleteName={view.athleteName}
            onSaved={handleSaved}
            onCancel={() => setView({ type: "list", athleteId: view.athleteId, athleteName: view.athleteName })}
          />
        )}

        {view.type === "view" && (
          <ReportViewer
            report={view.report}
            athleteName={view.athleteName}
            onEdit={() => setView({ type: "edit", athleteId: view.athleteId, athleteName: view.athleteName, report: view.report })}
            onBack={() => setView({ type: "list", athleteId: view.athleteId, athleteName: view.athleteName })}
            onDelete={() => deleteMutation.mutate({ id: view.report.id })}
            onDateChange={(newDate) => {
              utils.playerReports.listByAthlete.invalidate({ athleteId: view.athleteId });
              setView({ type: "view", athleteId: view.athleteId, athleteName: view.athleteName, report: { ...view.report, reportDate: newDate } });
            }}
          />
        )}

        {view.type === "edit" && (
          <ReportEditor
            athleteId={view.athleteId}
            athleteName={view.athleteName}
            report={{
              ...view.report,
              reportDate: new Date(view.report.reportDate).toISOString().split("T")[0],
            }}
            onSaved={handleSaved}
            onCancel={() => setView({ type: "view", athleteId: view.athleteId, athleteName: view.athleteName, report: view.report })}
          />
        )}
      </div>
    </div>
  );
}
