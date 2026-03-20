import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Type,
  Video,
  Image as ImageIcon,
  List,
  AlertCircle,
  Minus,
  Eye,
  Save,
  Trash2,
  GripVertical,
  Plus,
  FileText,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { ImageUploadForPageBuilder } from "./ImageUploadForPageBuilder";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ContentBlock {
  id: string;
  type: "text" | "video" | "image" | "list" | "callout" | "divider";
  content?: string;
  url?: string;
  items?: string[];
  style?: {
    fontSize?: string;
    fontWeight?: string;
    textAlign?: string;
    color?: string;
  };
}

interface DrillPageBuilderProps {
  drillId: string;
  drillName: string;
  onClose: () => void;
}

export function DrillPageBuilder({ drillId, drillName, onClose }: DrillPageBuilderProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Fetch existing layout
  const { data: existingLayout } = trpc.drillDetails.getPageLayout.useQuery({ drillId });
  const saveLayoutMutation = trpc.drillDetails.savePageLayout.useMutation();
  const deleteLayoutMutation = trpc.drillDetails.deletePageLayout.useMutation();
  
  // Template functionality
  const { data: templates } = trpc.drillDetails.getTemplates.useQuery();
  const createTemplateMutation = trpc.drillDetails.createTemplate.useMutation();
  const deleteTemplateMutation = trpc.drillDetails.deleteTemplate.useMutation();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  useEffect(() => {
    if (existingLayout?.blocks) {
      setBlocks(existingLayout.blocks as ContentBlock[]);
    }
  }, [existingLayout]);

  const addBlock = (type: ContentBlock["type"]) => {
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}`,
      type,
      content: type === "text" ? "Enter your text here..." : undefined,
      url: type === "video" || type === "image" ? "" : undefined,
      items: type === "list" ? ["Item 1", "Item 2"] : undefined,
      style: type === "text" ? { fontSize: "16px", fontWeight: "normal", textAlign: "left" } : undefined,
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    setBlocks(blocks.map(block => block.id === id ? { ...block, ...updates } : block));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(block => block.id !== id));
  };

  const moveBlock = (fromIndex: number, toIndex: number) => {
    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, movedBlock);
    setBlocks(newBlocks);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      moveBlock(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    try {
      await saveLayoutMutation.mutateAsync({ drillId, blocks });
      toast.success("Drill page layout saved successfully!");
    } catch (error) {
      toast.error("Failed to save layout");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this custom layout? The drill will revert to the default view.")) {
      return;
    }
    try {
      await deleteLayoutMutation.mutateAsync({ drillId });
      setBlocks([]);
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
      await createTemplateMutation.mutateAsync({
        name: templateName,
        description: templateDescription,
        blocks,
      });
      toast.success("Template saved successfully!");
      setShowTemplateDialog(false);
      setTemplateName("");
      setTemplateDescription("");
    } catch (error) {
      toast.error("Failed to save template");
      console.error(error);
    }
  };

  const handleLoadTemplate = (templateBlocks: any[]) => {
    setBlocks(templateBlocks.map(block => ({
      ...block,
      id: `block-${Date.now()}-${Math.random()}`,
    })));
    toast.success("Template loaded");
  };

  const renderBlockEditor = (block: ContentBlock, index: number) => {
    return (
      <Card
        key={block.id}
        className="mb-4"
        draggable
        onDragStart={() => handleDragStart(index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragEnd={handleDragEnd}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
            <CardTitle className="text-sm font-medium">
              {block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteBlock(block.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {block.type === "text" && (
            <div className="space-y-2">
              <Textarea
                value={block.content || ""}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                placeholder="Enter text content..."
                rows={4}
              />
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={block.style?.fontSize || "16px"}
                  onValueChange={(value) =>
                    updateBlock(block.id, { style: { ...block.style, fontSize: value } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14px">Small</SelectItem>
                    <SelectItem value="16px">Normal</SelectItem>
                    <SelectItem value="18px">Large</SelectItem>
                    <SelectItem value="24px">Heading</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={block.style?.fontWeight || "normal"}
                  onValueChange={(value) =>
                    updateBlock(block.id, { style: { ...block.style, fontWeight: value } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Weight" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={block.style?.textAlign || "left"}
                  onValueChange={(value) =>
                    updateBlock(block.id, { style: { ...block.style, textAlign: value } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Align" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="color"
                  value={block.style?.color || "#000000"}
                  onChange={(e) =>
                    updateBlock(block.id, { style: { ...block.style, color: e.target.value } })
                  }
                  className="h-10"
                />
              </div>
            </div>
          )}
          {block.type === "video" && (
            <Input
              value={block.url || ""}
              onChange={(e) => updateBlock(block.id, { url: e.target.value })}
              placeholder="Enter YouTube URL..."
            />
          )}
          {block.type === "image" && (
            <div className="space-y-2">
              <Input
                value={block.url || ""}
                onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                placeholder="Enter image URL or upload below..."
              />
              <ImageUploadForPageBuilder
                onImageUploaded={(url) => updateBlock(block.id, { url })}
              />
            </div>
          )}
          {block.type === "list" && (
            <div className="space-y-2">
              {block.items?.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) => {
                      const newItems = [...(block.items || [])];
                      newItems[idx] = e.target.value;
                      updateBlock(block.id, { items: newItems });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newItems = block.items?.filter((_, i) => i !== idx);
                      updateBlock(block.id, { items: newItems });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newItems = [...(block.items || []), "New item"];
                  updateBlock(block.id, { items: newItems });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          )}
          {block.type === "callout" && (
            <Textarea
              value={block.content || ""}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Enter callout text..."
              rows={3}
            />
          )}
          {block.type === "divider" && (
            <div className="text-sm text-muted-foreground">Horizontal divider line</div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderBlockPreview = (block: ContentBlock) => {
    switch (block.type) {
      case "text":
        return (
          <p
            style={{
              fontSize: block.style?.fontSize,
              fontWeight: block.style?.fontWeight,
              textAlign: block.style?.textAlign as any,
            }}
          >
            {block.content}
          </p>
        );
      case "video":
        if (!block.url) return <p className="text-muted-foreground">No video URL provided</p>;
        const videoId = block.url.match(/(?:(?:www\.|m\.)?youtube\.com\/watch\?v=|(?:www\.|m\.)?youtube\.com\/watch\/|youtu\.be\/|(?:www\.|m\.)?youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?:[&?]|$)/)?.[1];
        return videoId ? (
          <div className="aspect-video">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="text-muted-foreground">Invalid YouTube URL</p>
        );
      case "image":
        return block.url ? (
          <img src={block.url} alt="Content" className="max-w-full h-auto rounded" />
        ) : (
          <p className="text-muted-foreground">No image URL provided</p>
        );
      case "list":
        return (
          <ul className="list-disc list-inside space-y-1">
            {block.items?.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        );
      case "callout":
        return (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-[#DC143C] p-4 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-[#DC143C] flex-shrink-0 mt-0.5" />
              <p>{block.content}</p>
            </div>
          </div>
        );
      case "divider":
        return <hr className="my-4 border-t border-border" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="container max-w-6xl py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Drill Page Builder</h1>
            <p className="text-muted-foreground">{drillName}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTemplateDialog(true)} disabled={blocks.length === 0}>
              <FileText className="h-4 w-4 mr-2" />
              Save as Template
            </Button>
            {templates && templates.length > 0 && (
              <Select onValueChange={(value) => {
                const template = templates.find(t => t.id === parseInt(value));
                if (template) handleLoadTemplate(template.blocks as any[]);
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Load Template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? "Edit" : "Preview"}
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={saveLayoutMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            {blocks.length > 0 && (
              <Button variant="outline" onClick={handleDelete} disabled={deleteLayoutMutation.isPending}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Layout
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {!previewMode ? (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Add Content Block</h2>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => addBlock("text")}>
                  <Type className="h-4 w-4 mr-2" />
                  Text
                </Button>
                <Button variant="outline" size="sm" onClick={() => addBlock("video")}>
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </Button>
                <Button variant="outline" size="sm" onClick={() => addBlock("image")}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Image
                </Button>
                <Button variant="outline" size="sm" onClick={() => addBlock("list")}>
                  <List className="h-4 w-4 mr-2" />
                  List
                </Button>
                <Button variant="outline" size="sm" onClick={() => addBlock("callout")}>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Callout
                </Button>
                <Button variant="outline" size="sm" onClick={() => addBlock("divider")}>
                  <Minus className="h-4 w-4 mr-2" />
                  Divider
                </Button>
              </div>
            </div>

            <div>
              {blocks.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No blocks yet. Add content blocks above to start building your drill page.
                  </CardContent>
                </Card>
              ) : (
                blocks.map((block, index) => renderBlockEditor(block, index))
              )}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-6 space-y-4">
              {blocks.map((block) => (
                <div key={block.id}>{renderBlockPreview(block)}</div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Template Save Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save as Template</DialogTitle>
              <DialogDescription>
                Save this layout as a reusable template for future drills.
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
                />
              </div>
              <div>
                <Label htmlFor="template-description">Description (Optional)</Label>
                <Textarea
                  id="template-description"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe when to use this template..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAsTemplate} disabled={createTemplateMutation.isPending}>
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}