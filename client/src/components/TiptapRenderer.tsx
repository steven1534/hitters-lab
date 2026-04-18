import { sanitizeReportHtml } from "@/lib/sanitizeHtml";

/**
 * Read-only renderer for HTML content stored by TiptapEditor.
 *
 * Split out of TiptapEditor.tsx so read-only consumers (viewing drill
 * instructions, viewing player reports as a non-coach) don't pull in the
 * ~350 KB Tiptap/ProseMirror editor bundle.
 */
export function TiptapRenderer({ content }: { content: string }) {
  if (!content) return null;

  // Detect if it's HTML or plain text/markdown
  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  if (isHtml) {
    return (
      <div
        className="prose prose-invert prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeReportHtml(content) }}
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
