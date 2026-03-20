import { useState, useRef, useEffect, useCallback, KeyboardEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Video,
  Image as ImageIcon,
  Minus,
  AlertCircle,
  Quote,
  GripVertical,
  Trash2,
  Plus,
  Copy,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Upload,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { parseMarkdownToBlocks, looksLikeMarkdown, type ParsedBlock } from "@/lib/markdownParser";
import { toast } from "sonner";

// Block type definitions
export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "bulletList"
  | "numberedList"
  | "video"
  | "image"
  | "divider"
  | "callout"
  | "quote";

export interface NotionBlock {
  id: string;
  type: BlockType;
  content: string;
  items?: string[];
  url?: string;
  calloutType?: "info" | "warning" | "success" | "error";
  // Image-specific properties
  imageSize?: "small" | "medium" | "large" | "full";
  imageAlign?: "left" | "center" | "right";
  caption?: string;
}

interface BlockTypeOption {
  type: BlockType;
  label: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string;
}

const BLOCK_TYPES: BlockTypeOption[] = [
  {
    type: "paragraph",
    label: "Text",
    description: "Just start writing with plain text",
    icon: <Type className="h-4 w-4" />,
  },
  {
    type: "heading1",
    label: "Heading 1",
    description: "Big section heading",
    icon: <Heading1 className="h-4 w-4" />,
    shortcut: "#",
  },
  {
    type: "heading2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: <Heading2 className="h-4 w-4" />,
    shortcut: "##",
  },
  {
    type: "heading3",
    label: "Heading 3",
    description: "Small section heading",
    icon: <Heading3 className="h-4 w-4" />,
    shortcut: "###",
  },
  {
    type: "heading4",
    label: "Heading 4",
    description: "Smallest section heading",
    icon: <Heading4 className="h-4 w-4" />,
    shortcut: "####",
  },
  {
    type: "bulletList",
    label: "Bulleted List",
    description: "Create a simple bulleted list",
    icon: <List className="h-4 w-4" />,
    shortcut: "-",
  },
  {
    type: "numberedList",
    label: "Numbered List",
    description: "Create a numbered list",
    icon: <ListOrdered className="h-4 w-4" />,
    shortcut: "1.",
  },
  {
    type: "quote",
    label: "Quote",
    description: "Capture a quote",
    icon: <Quote className="h-4 w-4" />,
    shortcut: ">",
  },
  {
    type: "callout",
    label: "Callout",
    description: "Make writing stand out",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  {
    type: "divider",
    label: "Divider",
    description: "Visually divide blocks",
    icon: <Minus className="h-4 w-4" />,
    shortcut: "---",
  },
  {
    type: "video",
    label: "Video",
    description: "Embed a YouTube video",
    icon: <Video className="h-4 w-4" />,
  },
  {
    type: "image",
    label: "Image",
    description: "Upload or embed an image",
    icon: <ImageIcon className="h-4 w-4" />,
  },
];

interface NotionBlockEditorProps {
  blocks: NotionBlock[];
  onChange: (blocks: NotionBlock[]) => void;
  readOnly?: boolean;
}

// Image upload component used inside image blocks
function ImageBlockUploader({ onImageUploaded }: { onImageUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.imageUpload.uploadImage.useMutation();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10MB");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `drill-images/${timestamp}-${randomSuffix}-${file.name}`;

      const { url } = await uploadMutation.mutateAsync({
        fileKey,
        fileData: Array.from(buffer),
        mimeType: file.type,
      });
      onImageUploaded(url);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  };

  return (
    <div
      className={cn(
        "w-full border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
        dragOver
          ? "border-secondary bg-secondary/10"
          : "border-white/15 hover:border-white/30 hover:bg-white/5"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          <span className="text-sm text-muted-foreground">Uploading image...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Click to upload or drag & drop
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, GIF, WebP up to 10MB
            </p>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  );
}

// Image toolbar for sizing and alignment
function ImageToolbar({
  imageSize,
  imageAlign,
  onSizeChange,
  onAlignChange,
  onRemove,
}: {
  imageSize: string;
  imageAlign: string;
  onSizeChange: (size: "small" | "medium" | "large" | "full") => void;
  onAlignChange: (align: "left" | "center" | "right") => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-white/15 rounded-lg p-1 shadow-lg">
      {/* Size controls */}
      <div className="flex items-center gap-0.5 border-r border-white/10 pr-1 mr-1">
        {(["small", "medium", "large", "full"] as const).map((size) => (
          <button
            key={size}
            onClick={() => onSizeChange(size)}
            className={cn(
              "px-2 py-1 rounded text-xs font-medium transition-colors capitalize",
              imageSize === size
                ? "bg-secondary/20 text-secondary"
                : "text-muted-foreground hover:text-foreground hover:bg-white/10"
            )}
            title={`${size} width`}
          >
            {size === "small" ? "S" : size === "medium" ? "M" : size === "large" ? "L" : "Full"}
          </button>
        ))}
      </div>

      {/* Alignment controls */}
      <div className="flex items-center gap-0.5 border-r border-white/10 pr-1 mr-1">
        <button
          onClick={() => onAlignChange("left")}
          className={cn(
            "p-1.5 rounded transition-colors",
            imageAlign === "left"
              ? "bg-secondary/20 text-secondary"
              : "text-muted-foreground hover:text-foreground hover:bg-white/10"
          )}
          title="Align left"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onAlignChange("center")}
          className={cn(
            "p-1.5 rounded transition-colors",
            imageAlign === "center"
              ? "bg-secondary/20 text-secondary"
              : "text-muted-foreground hover:text-foreground hover:bg-white/10"
          )}
          title="Align center"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onAlignChange("right")}
          className={cn(
            "p-1.5 rounded transition-colors",
            imageAlign === "right"
              ? "bg-secondary/20 text-secondary"
              : "text-muted-foreground hover:text-foreground hover:bg-white/10"
          )}
          title="Align right"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="p-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors"
        title="Remove image"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// Slash command menu component
function SlashMenu({
  isOpen,
  position,
  searchQuery,
  onSelect,
  onClose,
  selectedIndex,
}: {
  isOpen: boolean;
  position: { top: number; left: number };
  searchQuery: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
  selectedIndex: number;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredTypes = BLOCK_TYPES.filter(
    (bt) =>
      bt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bt.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || filteredTypes.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-72 glass-card rounded-lg shadow-xl border border-white/10 overflow-hidden animate-fade-in-up"
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-2 border-b border-white/10">
        <span className="text-xs text-muted-foreground font-medium">
          BASIC BLOCKS
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto p-1">
        {filteredTypes.map((bt, index) => (
          <button
            key={bt.type}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
              index === selectedIndex
                ? "bg-secondary/20 text-white"
                : "hover:bg-white/5 text-foreground"
            )}
            onClick={() => onSelect(bt.type)}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-md bg-white/10 flex items-center justify-center">
              {bt.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{bt.label}</div>
              <div className="text-xs text-muted-foreground truncate">
                {bt.description}
              </div>
            </div>
            {bt.shortcut && (
              <span className="text-xs text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
                {bt.shortcut}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Individual block component - using controlled inputs
function BlockItem({
  block,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBelow,
  onDragStart,
  onDragOver,
  onDragEnd,
  onKeyDown,
  onOpenSlashMenu,
  readOnly,
}: {
  block: NotionBlock;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<NotionBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBelow: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, inputRef: HTMLInputElement | HTMLTextAreaElement | null) => void;
  onOpenSlashMenu: (rect: DOMRect) => void;
  readOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState("");

  const handleContentChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Check for slash command at the start
    if (value === "/" && block.content === "") {
      const rect = e.target.getBoundingClientRect();
      onOpenSlashMenu(rect);
      return;
    }
    
    onUpdate({ content: value });
  };

  const handleKeyDownLocal = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Check for slash command
    if (e.key === "/" && block.content === "") {
      e.preventDefault();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      onOpenSlashMenu(rect);
      return;
    }
    
    onKeyDown(e, inputRef.current);
  };

  const handleListItemChange = (itemIndex: number, value: string) => {
    const newItems = [...(block.items || [])];
    newItems[itemIndex] = value;
    onUpdate({ items: newItems });
  };

  const addListItem = (afterIndex?: number) => {
    const newItems = [...(block.items || [])];
    const insertIndex = afterIndex !== undefined ? afterIndex + 1 : newItems.length;
    newItems.splice(insertIndex, 0, "");
    onUpdate({ items: newItems });
  };

  const removeListItem = (itemIndex: number) => {
    const newItems = (block.items || []).filter((_, i) => i !== itemIndex);
    onUpdate({ items: newItems.length > 0 ? newItems : [""] });
  };

  // Get input styles based on block type
  const getInputStyles = () => {
    switch (block.type) {
      case "heading1":
        return "text-3xl font-bold";
      case "heading2":
        return "text-2xl font-bold";
      case "heading3":
        return "text-xl font-semibold";
      case "heading4":
        return "text-lg font-semibold";
      case "quote":
        return "italic text-foreground/80";
      default:
        return "text-base";
    }
  };

  // Get image size class
  const getImageSizeClass = (size?: string) => {
    switch (size) {
      case "small": return "max-w-[300px]";
      case "medium": return "max-w-[500px]";
      case "large": return "max-w-[700px]";
      case "full": return "w-full";
      default: return "max-w-full";
    }
  };

  // Get image alignment class
  const getImageAlignClass = (align?: string) => {
    switch (align) {
      case "left": return "mr-auto";
      case "center": return "mx-auto";
      case "right": return "ml-auto";
      default: return "mx-auto";
    }
  };

  // Render different block types
  const renderBlockContent = () => {
    if (readOnly) {
      return renderReadOnlyContent();
    }

    switch (block.type) {
      case "paragraph":
        return (
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={block.content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDownLocal}
            onFocus={onSelect}
            placeholder="Type '/' for commands, or start writing..."
            className={cn(
              "w-full bg-transparent border-0 p-0 resize-none outline-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/50",
              getInputStyles()
            )}
            rows={1}
            style={{ minHeight: "1.5em" }}
          />
        );

      case "heading1":
      case "heading2":
      case "heading3":
      case "heading4":
        return (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={block.content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDownLocal}
            onFocus={onSelect}
            placeholder={`${block.type.replace("heading", "Heading ")}...`}
            className={cn(
              "w-full bg-transparent border-0 p-0 h-auto outline-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/50",
              getInputStyles()
            )}
          />
        );

      case "bulletList":
        return (
          <ul className="space-y-2 list-none w-full">
            {(block.items || [""]).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 group">
                <span className="text-secondary mt-2.5 text-lg">•</span>
                <Input
                  value={item}
                  onChange={(e) => handleListItemChange(idx, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addListItem(idx);
                    } else if (e.key === "Backspace" && item === "" && (block.items?.length || 0) > 1) {
                      e.preventDefault();
                      removeListItem(idx);
                    }
                  }}
                  className="flex-1 bg-transparent border-0 p-0 h-auto outline-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/50"
                  placeholder="List item..."
                />
                <button
                  onClick={() => removeListItem(idx)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity p-1"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
            <button
              onClick={() => addListItem()}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ml-6"
            >
              <Plus className="h-3 w-3" /> Add item
            </button>
          </ul>
        );

      case "numberedList":
        return (
          <ol className="space-y-2 list-none w-full">
            {(block.items || [""]).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 group">
                <span className="text-secondary font-medium min-w-[1.5rem] mt-2">
                  {idx + 1}.
                </span>
                <Input
                  value={item}
                  onChange={(e) => handleListItemChange(idx, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addListItem(idx);
                    } else if (e.key === "Backspace" && item === "" && (block.items?.length || 0) > 1) {
                      e.preventDefault();
                      removeListItem(idx);
                    }
                  }}
                  className="flex-1 bg-transparent border-0 p-0 h-auto outline-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/50"
                  placeholder="List item..."
                />
                <button
                  onClick={() => removeListItem(idx)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity p-1"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
            <button
              onClick={() => addListItem()}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ml-8"
            >
              <Plus className="h-3 w-3" /> Add item
            </button>
          </ol>
        );

      case "quote":
        return (
          <div className="border-l-4 border-secondary pl-4 w-full">
            <Textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={block.content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDownLocal}
              onFocus={onSelect}
              placeholder="Enter a quote..."
              className={cn(
                "w-full bg-transparent border-0 p-0 resize-none outline-none focus-visible:ring-0 placeholder:text-muted-foreground/50",
                getInputStyles()
              )}
              rows={1}
            />
          </div>
        );

      case "callout":
        const calloutStyles = {
          info: "bg-[#DC143C]/10 border-[#DC143C]/30 text-[#E8425A]",
          warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
          success: "bg-green-500/10 border-green-500/30 text-green-400",
          error: "bg-red-500/10 border-red-500/30 text-red-400",
        };
        const calloutType = block.calloutType || "info";
        return (
          <div className={cn("rounded-lg border p-4 w-full", calloutStyles[calloutType])}>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <Textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  value={block.content}
                  onChange={handleContentChange}
                  onKeyDown={handleKeyDownLocal}
                  onFocus={onSelect}
                  placeholder="Type your callout message..."
                  className="w-full bg-transparent border-0 p-0 resize-none outline-none focus-visible:ring-0 placeholder:text-current/50"
                  rows={1}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3 ml-8">
              {(["info", "warning", "success", "error"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => onUpdate({ calloutType: type })}
                  className={cn(
                    "px-2 py-1 rounded text-xs capitalize transition-colors",
                    calloutType === type
                      ? "bg-white/20 text-white"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        );

      case "divider":
        return (
          <div className="py-4 w-full">
            <hr className="border-white/20" />
          </div>
        );

      case "video":
        return (
          <div className="w-full space-y-3">
            <Input
              value={block.url || ""}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="Paste YouTube URL..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-foreground outline-none focus:border-secondary transition-colors"
            />
            {block.url && renderVideoPreview(block.url)}
          </div>
        );

      case "image":
        return (
          <div className="w-full space-y-3">
            {!block.url ? (
              /* No image yet - show upload area and URL option */
              <div className="space-y-3">
                <ImageBlockUploader
                  onImageUploaded={(url) => {
                    onUpdate({ url, imageSize: "large", imageAlign: "center" });
                  }}
                />
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                {showUrlInput ? (
                  <div className="flex gap-2">
                    <Input
                      value={urlInputValue}
                      onChange={(e) => setUrlInputValue(e.target.value)}
                      placeholder="Paste image URL..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-foreground outline-none focus:border-secondary transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && urlInputValue.trim()) {
                          onUpdate({ url: urlInputValue.trim(), imageSize: "large", imageAlign: "center" });
                          setUrlInputValue("");
                          setShowUrlInput(false);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (urlInputValue.trim()) {
                          onUpdate({ url: urlInputValue.trim(), imageSize: "large", imageAlign: "center" });
                          setUrlInputValue("");
                          setShowUrlInput(false);
                        }
                      }}
                      className="bg-white/5 border-white/10"
                    >
                      Embed
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowUrlInput(false); setUrlInputValue(""); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowUrlInput(true)}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Embed from URL
                  </button>
                )}
              </div>
            ) : (
              /* Image is loaded - show image with toolbar */
              <div className="space-y-2">
                {/* Image toolbar */}
                <div className="flex justify-center">
                  <ImageToolbar
                    imageSize={block.imageSize || "large"}
                    imageAlign={block.imageAlign || "center"}
                    onSizeChange={(size) => onUpdate({ imageSize: size })}
                    onAlignChange={(align) => onUpdate({ imageAlign: align })}
                    onRemove={() => onUpdate({ url: undefined, caption: undefined })}
                  />
                </div>

                {/* Image */}
                <div className={cn("flex", {
                  "justify-start": block.imageAlign === "left",
                  "justify-center": block.imageAlign === "center" || !block.imageAlign,
                  "justify-end": block.imageAlign === "right",
                })}>
                  <img
                    src={block.url}
                    alt={block.caption || "Block image"}
                    className={cn(
                      "rounded-lg object-cover transition-all",
                      getImageSizeClass(block.imageSize)
                    )}
                  />
                </div>

                {/* Caption */}
                <div className={cn("flex", {
                  "justify-start": block.imageAlign === "left",
                  "justify-center": block.imageAlign === "center" || !block.imageAlign,
                  "justify-end": block.imageAlign === "right",
                })}>
                  <Input
                    value={block.caption || ""}
                    onChange={(e) => onUpdate({ caption: e.target.value })}
                    placeholder="Add a caption..."
                    className={cn(
                      "bg-transparent border-0 p-0 h-auto text-sm text-muted-foreground italic outline-none focus-visible:ring-0 placeholder:text-muted-foreground/40 text-center",
                      getImageSizeClass(block.imageSize)
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderReadOnlyContent = () => {
    switch (block.type) {
      case "paragraph":
        return <p className="text-foreground leading-relaxed whitespace-pre-wrap">{block.content}</p>;
      case "heading1":
        return <h1 className="text-3xl font-bold text-foreground">{block.content}</h1>;
      case "heading2":
        return <h2 className="text-2xl font-bold text-foreground">{block.content}</h2>;
      case "heading3":
        return <h3 className="text-xl font-semibold text-foreground">{block.content}</h3>;
      case "heading4":
        return <h4 className="text-lg font-semibold text-foreground">{block.content}</h4>;
      case "bulletList":
        return (
          <ul className="space-y-1">
            {(block.items || []).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-secondary mt-1.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        );
      case "numberedList":
        return (
          <ol className="space-y-1">
            {(block.items || []).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-secondary font-medium min-w-[1.5rem]">{idx + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        );
      case "quote":
        return (
          <blockquote className="border-l-4 border-secondary pl-4 text-foreground/80 italic">
            {block.content}
          </blockquote>
        );
      case "callout":
        const calloutStylesRO = {
          info: "bg-[#DC143C]/10 border-[#DC143C]/30 text-[#E8425A]",
          warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
          success: "bg-green-500/10 border-green-500/30 text-green-400",
          error: "bg-red-500/10 border-red-500/30 text-red-400",
        };
        return (
          <div className={cn("rounded-lg border p-4", calloutStylesRO[block.calloutType || "info"])}>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{block.content}</span>
            </div>
          </div>
        );
      case "divider":
        return <hr className="border-white/10 my-4" />;
      case "video":
        return block.url ? renderVideoPreview(block.url) : null;
      case "image":
        if (!block.url) return null;
        return (
          <div className="space-y-1">
            <div className={cn("flex", {
              "justify-start": block.imageAlign === "left",
              "justify-center": block.imageAlign === "center" || !block.imageAlign,
              "justify-end": block.imageAlign === "right",
            })}>
              <img
                src={block.url}
                alt={block.caption || "Block image"}
                className={cn(
                  "rounded-lg object-cover",
                  getImageSizeClass(block.imageSize)
                )}
              />
            </div>
            {block.caption && (
              <p className={cn("text-sm text-muted-foreground italic", {
                "text-left": block.imageAlign === "left",
                "text-center": block.imageAlign === "center" || !block.imageAlign,
                "text-right": block.imageAlign === "right",
              })}>
                {block.caption}
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const renderVideoPreview = (url: string) => {
    const videoId = extractYouTubeId(url);
    if (!videoId) return <p className="text-red-400 text-sm">Invalid YouTube URL</p>;
    return (
      <div className="aspect-video rounded-lg overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="w-full h-full"
          allowFullScreen
        />
      </div>
    );
  };

  if (readOnly) {
    return (
      <div className="py-1">
        {renderBlockContent()}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex items-start gap-2 py-1 px-2 -mx-2 rounded-lg transition-colors",
        isSelected && "bg-white/5"
      )}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onClick={onSelect}
    >
      {/* Drag handle and add button */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddBelow();
          }}
          className="p-1 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded transition-colors"
          title="Add block below"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          className="p-1 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded cursor-grab active:cursor-grabbing transition-colors"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Block content */}
      <div className="flex-1 min-w-0">{renderBlockContent()}</div>

      {/* Block menu */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-card border-white/10">
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMoveUp}>
              <ChevronUp className="h-4 w-4 mr-2" /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMoveDown}>
              <ChevronDown className="h-4 w-4 mr-2" /> Move down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-400">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Helper function to extract YouTube video ID
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:(?:www\.|m\.)?youtube\.com\/watch\?v=|youtu\.be\/|(?:www\.|m\.)?youtube\.com\/embed\/|(?:www\.|m\.)?youtube\.com\/watch\/)([a-zA-Z0-9_-]{11})(?:[&?\s]|$)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Main editor component
export function NotionBlockEditor({
  blocks,
  onChange,
  readOnly = false,
}: NotionBlockEditorProps) {
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashSearchQuery, setSlashSearchQuery] = useState("");
  const [slashMenuSelectedIndex, setSlashMenuSelectedIndex] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const createBlock = (type: BlockType): NotionBlock => ({
    id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    content: "",
    items: type === "bulletList" || type === "numberedList" ? [""] : undefined,
    calloutType: type === "callout" ? "info" : undefined,
    imageSize: type === "image" ? "large" : undefined,
    imageAlign: type === "image" ? "center" : undefined,
  });

  const addBlock = (type: BlockType, afterIndex?: number) => {
    const newBlock = createBlock(type);
    const newBlocks = [...blocks];
    const insertIndex = afterIndex !== undefined ? afterIndex + 1 : blocks.length;
    newBlocks.splice(insertIndex, 0, newBlock);
    onChange(newBlocks);
    setSelectedBlockIndex(insertIndex);
    setSlashMenuOpen(false);
    setSlashSearchQuery("");
  };

  const updateBlock = (index: number, updates: Partial<NotionBlock>) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    onChange(newBlocks);
  };

  const deleteBlock = (index: number) => {
    if (blocks.length <= 1) {
      // Keep at least one block
      onChange([createBlock("paragraph")]);
      return;
    }
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
    setSelectedBlockIndex(Math.max(0, index - 1));
  };

  const duplicateBlock = (index: number) => {
    const newBlocks = [...blocks];
    const duplicated = {
      ...blocks[index],
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    newBlocks.splice(index + 1, 0, duplicated);
    onChange(newBlocks);
  };

  const moveBlock = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, moved);
    onChange(newBlocks);
    setSelectedBlockIndex(toIndex);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, index: number, inputRef: HTMLInputElement | HTMLTextAreaElement | null) => {
    const block = blocks[index];

    // Handle Enter to create new block (for non-list blocks)
    if (e.key === "Enter" && !e.shiftKey) {
      if (block.type === "paragraph" || block.type.startsWith("heading") || block.type === "quote") {
        e.preventDefault();
        addBlock("paragraph", index);
      }
    }

    // Handle Backspace on empty block
    if (e.key === "Backspace" && block.content === "" && blocks.length > 1) {
      if (block.type !== "bulletList" && block.type !== "numberedList") {
        e.preventDefault();
        deleteBlock(index);
      }
    }

    // Handle markdown shortcuts on space
    if (e.key === " " && block.type === "paragraph") {
      const content = block.content;
      if (content === "#") {
        e.preventDefault();
        updateBlock(index, { type: "heading1", content: "" });
      } else if (content === "##") {
        e.preventDefault();
        updateBlock(index, { type: "heading2", content: "" });
      } else if (content === "###") {
        e.preventDefault();
        updateBlock(index, { type: "heading3", content: "" });
      } else if (content === "####") {
        e.preventDefault();
        updateBlock(index, { type: "heading4", content: "" });
      } else if (content === "-" || content === "*") {
        e.preventDefault();
        updateBlock(index, { type: "bulletList", content: "", items: [""] });
      } else if (content === "1.") {
        e.preventDefault();
        updateBlock(index, { type: "numberedList", content: "", items: [""] });
      } else if (content === ">") {
        e.preventDefault();
        updateBlock(index, { type: "quote", content: "" });
      } else if (content === "---") {
        e.preventDefault();
        updateBlock(index, { type: "divider", content: "" });
      }
    }
  };

  const handleSlashMenuKeyDown = (e: KeyboardEvent) => {
    if (!slashMenuOpen) return;

    const filteredTypes = BLOCK_TYPES.filter(
      (bt) =>
        bt.label.toLowerCase().includes(slashSearchQuery.toLowerCase()) ||
        bt.description.toLowerCase().includes(slashSearchQuery.toLowerCase())
    );

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSlashMenuSelectedIndex((prev) =>
        prev < filteredTypes.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSlashMenuSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredTypes.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredTypes[slashMenuSelectedIndex]) {
        addBlock(filteredTypes[slashMenuSelectedIndex].type, selectedBlockIndex ?? undefined);
      }
    } else if (e.key === "Escape") {
      setSlashMenuOpen(false);
    }
  };

  const openSlashMenu = (rect: DOMRect, blockIndex: number) => {
    setSlashMenuPosition({ top: rect.bottom + 8, left: rect.left });
    setSlashMenuOpen(true);
    setSlashSearchQuery("");
    setSlashMenuSelectedIndex(0);
    setSelectedBlockIndex(blockIndex);
  };

  // ─── Paste handler: detect Markdown and convert to blocks ───────────
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text/plain");
      if (!text || !looksLikeMarkdown(text)) return; // let default paste handle it

      e.preventDefault();
      e.stopPropagation();

      const parsed: ParsedBlock[] = parseMarkdownToBlocks(text);
      if (parsed.length === 0) return;

      // Cast parsed blocks to NotionBlock (they share the same shape)
      const newBlocks = parsed as unknown as NotionBlock[];

      // If editor is empty (single empty paragraph), replace entirely
      const isEditorEmpty =
        blocks.length === 0 ||
        (blocks.length === 1 &&
          blocks[0].type === "paragraph" &&
          blocks[0].content === "");

      if (isEditorEmpty) {
        onChange(newBlocks);
      } else {
        // Insert after the currently selected block, or append at end
        const insertAfter =
          selectedBlockIndex !== null ? selectedBlockIndex : blocks.length - 1;
        const updated = [
          ...blocks.slice(0, insertAfter + 1),
          ...newBlocks,
          ...blocks.slice(insertAfter + 1),
        ];
        onChange(updated);
        setSelectedBlockIndex(insertAfter + newBlocks.length);
      }

      toast.success(
        `Pasted ${newBlocks.length} block${newBlocks.length !== 1 ? "s" : ""} from Markdown`
      );
    },
    [blocks, onChange, selectedBlockIndex]
  );

  useEffect(() => {
    const el = editorRef.current;
    if (!el || readOnly) return;
    el.addEventListener("paste", handlePaste, true);
    return () => el.removeEventListener("paste", handlePaste, true);
  }, [handlePaste, readOnly]);

  // Initialize with empty paragraph if no blocks
  useEffect(() => {
    if (blocks.length === 0) {
      onChange([createBlock("paragraph")]);
    }
  }, []);

  if (readOnly) {
    return (
      <div className="space-y-2">
        {blocks.map((block, index) => (
          <BlockItem
            key={block.id}
            block={block}
            index={index}
            isSelected={false}
            onSelect={() => {}}
            onUpdate={() => {}}
            onDelete={() => {}}
            onDuplicate={() => {}}
            onMoveUp={() => {}}
            onMoveDown={() => {}}
            onAddBelow={() => {}}
            onDragStart={() => {}}
            onDragOver={() => {}}
            onDragEnd={() => {}}
            onKeyDown={() => {}}
            onOpenSlashMenu={() => {}}
            readOnly
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={editorRef}
      className="min-h-[200px] p-4"
      onKeyDown={handleSlashMenuKeyDown}
    >
      {/* Help text */}
      <div className="text-xs text-muted-foreground mb-4 flex items-center gap-2">
        <span className="bg-white/5 px-2 py-1 rounded">✨</span>
        <span>Type <code className="bg-white/10 px-1 rounded">/</code> for commands, use markdown shortcuts like <code className="bg-white/10 px-1 rounded">#</code>, <code className="bg-white/10 px-1 rounded">-</code>, <code className="bg-white/10 px-1 rounded">1.</code> — or <strong className="text-foreground/70">paste Markdown</strong> from Notion</span>
      </div>

      {blocks.map((block, index) => (
        <BlockItem
          key={block.id}
          block={block}
          index={index}
          isSelected={selectedBlockIndex === index}
          onSelect={() => setSelectedBlockIndex(index)}
          onUpdate={(updates) => updateBlock(index, updates)}
          onDelete={() => deleteBlock(index)}
          onDuplicate={() => duplicateBlock(index)}
          onMoveUp={() => moveBlock(index, index - 1)}
          onMoveDown={() => moveBlock(index, index + 1)}
          onAddBelow={() => addBlock("paragraph", index)}
          onDragStart={() => setDraggedIndex(index)}
          onDragOver={(e) => {
            e.preventDefault();
            if (draggedIndex !== null && draggedIndex !== index) {
              moveBlock(draggedIndex, index);
              setDraggedIndex(index);
            }
          }}
          onDragEnd={() => setDraggedIndex(null)}
          onKeyDown={(e, inputRef) => handleKeyDown(e, index, inputRef)}
          onOpenSlashMenu={(rect) => openSlashMenu(rect, index)}
        />
      ))}

      {/* Add block button */}
      <button
        onClick={() => addBlock("paragraph")}
        className="w-full py-3 mt-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center gap-2 border border-dashed border-white/10"
      >
        <Plus className="h-4 w-4" /> Add a block
      </button>

      {/* Slash command menu */}
      <SlashMenu
        isOpen={slashMenuOpen}
        position={slashMenuPosition}
        searchQuery={slashSearchQuery}
        onSelect={(type) => addBlock(type, selectedBlockIndex ?? undefined)}
        onClose={() => setSlashMenuOpen(false)}
        selectedIndex={slashMenuSelectedIndex}
      />
    </div>
  );
}

export default NotionBlockEditor;
