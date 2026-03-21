import jsPDF from "jspdf";

/**
 * Renders an HTML string into a clean PDF document.
 * Works entirely client-side — no server needed.
 */
export async function exportHtmlToPdf({
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
  // Create an off-screen container styled like the viewer
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 750px;
    background: #ffffff;
    color: #111111;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.7;
    padding: 60px 60px 80px;
    box-sizing: border-box;
  `;

  // Header section
  container.innerHTML = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .pdf-header { border-bottom: 2px solid #DC143C; padding-bottom: 16px; margin-bottom: 28px; }
      .pdf-header .badge {
        display: inline-block;
        background: #DC143C;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 3px 10px;
        border-radius: 4px;
        margin-bottom: 10px;
      }
      .pdf-header h1 { font-size: 22px; font-weight: 800; color: #111; line-height: 1.3; margin-bottom: 6px; }
      .pdf-header .meta { font-size: 12px; color: #555; }
      .pdf-body h1 { font-size: 20px; font-weight: 800; margin: 1.4em 0 0.5em; color: #111; }
      .pdf-body h2 { font-size: 16px; font-weight: 700; margin: 1.2em 0 0.4em; color: #222; }
      .pdf-body h3 { font-size: 14px; font-weight: 600; margin: 1em 0 0.3em; color: #333; }
      .pdf-body h1:first-child, .pdf-body h2:first-child, .pdf-body h3:first-child { margin-top: 0; }
      .pdf-body p { margin: 0 0 0.7em; color: #222; }
      .pdf-body ul, .pdf-body ol { padding-left: 1.4em; margin: 0.4em 0 0.7em; }
      .pdf-body li { margin: 0.2em 0; color: #222; }
      .pdf-body li p { margin: 0; }
      .pdf-body blockquote {
        border-left: 3px solid #DC143C;
        padding: 6px 12px;
        margin: 0.8em 0;
        color: #444;
        font-style: italic;
        background: #fafafa;
        border-radius: 0 4px 4px 0;
      }
      .pdf-body hr { border: none; border-top: 1px solid #ddd; margin: 1.2em 0; }
      .pdf-body a { color: #DC143C; }
      .pdf-body strong { font-weight: 700; color: #111; }
      .pdf-body em { font-style: italic; }
      .pdf-footer {
        margin-top: 40px;
        padding-top: 14px;
        border-top: 1px solid #eee;
        font-size: 11px;
        color: #aaa;
        display: flex;
        justify-content: space-between;
      }
    </style>
    <div class="pdf-header">
      <div class="badge">Coach Steve Baseball</div>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">
        <strong>Athlete:</strong> ${escapeHtml(athleteName)}&nbsp;&nbsp;·&nbsp;&nbsp;
        <strong>Date:</strong> ${escapeHtml(date)}
      </div>
    </div>
    <div class="pdf-body">${html}</div>
    <div class="pdf-footer">
      <span>Coach Steve Baseball · app.coachstevebaseball.com</span>
      <span>Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: 750,
      windowWidth: 750,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let yPos = 0;
    let remaining = imgHeight;

    while (remaining > 0) {
      if (yPos > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, -yPos, imgWidth, imgHeight);
      yPos += pageHeight;
      remaining -= pageHeight;
    }

    pdf.save(`${filename}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
