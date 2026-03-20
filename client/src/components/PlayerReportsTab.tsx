import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, UnderlineIcon, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Heading2, Heading3,
  Plus, Trash2, Edit3, ChevronLeft, FileText, Calendar, User,
  Save, X,
} from "lucide-react";

interface PlayerReportsTabProps {}

// ── Toolbar ──────────────────────────────────────────────────
function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null;
  const btn = (active: boolean) =>
    `p-1.5 rounded transition-colors ${active ? "bg-electric text-black" : "text-white/70 hover:text-white hover:bg-white/10"}`;

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-white/10 bg-white/[0.03]">
      <button type="button" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold className="w-4 h-4" /></button>
      <button type="button" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic className="w-4 h-4" /></button>
      <button type="button" className={btn(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon className="w-4 h-4" /></button>
      <div className="w-px bg-white/10 mx-1" />
      <button type="button" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2"><Heading2 className="w-4 h-4" /></button>
      <button type="button" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3"><Heading3 className="w-4 h-4" /></button>
      <div className="w-px bg-white/10 mx-1" />
      <button type="button" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List"><List className="w-4 h-4" /></button>
      <button type="button" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
      <div className="w-px bg-white/10 mx-1" />
      <button type="button" className={btn(editor.isActive({ textAlign: "left" }))} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align Left"><AlignLeft className="w-4 h-4" /></button>
      <button type="button" className={btn(editor.isActive({ textAlign: "center" }))} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align Center"><AlignCenter className="w-4 h-4" /></button>
      <button type="button" className={btn(editor.isActive({ textAlign: "right" }))} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align Right"><AlignRight className="w-4 h-4" /></button>
    </div>
  );
}

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
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Write your report here..." }),
    ],
    content: report?.content ?? "",
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none min-h-[400px] p-4 outline-none focus:outline-none",
      },
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
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="text-white/50 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">{isEdit ? "Edit Report" : "New Report"}</h2>
          <p className="text-white/50 text-sm">{athleteName}</p>
        </div>
      </div>

      {/* Title + Date */}
      <div className="flex gap-3">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Report title (e.g. Initial Hitting Evaluation — Feb 22, 2026)"
          className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-electric/50"
        />
        <div className="flex items-center gap-2 bg-white/[0.05] border border-white/10 rounded-lg px-3">
          <Calendar className="w-4 h-4 text-white/40" />
          <input
            type="date"
            value={reportDate}
            onChange={e => setReportDate(e.target.value)}
            className="bg-transparent text-white text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Editor */}
      <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
        <EditorToolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors text-sm"
        >
          <X className="w-4 h-4" /> Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-electric text-black font-semibold text-sm hover:bg-electric/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Save Report"}
        </button>
      </div>
    </div>
  );
}

// ── Report Viewer ─────────────────────────────────────────────
function ReportViewer({
  report,
  athleteName,
  onEdit,
  onBack,
  onDelete,
}: {
  report: { id: number; title: string; content: string; reportDate: string };
  athleteName: string;
  onEdit: () => void;
  onBack: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white/50 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">{report.title}</h2>
            <p className="text-white/40 text-sm">
              {athleteName} · {new Date(report.reportDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-white/70 hover:text-white text-sm transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
          {confirmDelete ? (
            <div className="flex gap-2 items-center">
              <span className="text-white/50 text-sm">Delete?</span>
              <button onClick={onDelete} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm transition-colors">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/50 text-sm transition-colors">No</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      <div
        className="prose prose-invert prose-sm max-w-none bg-white/[0.02] border border-white/10 rounded-xl p-6"
        dangerouslySetInnerHTML={{ __html: report.content }}
      />
    </div>
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
          <h3 className="text-lg font-bold text-white">{athleteName}</h3>
          <p className="text-white/40 text-sm">{reports.length} report{reports.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-electric text-black font-semibold text-sm hover:bg-electric/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Report
        </button>
      </div>

      {isLoading ? (
        <div className="text-white/40 text-sm py-8 text-center">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
          <FileText className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No reports yet for {athleteName}</p>
          <button onClick={onNew} className="mt-4 px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/10 text-white/70 text-sm transition-colors">
            Create First Report
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {reports.map((r: any) => (
            <button
              key={r.id}
              onClick={() => onSelect(r)}
              className="w-full text-left p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-electric/30 hover:bg-white/[0.06] transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-electric mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm truncate">{r.title}</p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {new Date(r.reportDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-white/20 group-hover:text-white/40 rotate-180 shrink-0 mt-0.5 transition-colors" />
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

export function PlayerReportsTab() {
  const [view, setView] = useState<View>({ type: "select-athlete" });
  const [athleteSearch, setAthleteSearch] = useState("");

  const { data: allUsers = [] } = trpc.getAllUsers.useQuery();
  const athletes = (allUsers as any[]).filter((u: any) => u.role === "athlete");
  const utils = trpc.useUtils();

  const deleteMutation = trpc.playerReports.delete.useMutation({
    onSuccess: () => {
      if (view.type === "view") {
        utils.playerReports.listByAthlete.invalidate({ athleteId: view.athleteId });
        setView({ type: "list", athleteId: view.athleteId, athleteName: view.athleteName });
      }
    },
  });

  const filteredAthletes = (athletes as any[]).filter((a: any) =>
    a.name?.toLowerCase().includes(athleteSearch.toLowerCase())
  );

  const handleSaved = () => {
    if (view.type === "new" || view.type === "edit") {
      utils.playerReports.listByAthlete.invalidate({ athleteId: view.athleteId });
      setView({ type: "list", athleteId: view.athleteId, athleteName: view.athleteName });
    }
  };

  return (
    <div className="space-y-6">
      {/* Athlete selector sidebar + content */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 shrink-0">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Athletes
          </p>
          <input
            type="text"
            value={athleteSearch}
            onChange={e => setAthleteSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-white/30 text-xs focus:outline-none focus:border-electric/50 mb-2"
          />
          <div className="flex flex-col gap-1">
            {filteredAthletes.map((a: any) => {
              const isActive =
                (view.type === "list" || view.type === "new" || view.type === "view" || view.type === "edit") &&
                view.athleteId === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setView({ type: "list", athleteId: a.id, athleteName: a.name })}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                    isActive
                      ? "bg-electric/20 text-electric border border-electric/30"
                      : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  {a.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {view.type === "select-athlete" && (
            <div className="text-center py-20 text-white/30">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select an athlete to view or create reports</p>
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
    </div>
  );
}
