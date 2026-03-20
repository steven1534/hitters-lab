import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  Save,
  Trash2,
  FileText,
  X,
  Sparkles,
  Edit3,
  Undo2,
  Redo2,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NotionBlockEditor, NotionBlock } from "./NotionBlockEditor";

interface DrillPageBuilderNotionProps {
  drillId: string;
  drillName: string;
  onClose: () => void;
}

// ─── History management for undo/redo ─────────────────────────────────────────
interface HistoryState {
  past: NotionBlock[][];
  present: NotionBlock[];
  future: NotionBlock[][];
}

function useBlockHistory(initialBlocks: NotionBlock[]) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialBlocks,
    future: [],
  });

  const pushState = useCallback((newBlocks: NotionBlock[]) => {
    setHistory((prev) => ({
      past: [...prev.past.slice(-30), prev.present], // Keep last 30 states
      present: newBlocks,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: prev.future.slice(1),
      };
    });
  }, []);

  const reset = useCallback((blocks: NotionBlock[]) => {
    setHistory({ past: [], present: blocks, future: [] });
  }, []);

  return {
    blocks: history.present,
    pushState,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    historyCount: history.past.length,
  };
}

// ─── Block format converters ──────────────────────────────────────────────────
function convertToNotionBlocks(oldBlocks: any[]): NotionBlock[] {
  return oldBlocks.map((block) => {
    const baseBlock: NotionBlock = {
      id:
        block.id ||
        `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "paragraph",
      content: "",
    };

    switch (block.type) {
      case "text":
        if (
          block.style?.fontSize === "24px" ||
          block.style?.fontWeight === "bold"
        ) {
          baseBlock.type = "heading2";
        } else {
          baseBlock.type = "paragraph";
        }
        baseBlock.content = block.content || "";
        break;
      case "video":
        baseBlock.type = "video";
        baseBlock.url = block.url;
        break;
      case "image":
        baseBlock.type = "image";
        baseBlock.url = block.url;
        baseBlock.imageSize = block.imageSize || "large";
        baseBlock.imageAlign = block.imageAlign || "center";
        baseBlock.caption = block.caption || "";
        break;
      case "list":
        baseBlock.type = block.listType === "numbered" ? "numberedList" : "bulletList";
        baseBlock.items = block.items || [""];
        break;
      case "callout":
        baseBlock.type = block.calloutStyle === "quote" ? "quote" : "callout";
        baseBlock.content = block.content || "";
        baseBlock.calloutType = block.calloutType || "info";
        break;
      case "divider":
        baseBlock.type = "divider";
        break;
      default:
        baseBlock.content = block.content || "";
    }

    return baseBlock;
  });
}

function convertFromNotionBlocks(notionBlocks: NotionBlock[]): any[] {
  return notionBlocks.map((block) => {
    const baseBlock: any = {
      id: block.id,
      type: "text",
    };

    switch (block.type) {
      case "paragraph":
        baseBlock.type = "text";
        baseBlock.content = block.content;
        baseBlock.style = {
          fontSize: "16px",
          fontWeight: "normal",
          textAlign: "left",
        };
        break;
      case "heading1":
        baseBlock.type = "text";
        baseBlock.content = block.content;
        baseBlock.style = {
          fontSize: "32px",
          fontWeight: "bold",
          textAlign: "left",
        };
        break;
      case "heading2":
        baseBlock.type = "text";
        baseBlock.content = block.content;
        baseBlock.style = {
          fontSize: "24px",
          fontWeight: "bold",
          textAlign: "left",
        };
        break;
      case "heading3":
        baseBlock.type = "text";
        baseBlock.content = block.content;
        baseBlock.style = {
          fontSize: "20px",
          fontWeight: "bold",
          textAlign: "left",
        };
        break;
      case "heading4":
        baseBlock.type = "text";
        baseBlock.content = block.content;
        baseBlock.style = {
          fontSize: "18px",
          fontWeight: "bold",
          textAlign: "left",
        };
        break;
      case "bulletList":
        baseBlock.type = "list";
        baseBlock.items = block.items;
        break;
      case "numberedList":
        baseBlock.type = "list";
        baseBlock.items = block.items;
        baseBlock.listType = "numbered";
        break;
      case "quote":
        baseBlock.type = "callout";
        baseBlock.content = block.content;
        baseBlock.calloutStyle = "quote";
        break;
      case "callout":
        baseBlock.type = "callout";
        baseBlock.content = block.content;
        baseBlock.calloutType = block.calloutType;
        break;
      case "divider":
        baseBlock.type = "divider";
        break;
      case "video":
        baseBlock.type = "video";
        baseBlock.url = block.url;
        break;
      case "image":
        baseBlock.type = "image";
        baseBlock.url = block.url;
        baseBlock.imageSize = block.imageSize;
        baseBlock.imageAlign = block.imageAlign;
        baseBlock.caption = block.caption;
        break;
      default:
        baseBlock.content = block.content;
    }

    return baseBlock;
  });
}

// ─── Autosave status indicator ────────────────────────────────────────────────
type SaveStatus = "idle" | "saving" | "saved" | "error" | "unsaved";

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const config = {
    idle: { icon: null, text: "", color: "" },
    unsaved: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      text: "Unsaved changes",
      color: "text-amber-400",
    },
    saving: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      text: "Saving...",
      color: "text-muted-foreground",
    },
    saved: {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      text: "Saved",
      color: "text-green-400",
    },
    error: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      text: "Save failed",
      color: "text-red-400",
    },
  };

  const c = config[status];
  if (!c.icon) return null;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${c.color} transition-all`}
      role="status"
      aria-live="polite"
    >
      {c.icon}
      <span>{c.text}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DrillPageBuilderNotion({
  drillId,
  drillName,
  onClose,
}: DrillPageBuilderNotionProps) {
  const [previewMode, setPreviewMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);

  // History-based block management
  const {
    blocks,
    pushState,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    historyCount,
  } = useBlockHistory([]);

  // Fetch existing layout
  const { data: existingLayout } = trpc.drillDetails.getPageLayout.useQuery({
    drillId,
  });
  const saveLayoutMutation = trpc.drillDetails.savePageLayout.useMutation();
  const deleteLayoutMutation = trpc.drillDetails.deletePageLayout.useMutation();

  // Template functionality
  const { data: templates } = trpc.drillDetails.getTemplates.useQuery();
  const createTemplateMutation =
    trpc.drillDetails.createTemplate.useMutation();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  // Load existing layout
  useEffect(() => {
    if (existingLayout?.blocks) {
      const convertedBlocks = convertToNotionBlocks(
        existingLayout.blocks as any[]
      );
      reset(convertedBlocks);
      isInitialLoadRef.current = false;
    } else if (existingLayout !== undefined) {
      isInitialLoadRef.current = false;
    }
  }, [existingLayout, reset]);

  // ─── Autosave logic ───────────────────────────────────────────────────────
  const doSave = useCallback(
    async (blocksToSave: NotionBlock[]) => {
      if (blocksToSave.length === 0) return;
      setSaveStatus("saving");
      try {
        const oldFormatBlocks = convertFromNotionBlocks(blocksToSave);
        await saveLayoutMutation.mutateAsync({
          drillId,
          blocks: oldFormatBlocks,
        });
        setSaveStatus("saved");
        setLastSavedAt(new Date());
        // Reset to idle after 3 seconds
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 3000);
      } catch (error) {
        setSaveStatus("error");
        console.error("[Autosave] Failed:", error);
      }
    },
    [drillId, saveLayoutMutation]
  );

  // Schedule autosave when blocks change (debounced 3 seconds)
  const scheduleAutosave = useCallback(
    (newBlocks: NotionBlock[]) => {
      if (isInitialLoadRef.current) return;
      setSaveStatus("unsaved");
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      autosaveTimerRef.current = setTimeout(() => {
        doSave(newBlocks);
      }, 3000);
    },
    [doSave]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // Handle block changes — push to history + schedule autosave
  const handleBlocksChange = useCallback(
    (newBlocks: NotionBlock[]) => {
      pushState(newBlocks);
      scheduleAutosave(newBlocks);
    },
    [pushState, scheduleAutosave]
  );

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      // Ctrl+S to force save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        doSave(blocks);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, doSave, blocks]);

  // Manual save
  const handleSave = async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    await doSave(blocks);
    toast.success("Layout saved!");
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this custom layout? The drill will revert to the default view."
      )
    ) {
      return;
    }
    try {
      await deleteLayoutMutation.mutateAsync({ drillId });
      reset([]);
      setSaveStatus("idle");
      toast.success("Custom layout deleted");
    } catch (error) {
      toast.error("Failed to delete layout");
      console.error(error);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    try {
      const oldFormatBlocks = convertFromNotionBlocks(blocks);
      await createTemplateMutation.mutateAsync({
        name: templateName,
        description: templateDescription,
        blocks: oldFormatBlocks,
      });
      toast.success("Template saved!");
      setShowTemplateDialog(false);
      setTemplateName("");
      setTemplateDescription("");
    } catch (error) {
      toast.error("Failed to save template");
      console.error(error);
    }
  };

  const handleLoadTemplate = (templateBlocks: any[]) => {
    const convertedBlocks = convertToNotionBlocks(templateBlocks);
    pushState(convertedBlocks);
    scheduleAutosave(convertedBlocks);
    toast.success("Template loaded — autosave will save shortly");
  };

  return (
    <div
      className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 overflow-auto"
      role="dialog"
      aria-label={`Page Builder for ${drillName}`}
    >
      <div className="container max-w-4xl py-6 md:py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-[#DC143C] to-purple-500 flex items-center justify-center shrink-0">
              <Edit3 className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-foreground flex items-center gap-2">
                Page Builder
                <span className="text-[10px] md:text-xs bg-[#DC143C]/20 text-[#DC143C] px-2 py-0.5 rounded-full whitespace-nowrap">
                  Notion-style
                </span>
              </h1>
              <p className="text-muted-foreground text-xs md:text-sm truncate">
                {drillName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SaveStatusIndicator status={saveStatus} />
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-white/10"
              aria-label="Close page builder"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="glass-card rounded-xl p-3 md:p-4 mb-6 space-y-3">
          {/* Top row: Templates + View toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {templates && templates.length > 0 && (
              <Select
                onValueChange={(value) => {
                  const template = templates.find(
                    (t) => t.id === parseInt(value)
                  );
                  if (template) handleLoadTemplate(template.blocks as any[]);
                }}
              >
                <SelectTrigger
                  className="w-[160px] md:w-[180px] bg-white/5 border-white/10 text-sm"
                  aria-label="Load a template"
                >
                  <SelectValue placeholder="Load Template" />
                </SelectTrigger>
                <SelectContent>
                  {/* System (built-in) templates first */}
                  {templates.filter((t: any) => t.isSystem).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Built-in Templates</div>
                      {templates.filter((t: any) => t.isSystem).map((template) => (
                        <SelectItem
                          key={template.id}
                          value={template.id.toString()}
                        >
                          {template.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {/* User-created templates */}
                  {templates.filter((t: any) => !t.isSystem).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1 border-t border-border pt-2">My Templates</div>
                      {templates.filter((t: any) => !t.isSystem).map((template) => (
                        <SelectItem
                          key={template.id}
                          value={template.id.toString()}
                        >
                          {template.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            )}

            <div className="flex-1" />

            {/* Undo / Redo */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={!canUndo}
                className="h-8 w-8 p-0 hover:bg-white/10 disabled:opacity-30"
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={!canRedo}
                className="h-8 w-8 p-0 hover:bg-white/10 disabled:opacity-30"
                aria-label="Redo"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              {historyCount > 0 && (
                <span className="text-[10px] text-muted-foreground px-1">
                  {historyCount} edits
                </span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className={
                previewMode
                  ? "bg-[#DC143C]/20 border-[#DC143C] text-[#DC143C]"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }
              aria-label={previewMode ? "Switch to editing mode" : "Switch to preview mode"}
            >
              <Eye className="h-4 w-4 mr-1.5" />
              {previewMode ? "Edit" : "Preview"}
            </Button>
          </div>

          {/* Bottom row: Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplateDialog(true)}
              disabled={blocks.length === 0}
              className="bg-white/5 border-white/10 hover:bg-white/10 text-xs md:text-sm"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Save Template
            </Button>

            <div className="flex-1" />

            {lastSavedAt && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 hidden sm:flex">
                <Clock className="h-3 w-3" />
                Last saved{" "}
                {lastSavedAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saveLayoutMutation.isPending || saveStatus === "saving"}
              className="bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 text-xs md:text-sm"
              aria-label="Save layout now"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saveLayoutMutation.isPending ? "Saving..." : "Save Now"}
            </Button>

            {blocks.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleteLayoutMutation.isPending}
                className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs md:text-sm"
                aria-label="Delete custom layout"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Instructions banner (shown when empty) */}
        {blocks.length === 0 && !previewMode && (
          <div className="glass-card rounded-xl p-6 mb-6 border border-dashed border-[#DC143C]/30 bg-[#DC143C]/5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-[#DC143C]/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-[#DC143C]" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  Getting Started
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Build a custom drill page by adding content blocks. Start
                  typing in the editor below, or load a template from the
                  toolbar above.
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                      /
                    </kbd>{" "}
                    Block menu
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                      #
                    </kbd>{" "}
                    Heading
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                      -
                    </kbd>{" "}
                    Bullet list
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                      1.
                    </kbd>{" "}
                    Numbered list
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                      Ctrl+Z
                    </kbd>{" "}
                    Undo
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                      Ctrl+S
                    </kbd>{" "}
                    Force save
                  </span>
                </div>
                {templates && templates.length > 0 && (
                  <p className="text-xs text-[#DC143C]">
                    {templates.filter((t: any) => t.isSystem).length} built-in template{templates.filter((t: any) => t.isSystem).length !== 1 ? 's' : ''}
                    {templates.filter((t: any) => !t.isSystem).length > 0 && ` + ${templates.filter((t: any) => !t.isSystem).length} custom`} available — use the
                    dropdown above to get started quickly.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Editor hints (shown when editing with content) */}
        {blocks.length > 0 && !previewMode && (
          <div className="px-4 py-2.5 mb-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
              <Sparkles className="h-3.5 w-3.5 text-[#DC143C] shrink-0" />
              <span>
                Type{" "}
                <kbd className="px-1 py-0.5 bg-white/10 rounded text-[10px]">
                  /
                </kbd>{" "}
                for commands
              </span>
              <span className="text-white/20">|</span>
              <span>
                <kbd className="px-1 py-0.5 bg-white/10 rounded text-[10px]">
                  Ctrl+Z
                </kbd>{" "}
                Undo
              </span>
              <span className="text-white/20">|</span>
              <span>
                <kbd className="px-1 py-0.5 bg-white/10 rounded text-[10px]">
                  Ctrl+S
                </kbd>{" "}
                Save
              </span>
              <span className="text-white/20">|</span>
              <span className="text-[#DC143C]/70">
                Autosave is on
              </span>
            </p>
          </div>
        )}

        {/* Editor */}
        <div className="glass-card rounded-xl overflow-hidden">
          <NotionBlockEditor
            blocks={blocks}
            onChange={handleBlocksChange}
            readOnly={previewMode}
          />
        </div>

        {/* Template Save Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="glass-card border-white/10">
            <DialogHeader>
              <DialogTitle>Save as Template</DialogTitle>
              <DialogDescription>
                Save this layout as a reusable template. Next time you build a
                drill page, you can load it with one click.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Video + Steps Layout"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label htmlFor="template-description">
                  Description (Optional)
                </Label>
                <Textarea
                  id="template-description"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe when to use this template..."
                  rows={3}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowTemplateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAsTemplate}
                disabled={createTemplateMutation.isPending}
                className="bg-[#DC143C] hover:bg-[#DC143C]/80"
              >
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default DrillPageBuilderNotion;
