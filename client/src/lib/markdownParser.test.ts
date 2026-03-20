import { describe, it, expect } from "vitest";
import {
  parseMarkdownToBlocks,
  cleanInlineFormatting,
  looksLikeMarkdown,
} from "./markdownParser";

// ─── cleanInlineFormatting ───────────────────────────────────────────────────

describe("cleanInlineFormatting", () => {
  it("strips bold markers", () => {
    expect(cleanInlineFormatting("**bold text**")).toBe("bold text");
    expect(cleanInlineFormatting("__bold text__")).toBe("bold text");
  });

  it("strips italic markers", () => {
    expect(cleanInlineFormatting("*italic text*")).toBe("italic text");
    expect(cleanInlineFormatting("_italic text_")).toBe("italic text");
  });

  it("strips bold+italic markers", () => {
    expect(cleanInlineFormatting("***bold italic***")).toBe("bold italic");
    expect(cleanInlineFormatting("___bold italic___")).toBe("bold italic");
  });

  it("strips strikethrough markers", () => {
    expect(cleanInlineFormatting("~~deleted~~")).toBe("deleted");
  });

  it("strips inline code backticks", () => {
    expect(cleanInlineFormatting("`some code`")).toBe("some code");
  });

  it("converts links to text (url) format", () => {
    expect(cleanInlineFormatting("[Click here](https://example.com)")).toBe(
      "Click here (https://example.com)"
    );
  });

  it("handles mixed inline formatting", () => {
    const input = "This is **bold** and *italic* with a [link](http://x.com)";
    const result = cleanInlineFormatting(input);
    expect(result).toBe("This is bold and italic with a link (http://x.com)");
  });
});

// ─── looksLikeMarkdown ──────────────────────────────────────────────────────

describe("looksLikeMarkdown", () => {
  it("returns true for text with headings", () => {
    expect(looksLikeMarkdown("# Title\n## Subtitle\nSome text")).toBe(true);
  });

  it("returns true for text with bullet lists", () => {
    expect(looksLikeMarkdown("- Item 1\n- Item 2\n- Item 3")).toBe(true);
  });

  it("returns true for text with numbered lists", () => {
    expect(looksLikeMarkdown("1. First\n2. Second\n3. Third")).toBe(true);
  });

  it("returns true for text with blockquotes and bold", () => {
    expect(looksLikeMarkdown("> A quote\nSome **bold** text")).toBe(true);
  });

  it("returns false for plain text without markdown", () => {
    expect(looksLikeMarkdown("Hello world")).toBe(false);
  });

  it("returns false for short plain text", () => {
    expect(looksLikeMarkdown("Just a sentence.")).toBe(false);
  });
});

// ─── parseMarkdownToBlocks ──────────────────────────────────────────────────

