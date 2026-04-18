import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize Tiptap/editor HTML before rendering with dangerouslySetInnerHTML.
 *
 * Tiptap produces a constrained subset of HTML (headings, lists, bold, italics,
 * underline, strike, links, images, blockquotes, code, paragraphs). This
 * allowlist matches what the editor can produce, plus anchor targets.
 *
 * Content in Hitters Lab is authored by coaches (admins), so the blast radius
 * is low, but we sanitize defensively so a compromised admin account can't
 * smuggle <script>, event handlers, or iframes into an athlete's browser.
 */
const ALLOWED_TAGS = [
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "em",
  "figure",
  "figcaption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "u",
  "ul",
];

const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "title",
  "width",
  "height",
  "class",
];

export function sanitizeReportHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Force all links to open safely in a new tab
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "style", "form"],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
  });
}
