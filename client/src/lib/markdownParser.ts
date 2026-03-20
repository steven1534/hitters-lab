/**
 * Markdown-to-NotionBlock parser.
 *
 * Converts Markdown text (especially from Notion exports) into an array of
 * NotionBlock objects that the Page Builder can render and edit.
 *
 * Supported syntax:
 *  - # / ## / ### / #### headings
 *  - Bullet lists (- item, * item, + item)
 *  - Numbered lists (1. item, 2. item)
 *  - Blockquotes (> text)
 *  - Horizontal rules (---, ***, ___)
 *  - Callout blocks (> ⚠️ / > ℹ️ / > ✅ / > ❌ prefixed quotes)
 *  - YouTube video links on their own line
 *  - Image links ![alt](url)
 *  - Paragraphs with inline formatting (**bold**, *italic*, `code`, [link](url))
 */

export interface ParsedBlock {
  id: string;
  type:
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
  content: string;
  items?: string[];
  url?: string;
  calloutType?: "info" | "warning" | "success" | "error";
  imageSize?: "small" | "medium" | "large" | "full";
  imageAlign?: "left" | "center" | "right";
  caption?: string;
}

let blockCounter = 0;

function makeId(): string {
  blockCounter += 1;
  return `paste-${Date.now()}-${blockCounter}-${Math.random().toString(36).substr(2, 6)}`;
}

// ─── Line-level matchers ─────────────────────────────────────────────────────

const HEADING_RE = /^(#{1,4})\s+(.+)$/;
const BULLET_RE = /^[\s]*[-*+]\s+(.*)$/;
const NUMBERED_RE = /^[\s]*\d+[.)]\s+(.*)$/;
const BLOCKQUOTE_RE = /^>\s?(.*)$/;
const HR_RE = /^([-*_])\1{2,}\s*$/;
const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/;
const YOUTUBE_RE =
  /^(?:https?:\/\/)?(?:(?:www\.|m\.)?youtube\.com\/watch\?v=|youtu\.be\/|(?:www\.|m\.)?youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?:[&?\s].*)?$/;

// Callout emoji prefixes used in Notion exports
const CALLOUT_PREFIXES: Record<string, ParsedBlock["calloutType"]> = {
  "⚠️": "warning",
  "⚠": "warning",
  "ℹ️": "info",
  "ℹ": "info",
  "✅": "success",
  "❌": "error",
  "💡": "info",
  "🔥": "warning",
  "📌": "info",
  "🚨": "error",
  "⛔": "error",
  "✨": "success",
  "📝": "info",
  "💭": "info",
  "🎯": "info",
  "⭐": "success",
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse a multi-line Markdown string into an array of NotionBlock-compatible
 * objects. Consecutive list items and blockquote lines are merged into single
 * blocks.
 */
export function parseMarkdownToBlocks(markdown: string): ParsedBlock[] {
  // Reset counter for deterministic IDs in tests
  blockCounter = 0;

  const lines = markdown.split(/\r?\n/);
  const blocks: ParsedBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // ── Horizontal rule ────────────────────────────────────────────────
    if (HR_RE.test(line)) {
      blocks.push({ id: makeId(), type: "divider", content: "" });
      i++;
      continue;
    }

    // ── Heading ────────────────────────────────────────────────────────
    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4;
      const headingType = `heading${level}` as ParsedBlock["type"];
      blocks.push({
        id: makeId(),
        type: headingType,
        content: cleanInlineFormatting(headingMatch[2].trim()),
      });
      i++;
      continue;
    }

    // ── Image ──────────────────────────────────────────────────────────
    const imageMatch = line.match(IMAGE_RE);
    if (imageMatch) {
      blocks.push({
        id: makeId(),
        type: "image",
        content: "",
        url: imageMatch[2],
        caption: imageMatch[1] || undefined,
        imageSize: "large",
        imageAlign: "center",
      });
      i++;
      continue;
    }

    // ── YouTube link on its own line ───────────────────────────────────
    const ytMatch = line.trim().match(YOUTUBE_RE);
    if (ytMatch) {
      blocks.push({
        id: makeId(),
        type: "video",
        content: "",
        url: line.trim(),
      });
      i++;
      continue;
    }

    // ── Bullet list (collect consecutive items) ────────────────────────
    if (BULLET_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && BULLET_RE.test(lines[i])) {
        const m = lines[i].match(BULLET_RE);
        items.push(cleanInlineFormatting(m ? m[1] : ""));
        i++;
      }
      blocks.push({
        id: makeId(),
        type: "bulletList",
        content: "",
        items,
      });
      continue;
    }

    // ── Numbered list (collect consecutive items) ──────────────────────
    if (NUMBERED_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && NUMBERED_RE.test(lines[i])) {
        const m = lines[i].match(NUMBERED_RE);
        items.push(cleanInlineFormatting(m ? m[1] : ""));
        i++;
      }
      blocks.push({
        id: makeId(),
        type: "numberedList",
        content: "",
        items,
      });
      continue;
    }

    // ── Blockquote / Callout ───────────────────────────────────────────
    if (BLOCKQUOTE_RE.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && BLOCKQUOTE_RE.test(lines[i])) {
        const m = lines[i].match(BLOCKQUOTE_RE);
        quoteLines.push(m ? m[1] : "");
        i++;
      }
      const fullText = quoteLines.join("\n").trim();

      // Detect callout emoji prefix
      let calloutType: ParsedBlock["calloutType"] | null = null;
      let calloutContent = fullText;
      for (const [emoji, type] of Object.entries(CALLOUT_PREFIXES)) {
        if (fullText.startsWith(emoji)) {
          calloutType = type;
          calloutContent = fullText.slice(emoji.length).trim();
          break;
        }
      }

      if (calloutType) {
        blocks.push({
          id: makeId(),
          type: "callout",
          content: cleanInlineFormatting(calloutContent),
          calloutType,
        });
      } else {
        blocks.push({
          id: makeId(),
          type: "quote",
          content: cleanInlineFormatting(fullText),
        });
      }
      continue;
    }

    // ── Empty line → skip ──────────────────────────────────────────────
    if (line.trim() === "") {
      i++;
      continue;
    }

    // ── Paragraph (default) ────────────────────────────────────────────
    // Collect consecutive non-empty, non-special lines into one paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !HEADING_RE.test(lines[i]) &&
      !BULLET_RE.test(lines[i]) &&
      !NUMBERED_RE.test(lines[i]) &&
      !BLOCKQUOTE_RE.test(lines[i]) &&
      !HR_RE.test(lines[i]) &&
      !IMAGE_RE.test(lines[i]) &&
      !(lines[i].trim().match(YOUTUBE_RE))
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    if (paraLines.length > 0) {
      blocks.push({
        id: makeId(),
        type: "paragraph",
        content: cleanInlineFormatting(paraLines.join("\n")),
      });
    }
  }

  return blocks;
}

