import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  imageSize?: "small" | "medium" | "large" | "full";
  imageAlign?: "left" | "center" | "right";
  caption?: string;
}

interface CustomDrillLayoutProps {
  blocks: ContentBlock[];
}

export function CustomDrillLayout({ blocks }: CustomDrillLayoutProps) {
  const getImageSizeClass = (size?: string) => {
    switch (size) {
      case "small": return "max-w-[300px]";
      case "medium": return "max-w-[500px]";
      case "large": return "max-w-[700px]";
      case "full": return "w-full";
      default: return "max-w-full";
    }
  };

  const renderBlock = (block: ContentBlock) => {
    switch (block.type) {
      case "text":
        return (
          <p
            key={block.id}
            style={{
              fontSize: block.style?.fontSize,
              fontWeight: block.style?.fontWeight,
              textAlign: block.style?.textAlign as any,
              color: block.style?.color,
            }}
          >
            {block.content}
          </p>
        );
      case "video":
        if (!block.url) return null;
        const videoId = block.url.match(/(?:(?:www\.|m\.)?youtube\.com\/watch\?v=|(?:www\.|m\.)?youtube\.com\/watch\/|youtu\.be\/|(?:www\.|m\.)?youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?:[&?]|$)/)?.[1];
        return videoId ? (
          <div key={block.id} className="aspect-video">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : null;
      case "image":
        if (!block.url) return null;
        return (
          <div key={block.id} className="space-y-1">
            <div className={cn("flex", {
              "justify-start": block.imageAlign === "left",
              "justify-center": block.imageAlign === "center" || !block.imageAlign,
              "justify-end": block.imageAlign === "right",
            })}>
              <img
                src={block.url}
                alt={block.caption || "Content"}
                className={cn(
                  "h-auto rounded object-cover",
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
      case "list":
        return (
          <ul key={block.id} className="list-disc list-inside space-y-1">
            {block.items?.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        );
      case "callout":
        return (
          <div key={block.id} className="bg-red-50 dark:bg-red-900/20 border-l-4 border-[#DC143C] p-4 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-[#DC143C] flex-shrink-0 mt-0.5" />
              <p>{block.content}</p>
            </div>
          </div>
        );
      case "divider":
        return <hr key={block.id} className="my-4 border-t border-border" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="py-6 space-y-4">
        {blocks.map((block) => renderBlock(block))}
      </CardContent>
    </Card>
  );
}