describe("parseMarkdownToBlocks", () => {
  it("parses headings at all levels", () => {
    const md = "# Heading 1\n## Heading 2\n### Heading 3\n#### Heading 4";
    const blocks = parseMarkdownToBlocks(md);
    expect(blocks).toHaveLength(4);
    expect(blocks[0].type).toBe("heading1");
    expect(blocks[0].content).toBe("Heading 1");
    expect(blocks[1].type).toBe("heading2");
    expect(blocks[1].content).toBe("Heading 2");
    expect(blocks[2].type).toBe("heading3");
    expect(blocks[2].content).toBe("Heading 3");
    expect(blocks[3].type).toBe("heading4");
    expect(blocks[3].content).toBe("Heading 4");
  });

  it("parses bullet lists and merges consecutive items", () => {
    const md = "- Apple\n- Banana\n- Cherry";
    const blocks = parseMarkdownToBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("bulletList");
    expect(blocks[0].items).toEqual(["Apple", "Banana", "Cherry"]);
  });

  it("parses numbered lists and merges consecutive items", () => {
    const md = "1. First\n2. Second\n3. Third";
    const blocks = parseMarkdownToBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("numberedList");
    expect(blocks[0].items).toEqual(["First", "Second", "Third"]);
  });

  it("parses blockquotes as quote blocks", () => {
    const md = "> This is a quote\n> spanning two lines";
    const blocks = parseMarkdownToBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("quote");
    expect(blocks[0].content).toBe("This is a quote\nspanning two lines");
  });

  it("parses callout-style blockquotes with emoji prefixes", () => {
    const md = "> ⚠️ This is a warning callout";
    const blocks = parseMarkdownToBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("callout");
    expect(blocks[0].calloutType).toBe("warning");
    expect(blocks[0].content).toBe("This is a warning callout");
  });

  it("parses info callout with ℹ️ emoji", () => {
    const md = "> ℹ️ Important information here";
    const blocks = parseMarkdownToBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("callout");
    expect(blocks[0].calloutType).toBe("info");
  });

  it("parses success callout with ✅ emoji", () => {
    const md = "> ✅ All tests passed";
    const blocks = parseMarkdownToBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("callout");
    expect(blocks[0].calloutType).toBe("success");
  });

  it("parses horizontal rules as dividers", () => {
    const md = "Some text\n\n---\n\nMore text";
    const blocks = parseMarkdownToBlocks(md);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[1].type).toBe("divider");
    expect(blocks[2].type).toBe("paragraph");
  });

  it("parses images", () => {
    const md = "![Alt text](https://example.com/image.png)";
    const blocks = parseMarkdownToBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("image");
    expect(blocks[0].url).toBe("https://example.com/image.png");
    expect(blocks[0].caption).toBe("Alt text");
  });

  it("parses YouTube URLs as video blocks", () => {
    const md = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const blocks = parseMarkdownToBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("video");
    expect(blocks[0].url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("parses paragraphs and strips inline formatting", () => {
    const md = "This is **bold** and *italic* text with a [link](http://x.com).";
    const blocks = parseMarkdownToBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[0].content).toBe(
      "This is bold and italic text with a link (http://x.com)."
    );
  });

  it("handles a full Notion-style document", () => {
    const md = `# Drill Overview

This drill focuses on **hand-eye coordination** and *bat speed*.

## Equipment Needed

- Bat
- Tee
- Baseballs (dozen)

## Steps

1. Set up the tee at waist height
2. Take 10 swings focusing on contact
3. Adjust tee height and repeat

---

> 💡 Coach's Tip: Focus on quality over quantity

![Setup](https://example.com/setup.jpg)

https://www.youtube.com/watch?v=abc123def45`;

    const blocks = parseMarkdownToBlocks(md);

    // Verify structure
    expect(blocks[0].type).toBe("heading1");
    expect(blocks[0].content).toBe("Drill Overview");

    expect(blocks[1].type).toBe("paragraph");
    expect(blocks[1].content).toContain("hand-eye coordination");

    expect(blocks[2].type).toBe("heading2");
    expect(blocks[2].content).toBe("Equipment Needed");

    expect(blocks[3].type).toBe("bulletList");
    expect(blocks[3].items).toEqual(["Bat", "Tee", "Baseballs (dozen)"]);

    expect(blocks[4].type).toBe("heading2");
    expect(blocks[4].content).toBe("Steps");

    expect(blocks[5].type).toBe("numberedList");
    expect(blocks[5].items).toHaveLength(3);

    expect(blocks[6].type).toBe("divider");

    expect(blocks[7].type).toBe("callout");
    expect(blocks[7].calloutType).toBe("info");
    expect(blocks[7].content).toContain("Coach's Tip");

    expect(blocks[8].type).toBe("image");
    expect(blocks[8].url).toBe("https://example.com/setup.jpg");

    expect(blocks[9].type).toBe("video");
  });

  it("handles empty input", () => {
    const blocks = parseMarkdownToBlocks("");
    expect(blocks).toHaveLength(0);
  });

  it("handles input with only blank lines", () => {
    const blocks = parseMarkdownToBlocks("\n\n\n");
    expect(blocks).toHaveLength(0);
  });

  it("handles bullet lists with * and + prefixes", () => {
    const md = "* Star item\n+ Plus item";
    const blocks = parseMarkdownToBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("bulletList");
    expect(blocks[0].items).toEqual(["Star item", "Plus item"]);
  });

  it("handles numbered lists with ) separator", () => {
    const md = "1) First item\n2) Second item";
    const blocks = parseMarkdownToBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("numberedList");
    expect(blocks[0].items).toEqual(["First item", "Second item"]);
  });

  it("separates different block types correctly", () => {
    const md = "- Bullet 1\n- Bullet 2\n\n1. Number 1\n2. Number 2";
    const blocks = parseMarkdownToBlocks(md);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("bulletList");
    expect(blocks[1].type).toBe("numberedList");
  });

  it("assigns unique IDs to each block", () => {
    const md = "# Title\n\nParagraph\n\n- Item";
    const blocks = parseMarkdownToBlocks(md);
    const ids = blocks.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
