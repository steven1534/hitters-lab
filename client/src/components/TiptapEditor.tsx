import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  AlignLeft, AlignCenter, AlignRight,
  Code, Code2, Undo, Redo, Save, Loader2
} from "lucide-react";

interface TiptapEditorProps {
  value: string; // HTML string
  onChange: (html: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  placeholder?: string;
}

export function TiptapEditor({ value, onChange, onSave, isSaving, placeholder = "Start writing instructions..." }: TiptapEditorProps) {
  const [showSource, setShowSource] = useState(false);
  const [sourceValue, setSourceValue] = useState(value || "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      setSourceValue(html);
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none min-h-[200px] focus:outline-none px-1 py-2",
      },
    },
  });

  // Sync external value changes into editor (e.g., when drill loads)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && value !== undefined) {
      editor.commands.setContent(value || "");
      setSourceValue(value || "");
    }
  }, [value, editor]);

  const applySourceToEditor = useCallback(() => {
    if (!editor) return;
    editor.commands.setContent(sourceValue);
    onChange(sourceValue);
    setShowSource(false);
  }, [editor, sourceValue, onChange]);

  const toggleSource = () => {
    if (!showSource) {
      // Switching to source: sync current editor HTML to textarea
      setSourceValue(editor?.getHTML() || "");
    }
    setShowSource(!showSource);
  };

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    active,
    disabled,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent editor losing focus
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded text-sm transition-colors ${
        active
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-5 bg-border mx-0.5" />;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-muted/30">
        {/* History */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* Headings */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* Inline formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (Ctrl+B)">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (Ctrl+I)">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline (Ctrl+U)">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code">
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code Block">
          <Code2 className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left">
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center">
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right">
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* Horizontal rule */}
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* HTML Source toggle */}
        <ToolbarButton onClick={toggleSource} active={showSource} title="Toggle HTML Source">
          <span className="text-xs font-mono font-bold px-0.5">&lt;/&gt;</span>
        </ToolbarButton>

        {/* Save button */}
        {onSave && (
          <div className="ml-auto">
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="h-7 text-xs gap-1"
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* Editor / Source */}
      {showSource ? (
        <div className="p-3 space-y-2">
          <div className="text-xs text-muted-foreground mb-1">Edit raw HTML — click "Apply" to render</div>
          <Textarea
            value={sourceValue}
            onChange={(e) => setSourceValue(e.target.value)}
            className="font-mono text-xs min-h-[200px] bg-muted/30 border-border"
            placeholder="<p>Paste or type HTML here...</p>"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={applySourceToEditor} className="text-xs">
              Apply HTML
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowSource(false)} className="text-xs">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 min-h-[200px]">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
}

/**
 * Read-only renderer for HTML content stored by TiptapEditor.
 * Falls back to rendering plain text if content looks like markdown.
 */
export function TiptapRenderer({ content }: { content: string }) {
  if (!content) return null;

  // Detect if it's HTML or plain text/markdown
  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  if (isHtml) {
    return (
      <div
        className="prose prose-invert prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // Plain text / legacy markdown — render as preformatted
  return (
    <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-foreground leading-relaxed">
      {content}
    </div>
  );
}
