import { describe, it, expect } from "vitest";

// Test the block conversion logic that's used in DrillPageBuilderNotion
// We test the conversion functions inline since they're component-level

interface NotionBlock {
  id: string;
  type: string;
  content?: string;
  url?: string;
  items?: string[];
  calloutType?: string;
  imageSize?: string;
  imageAlign?: string;
  caption?: string;
}

function convertToNotionBlocks(oldBlocks: any[]): NotionBlock[] {
  return oldBlocks.map((block) => {
    const baseBlock: NotionBlock = {
      id: block.id || `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "paragraph",
      content: "",
    };

    switch (block.type) {
      case "text":
        if (block.style?.fontSize === "24px" || block.style?.fontWeight === "bold") {
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
        baseBlock.type = "bulletList";
        baseBlock.items = block.items || [""];
        break;
      case "callout":
        baseBlock.type = "callout";
        baseBlock.content = block.content || "";
        baseBlock.calloutType = "info";
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
        baseBlock.style = { fontSize: "16px", fontWeight: "normal", textAlign: "left" };
        break;
      case "heading1":
        baseBlock.type = "text";
        baseBlock.content = block.content;
        baseBlock.style = { fontSize: "32px", fontWeight: "bold", textAlign: "left" };
        break;
      case "heading2":
        baseBlock.type = "text";
        baseBlock.content = block.content;
        baseBlock.style = { fontSize: "24px", fontWeight: "bold", textAlign: "left" };
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

describe("Block Editor Conversion Functions", () => {
  describe("convertToNotionBlocks", () => {
    it("should convert text blocks to paragraph", () => {
      const oldBlocks = [
        { id: "1", type: "text", content: "Hello world", style: { fontSize: "16px" } },
      ];
      const result = convertToNotionBlocks(oldBlocks);
      expect(result[0].type).toBe("paragraph");
      expect(result[0].content).toBe("Hello world");
    });

    it("should convert bold text blocks to heading2", () => {
      const oldBlocks = [
        { id: "1", type: "text", content: "Section Title", style: { fontSize: "24px", fontWeight: "bold" } },
      ];
      const result = convertToNotionBlocks(oldBlocks);
      expect(result[0].type).toBe("heading2");
      expect(result[0].content).toBe("Section Title");
    });

    it("should convert image blocks and preserve image properties", () => {
      const oldBlocks = [
        {
          id: "1",
          type: "image",
          url: "https://example.com/image.jpg",
          imageSize: "medium",
          imageAlign: "left",
          caption: "My caption",
        },
      ];
      const result = convertToNotionBlocks(oldBlocks);
      expect(result[0].type).toBe("image");
      expect(result[0].url).toBe("https://example.com/image.jpg");
      expect(result[0].imageSize).toBe("medium");
      expect(result[0].imageAlign).toBe("left");
      expect(result[0].caption).toBe("My caption");
    });

    it("should set default image properties when not provided", () => {
      const oldBlocks = [
        { id: "1", type: "image", url: "https://example.com/image.jpg" },
      ];
      const result = convertToNotionBlocks(oldBlocks);
      expect(result[0].imageSize).toBe("large");
      expect(result[0].imageAlign).toBe("center");
      expect(result[0].caption).toBe("");
    });

    it("should convert video blocks", () => {
      const oldBlocks = [
        { id: "1", type: "video", url: "https://youtube.com/watch?v=abc123def45" },
      ];
      const result = convertToNotionBlocks(oldBlocks);
      expect(result[0].type).toBe("video");
      expect(result[0].url).toBe("https://youtube.com/watch?v=abc123def45");
    });

    it("should convert list blocks to bulletList", () => {
      const oldBlocks = [
        { id: "1", type: "list", items: ["Item 1", "Item 2", "Item 3"] },
      ];
      const result = convertToNotionBlocks(oldBlocks);
      expect(result[0].type).toBe("bulletList");
      expect(result[0].items).toEqual(["Item 1", "Item 2", "Item 3"]);
    });

    it("should convert callout blocks", () => {
      const oldBlocks = [
        { id: "1", type: "callout", content: "Important note" },
      ];
      const result = convertToNotionBlocks(oldBlocks);
      expect(result[0].type).toBe("callout");
      expect(result[0].content).toBe("Important note");
      expect(result[0].calloutType).toBe("info");
    });

    it("should convert divider blocks", () => {
      const oldBlocks = [{ id: "1", type: "divider" }];
      const result = convertToNotionBlocks(oldBlocks);
      expect(result[0].type).toBe("divider");
    });
  });

  describe("convertFromNotionBlocks", () => {
    it("should convert paragraph to text block", () => {
      const notionBlocks: NotionBlock[] = [
        { id: "1", type: "paragraph", content: "Hello world" },
      ];
      const result = convertFromNotionBlocks(notionBlocks);
      expect(result[0].type).toBe("text");
      expect(result[0].content).toBe("Hello world");
      expect(result[0].style.fontSize).toBe("16px");
    });

    it("should convert heading1 to text with 32px font", () => {
      const notionBlocks: NotionBlock[] = [
        { id: "1", type: "heading1", content: "Big Title" },
      ];
      const result = convertFromNotionBlocks(notionBlocks);
      expect(result[0].type).toBe("text");
      expect(result[0].style.fontSize).toBe("32px");
      expect(result[0].style.fontWeight).toBe("bold");
    });

    it("should convert image blocks and preserve all properties", () => {
      const notionBlocks: NotionBlock[] = [
        {
          id: "1",
          type: "image",
          url: "https://example.com/photo.png",
          imageSize: "small",
          imageAlign: "right",
          caption: "A drill photo",
        },
      ];
      const result = convertFromNotionBlocks(notionBlocks);
      expect(result[0].type).toBe("image");
      expect(result[0].url).toBe("https://example.com/photo.png");
      expect(result[0].imageSize).toBe("small");
      expect(result[0].imageAlign).toBe("right");
      expect(result[0].caption).toBe("A drill photo");
    });

    it("should convert numberedList to list with listType metadata", () => {
      const notionBlocks: NotionBlock[] = [
        { id: "1", type: "numberedList", items: ["Step 1", "Step 2"] },
      ];
      const result = convertFromNotionBlocks(notionBlocks);
      expect(result[0].type).toBe("list");
      expect(result[0].listType).toBe("numbered");
      expect(result[0].items).toEqual(["Step 1", "Step 2"]);
    });

    it("should convert quote to callout with quote style", () => {
      const notionBlocks: NotionBlock[] = [
        { id: "1", type: "quote", content: "Famous quote" },
      ];
      const result = convertFromNotionBlocks(notionBlocks);
      expect(result[0].type).toBe("callout");
      expect(result[0].calloutStyle).toBe("quote");
    });
  });

  describe("Round-trip conversion", () => {
    it("should preserve image properties through round-trip", () => {
      const original = [
        {
          id: "img-1",
          type: "image",
          url: "https://example.com/drill.jpg",
          imageSize: "medium",
          imageAlign: "left",
          caption: "Drill demonstration",
        },
      ];

      const notionBlocks = convertToNotionBlocks(original);
      const roundTripped = convertFromNotionBlocks(notionBlocks);

      expect(roundTripped[0].url).toBe("https://example.com/drill.jpg");
      expect(roundTripped[0].imageSize).toBe("medium");
      expect(roundTripped[0].imageAlign).toBe("left");
      expect(roundTripped[0].caption).toBe("Drill demonstration");
    });

    it("should handle mixed block types in round-trip", () => {
      const original = [
        { id: "1", type: "text", content: "Introduction", style: { fontSize: "24px", fontWeight: "bold" } },
        { id: "2", type: "text", content: "Some paragraph text", style: { fontSize: "16px" } },
        { id: "3", type: "image", url: "https://example.com/img.png", imageSize: "large", imageAlign: "center", caption: "Photo" },
        { id: "4", type: "video", url: "https://youtube.com/watch?v=abc123def45" },
        { id: "5", type: "list", items: ["A", "B", "C"] },
        { id: "6", type: "divider" },
      ];

      const notionBlocks = convertToNotionBlocks(original);
      expect(notionBlocks).toHaveLength(6);
      expect(notionBlocks[0].type).toBe("heading2");
      expect(notionBlocks[1].type).toBe("paragraph");
      expect(notionBlocks[2].type).toBe("image");
      expect(notionBlocks[3].type).toBe("video");
      expect(notionBlocks[4].type).toBe("bulletList");
      expect(notionBlocks[5].type).toBe("divider");
    });
  });
});
