import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ProgressData {
  coreMetrics: {
    totalAssigned: number;
    completed: number;
    inProgress: number;
    assigned: number;
    completionRate: number;
    avgDaysToComplete: number;
  };
  activity: {
    lastActivityDate: string | null;
    recentCompletions: Array<{
      drillName: string;
      completedAt: string | null;
    }>;
    weeklyProgress: Array<{
      week: string;
      completed: number;
    }>;
  };
  drillBreakdown: {
    byDifficulty: {
      Easy: { total: number; completed: number };
      Medium: { total: number; completed: number };
      Hard: { total: number; completed: number };
      Unknown: { total: number; completed: number };
    };
  };
}

interface CoachNote {
  id: number;
  note: string;
  meetingDate: Date | null;
  createdAt: Date;
}

interface WeeklyGoal {
  id: number;
  targetDrillCount: number;
  notes: string | null;
  weekStartDate: Date;
  weekEndDate: Date;
}

export function exportProgressReportToPDF(
  athleteName: string,
  progressData: ProgressData,
  coachNotes?: CoachNote[],
  weeklyGoals?: WeeklyGoal[]
) {
  const doc = new jsPDF();
  let yPosition = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`${athleteName}'s Progress Report`, 20, yPosition);
  yPosition += 10;

  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
  yPosition += 15;

  // Core Metrics Section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Performance Summary", 20, yPosition);
  yPosition += 10;

  const { coreMetrics } = progressData;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  autoTable(doc, {
    startY: yPosition,
    head: [["Metric", "Value"]],
    body: [
      ["Total Assigned", coreMetrics.totalAssigned.toString()],
      ["Completed", coreMetrics.completed.toString()],
      ["In Progress", coreMetrics.inProgress.toString()],
      ["Not Started", coreMetrics.assigned.toString()],
      ["Completion Rate", `${coreMetrics.completionRate}%`],
      ["Avg. Days to Complete", coreMetrics.avgDaysToComplete.toString()],
    ],
    theme: "striped",
    headStyles: { fillColor: [30, 58, 138] },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Weekly Progress Section
  if (progressData.activity.weeklyProgress.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Weekly Progress (Last 4 Weeks)", 20, yPosition);
    yPosition += 10;

    autoTable(doc, {
      startY: yPosition,
      head: [["Week", "Drills Completed"]],
      body: progressData.activity.weeklyProgress.map(w => [w.week, w.completed.toString()]),
      theme: "striped",
      headStyles: { fillColor: [30, 58, 138] },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Recent Completions
  if (progressData.activity.recentCompletions.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Recent Completions", 20, yPosition);
    yPosition += 10;

    autoTable(doc, {
      startY: yPosition,
      head: [["Drill Name", "Completed On"]],
      body: progressData.activity.recentCompletions.map(drill => [
        drill.drillName,
        drill.completedAt ? new Date(drill.completedAt).toLocaleDateString() : "N/A",
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 58, 138] },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Weekly Goals Section
  if (weeklyGoals && weeklyGoals.length > 0) {
    // Add new page if needed
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Weekly Goals", 20, yPosition);
    yPosition += 10;

    autoTable(doc, {
      startY: yPosition,
      head: [["Week", "Target Drills", "Notes"]],
      body: weeklyGoals.map(goal => [
        `${new Date(goal.weekStartDate).toLocaleDateString()} - ${new Date(goal.weekEndDate).toLocaleDateString()}`,
        goal.targetDrillCount.toString(),
        goal.notes || "No notes",
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 58, 138] },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Coach Notes Section
  if (coachNotes && coachNotes.length > 0) {
    // Add new page if needed
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Coach Notes", 20, yPosition);
    yPosition += 10;

    autoTable(doc, {
      startY: yPosition,
      head: [["Date", "Note"]],
      body: coachNotes.map(note => [
        note.meetingDate ? new Date(note.meetingDate).toLocaleDateString() : new Date(note.createdAt).toLocaleDateString(),
        note.note,
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 58, 138] },
      columnStyles: {
        1: { cellWidth: 130 },
      },
    });
  }

  // Save the PDF
  const fileName = `${athleteName.replace(/\s+/g, "_")}_Progress_Report_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}
