import { describe, it, expect } from "vitest";

describe("PDF Export Feature", () => {
  it("should have jsPDF package installed", async () => {
    const jsPDF = await import("jspdf");
    expect(jsPDF).toBeDefined();
    expect(jsPDF.jsPDF).toBeDefined();
  });

  it("should have jspdf-autotable package installed", async () => {
    const autoTable = await import("jspdf-autotable");
    expect(autoTable).toBeDefined();
    expect(autoTable.default).toBeDefined();
  });

  it("should export progress report function", async () => {
    const { exportProgressReportToPDF } = await import("../client/src/utils/pdfExport");
    expect(exportProgressReportToPDF).toBeDefined();
    expect(typeof exportProgressReportToPDF).toBe("function");
  });
});
