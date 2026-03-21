/**
 * Export HTML content as a PDF using the browser's native print dialog.
 * This approach is 100% reliable — no canvas rendering, no library version issues.
 * The user clicks "Save as PDF" in the print dialog (works in all browsers).
 */
export function exportHtmlToPdf({
  title,
  athleteName,
  date,
  html,
  filename,
}: {
  title: string;
  athleteName: string;
  date: string;
  html: string;
  filename: string;
}) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    alert("Please allow popups for this site to export PDFs.");
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(filename)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.7;
      color: #111;
      background: #fff;
      padding: 56px 64px 72px;
      max-width: 900px;
      margin: 0 auto;
    }

    /* ── Header ── */
    .pdf-header {
      border-bottom: 2.5px solid #DC143C;
      padding-bottom: 18px;
      margin-bottom: 30px;
    }
    .pdf-badge {
      display: inline-block;
      background: #DC143C;
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 3px 10px;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    .pdf-title {
      font-size: 22px;
      font-weight: 800;
      color: #111;
      line-height: 1.25;
      margin-bottom: 7px;
    }
    .pdf-meta {
      font-size: 12px;
      color: #555;
    }
    .pdf-meta strong { color: #333; }

    /* ── Body content ── */
    .pdf-body { margin-bottom: 40px; }

    .pdf-body h1 {
      font-size: 20px; font-weight: 800; margin: 1.4em 0 0.5em; color: #111;
      line-height: 1.25; letter-spacing: -0.01em;
    }
    .pdf-body h2 {
      font-size: 16px; font-weight: 700; margin: 1.2em 0 0.4em; color: #222; line-height: 1.3;
    }
    .pdf-body h3 {
      font-size: 14px; font-weight: 600; margin: 1em 0 0.35em; color: #333; line-height: 1.4;
    }
    .pdf-body h1:first-child,
    .pdf-body h2:first-child,
    .pdf-body h3:first-child { margin-top: 0; }

    .pdf-body p { margin: 0 0 0.75em; color: #222; line-height: 1.75; }
    .pdf-body ul, .pdf-body ol { padding-left: 1.5em; margin: 0.4em 0 0.75em; }
    .pdf-body li { margin: 0.25em 0; color: #222; line-height: 1.7; }
    .pdf-body li p { margin: 0; }

    .pdf-body blockquote {
      border-left: 3px solid #DC143C;
      padding: 6px 14px;
      margin: 0.9em 0;
      color: #444;
      font-style: italic;
      background: #fafafa;
      border-radius: 0 4px 4px 0;
    }
    .pdf-body hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 1.4em 0;
    }
    .pdf-body a { color: #DC143C; text-decoration: underline; }
    .pdf-body strong { font-weight: 700; color: #111; }
    .pdf-body em { font-style: italic; color: #333; }

    /* ── Blast table styles ── */
    .blast-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
      font-size: 13px;
    }
    .blast-table th {
      background: #f4f4f4;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border-bottom: 2px solid #ddd;
      color: #333;
    }
    .blast-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #eee;
      color: #444;
    }
    .blast-table tbody tr:last-child td { border-bottom: none; }
    .avg-row td { font-weight: 600; color: #111; background: #f9f9f9; }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #111;
      margin: 24px 0 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid #DC143C;
    }

    /* ── Footer ── */
    .pdf-footer {
      margin-top: 36px;
      padding-top: 14px;
      border-top: 1px solid #eee;
      font-size: 11px;
      color: #aaa;
      display: flex;
      justify-content: space-between;
    }

    /* ── Print settings ── */
    @media print {
      body { padding: 0; }
      @page {
        size: letter portrait;
        margin: 0.75in 0.85in;
      }
      a { color: #DC143C !important; }
      .pdf-header { page-break-after: avoid; }
      h1, h2, h3 { page-break-after: avoid; }
      p, li { orphans: 3; widows: 3; }
      .blast-table { page-break-inside: auto; }
      .blast-table tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="pdf-header">
    <div class="pdf-badge">Coach Steve Baseball</div>
    <div class="pdf-title">${escapeHtml(title)}</div>
    <div class="pdf-meta">
      <strong>Athlete:</strong> ${escapeHtml(athleteName)}&nbsp;&nbsp;·&nbsp;&nbsp;
      <strong>Date:</strong> ${escapeHtml(date)}
    </div>
  </div>

  <div class="pdf-body">${html}</div>

  <div class="pdf-footer">
    <span>Coach Steve Baseball · app.coachstevebaseball.com</span>
    <span>Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
  </div>

  <script>
    // Auto-trigger print after fonts load
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 600);
    };
  </script>
</body>
</html>`);

  printWindow.document.close();
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