// ─── Inline formatting cleanup ───────────────────────────────────────────────

/**
 * Strip or simplify Markdown inline formatting so the plain-text content stored
 * in blocks is readable. The Page Builder stores plain text (not rich text), so
 * we convert inline Markdown to a clean readable form.
 *
 * - **bold** / __bold__  → bold (strip markers)
 * - *italic* / _italic_  → italic (strip markers)
 * - ***bold italic***    → bold italic (strip markers)
 * - `code`               → code (strip backticks)
 * - [text](url)          → text (url)  — keeps the URL visible
 * - ~~strikethrough~~    → strikethrough (strip markers)
 */
export function cleanInlineFormatting(text: string): string {
  let result = text;

  // Bold + italic (***text*** or ___text___)
  result = result.replace(/\*{3}(.+?)\*{3}/g, "$1");
  result = result.replace(/_{3}(.+?)_{3}/g, "$1");

  // Bold (**text** or __text__)
  result = result.replace(/\*{2}(.+?)\*{2}/g, "$1");
  result = result.replace(/_{2}(.+?)_{2}/g, "$1");

  // Italic (*text* or _text_) — careful not to match inside words with underscores
  result = result.replace(/(?<!\w)\*(.+?)\*(?!\w)/g, "$1");
  result = result.replace(/(?<!\w)_(.+?)_(?!\w)/g, "$1");

  // Strikethrough (~~text~~)
  result = result.replace(/~~(.+?)~~/g, "$1");

  // Inline code (`code`)
  result = result.replace(/`([^`]+)`/g, "$1");

  // Links [text](url) → text (url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

  return result;
}

/**
 * Detect whether clipboard text looks like Markdown content.
 * Returns true if the text contains common Markdown patterns.
 */
export function looksLikeMarkdown(text: string): boolean {
  const lines = text.split(/\r?\n/);
  let markdownIndicators = 0;

  for (const line of lines) {
    if (HEADING_RE.test(line)) markdownIndicators++;
    if (BULLET_RE.test(line)) markdownIndicators++;
    if (NUMBERED_RE.test(line)) markdownIndicators++;
    if (BLOCKQUOTE_RE.test(line)) markdownIndicators++;
    if (HR_RE.test(line)) markdownIndicators++;
    if (IMAGE_RE.test(line)) markdownIndicators++;
    // Bold/italic markers
    if (/\*{2}.+?\*{2}/.test(line)) markdownIndicators++;
    if (/\[.+?\]\(.+?\)/.test(line)) markdownIndicators++;
  }

  // Consider it Markdown if at least 2 indicators found, or if it's multi-line
  // with at least 1 indicator
  return markdownIndicators >= 2 || (lines.length >= 3 && markdownIndicators >= 1);
}
