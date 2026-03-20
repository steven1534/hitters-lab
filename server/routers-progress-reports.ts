import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import * as sessionNotesDb from "./sessionNotes";
import { Resend } from "resend";
import { ENV } from "./_core/env";

let _resendPR: any = null;
function getResend() { if (!_resendPR) { _resendPR = new Resend(ENV.resendApiKey || "placeholder_not_configured"); } return _resendPR; }

/** Coach Steve's voice/tone system prompt for AI report generation */
const COACH_STEVE_SYSTEM_PROMPT = `You are Coach Steve Goldstein, an elite baseball instructor who trains players ages 6–18 with a process-driven, measurable-growth approach. You are writing a progress report to send to a player's parent after a training session.

Your writing voice is:
- Confident and knowledgeable — you clearly know what you're talking about
- Parent-friendly — warm but professional, never condescending
- Reassuring — parents should feel their kid is in great hands
- Direct — get to the point, no fluff or filler
- Motivating — always end on a positive, encouraging note
- NEVER generic or robotic — every report should feel personal and specific to the player

Here is an example of your exact writing tone (match this voice precisely):

"Hi [Parent Name],

Great session with [Player] today. We spent the majority of our time working on staying connected through the swing — specifically keeping the hands inside the ball and driving through contact rather than pulling off early.

What stood out: [Player] made a real adjustment by the second round of front toss and was consistently barreling balls to the middle and opposite field. That's not easy to do in one session — shows a great feel for the barrel.

What we're building on: We still need to clean up the load timing — there's a small hitch that's causing some inconsistency. I've assigned two drills in the portal for this week that will help reinforce the timing piece.

Overall, really encouraged by today. The effort and focus were there. Keep it up.

— Coach Steve"

IMPORTANT RULES:
- Use the player's first name naturally throughout
- Reference specific drills and skills from the session notes
- The "What stood out" section should highlight genuine positives with specific detail
- The "What we're building on" section should be honest but constructive
- If homework drills are assigned, mention them naturally
- End with a short motivating note directly to the player (1-2 sentences)
- Keep the overall length to 200-350 words
- Do NOT use bullet points — write in natural paragraphs
- Sign off as "— Coach Steve"
- Use the tagline "Elite Instruction. Measurable Growth." in the branded footer`;

/** Structured report content schema */
const reportContentSchema = {
  type: "object" as const,
  properties: {
    greeting: { type: "string" as const, description: "Opening greeting to the parent" },
    sessionSummary: { type: "string" as const, description: "What was covered in the session" },
    strengths: { type: "string" as const, description: "What stood out / strengths observed" },
    areasForImprovement: { type: "string" as const, description: "What we're building on / areas for improvement" },
    homeworkAndNextSteps: { type: "string" as const, description: "Recommended next steps and homework drills" },
    playerNote: { type: "string" as const, description: "Short motivating note directly to the player" },
    signOff: { type: "string" as const, description: "Sign-off line" },
  },
  required: ["greeting", "sessionSummary", "strengths", "areasForImprovement", "homeworkAndNextSteps", "playerNote", "signOff"] as const,
  additionalProperties: false as const,
};

export const progressReportsRouter = router({
  /** Generate an AI progress report from a session note */
  generate: protectedProcedure
    .input(
      z.object({
        sessionNoteId: z.number(),
        parentName: z.string().optional(),
        parentEmail: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "coach") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
      }

      // Get the session note
      const note = await sessionNotesDb.getSessionNoteById(input.sessionNoteId);
      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session note not found" });
      }

      // Get athlete info
      const athleteData = await sessionNotesDb.getSessionNotesWithAthleteName(note.athleteId);
      const athleteName = athleteData.athleteName;
      const athleteFirstName = athleteName.split(" ")[0];

      // Get recent session history for context
      const recentNotes = await sessionNotesDb.getRecentSessionNotes(note.athleteId, 3);

      // Build the user prompt with session data
      const skillsWorked = (note.skillsWorked as string[]) ?? [];
      const homeworkDrills = (note.homeworkDrills as Array<{ drillId: string; drillName: string }>) ?? [];
      const sessionDate = new Date(note.sessionDate);

      const parentNameStr = input.parentName || "there";

      let contextFromPreviousSessions = "";
      if (recentNotes.length > 1) {
        const prevNotes = recentNotes.filter((n) => n.id !== note.id).slice(0, 2);
        if (prevNotes.length > 0) {
          contextFromPreviousSessions = `\n\nPrevious session context (for continuity):\n${prevNotes
            .map(
              (pn) =>
                `- Session #${pn.sessionNumber}: Worked on ${(pn.skillsWorked as string[]).join(", ")}. Improved: ${pn.whatImproved}. Needs work: ${pn.whatNeedsWork}`
            )
            .join("\n")}`;
        }
      }

      const userPrompt = `Write a progress report for the following session:

Player Name: ${athleteName} (use "${athleteFirstName}" in the report)
Parent Name: ${parentNameStr}
Session Date: ${sessionDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
Session Number: #${note.sessionNumber}
Skills Worked On: ${skillsWorked.join(", ")}
Duration: ${note.duration ? `${note.duration} minutes` : "Standard session"}

What Improved This Session:
${note.whatImproved}

What Still Needs Work:
${note.whatNeedsWork}

${homeworkDrills.length > 0 ? `Homework Drills Assigned:\n${homeworkDrills.map((d) => `- ${d.drillName}`).join("\n")}` : "No specific homework drills assigned this session."}

${note.overallRating ? `Coach's Session Rating: ${note.overallRating}/5` : ""}
${contextFromPreviousSessions}

Generate the progress report in your voice. Return it as structured JSON.`;

      // Call LLM
      const llmResult = await invokeLLM({
        messages: [
          { role: "system", content: COACH_STEVE_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "progress_report",
            strict: true,
            schema: reportContentSchema,
          },
        },
      });

      const reportContent = JSON.parse(
        llmResult.choices[0]?.message?.content as string
      );

      // Generate the full HTML report
      const reportHtml = generateReportHtml({
        athleteName,
        sessionDate,
        sessionNumber: note.sessionNumber,
        reportContent,
      });

      // Save to database
      const title = `Session #${note.sessionNumber} Progress Report — ${sessionDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

      const report = await sessionNotesDb.createProgressReport({
        coachId: ctx.user.id,
        athleteId: note.athleteId,
        sessionNoteId: note.id,
        title,
        reportContent,
        reportHtml,
        status: "draft",
        sentToEmail: input.parentEmail ?? null,
        sentToName: input.parentName ?? null,
      });

      return report;
    }),

  /** Get a progress report by ID */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const report = await sessionNotesDb.getProgressReportById(input.id);
      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }
      return report;
    }),

  /** Get all reports for an athlete */
  getForAthlete: protectedProcedure
    .input(z.object({ athleteId: z.number() }))
    .query(async ({ input }) => {
      return sessionNotesDb.getProgressReportsForAthlete(input.athleteId);
    }),

  /** Update report content (inline editing) */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        reportContent: z.object({
          greeting: z.string().optional(),
          sessionSummary: z.string().optional(),
          strengths: z.string().optional(),
          areasForImprovement: z.string().optional(),
          homeworkAndNextSteps: z.string().optional(),
          playerNote: z.string().optional(),
          signOff: z.string().optional(),
          sectionHeadings: z.object({
            strengths: z.string().optional(),
            areasForImprovement: z.string().optional(),
            homeworkAndNextSteps: z.string().optional(),
          }).optional(),
        }).optional(),
        reportHtml: z.string().optional(),
        status: z.enum(["draft", "reviewed", "sent"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "coach") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
      }
      const { id, ...data } = input;

      // If reportContent changed, regenerate the HTML so the email stays in sync
      if (data.reportContent) {
        const report = await sessionNotesDb.getProgressReportById(id);
        if (report) {
          const athleteData = await sessionNotesDb.getSessionNotesWithAthleteName(report.athleteId);
          const sessionNote = report.sessionNoteId ? await sessionNotesDb.getSessionNoteById(report.sessionNoteId) : null;
          data.reportHtml = generateReportHtml({
            athleteName: athleteData.athleteName,
            sessionDate: sessionNote ? new Date(sessionNote.sessionDate) : new Date(),
            sessionNumber: sessionNote?.sessionNumber ?? 0,
            reportContent: data.reportContent as any,
          });
        }
      }

      return sessionNotesDb.updateProgressReport(id, data as any);
    }),

  /** Send report to parent via email */
  sendToParent: protectedProcedure
    .input(
      z.object({
        reportId: z.number(),
        parentEmail: z.string().email(),
        parentName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "coach") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
      }

      const report = await sessionNotesDb.getProgressReportById(input.reportId);
      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      if (!ENV.resendApiKey) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Email service not configured",
        });
      }

      // Get athlete name and session note for regenerating HTML
      const athleteData = await sessionNotesDb.getSessionNotesWithAthleteName(report.athleteId);
      const sessionNote = report.sessionNoteId ? await sessionNotesDb.getSessionNoteById(report.sessionNoteId) : null;

      // Regenerate HTML from the latest edited reportContent
      const rc = report.reportContent as any;
      const freshHtml = generateReportHtml({
        athleteName: athleteData.athleteName,
        sessionDate: sessionNote ? new Date(sessionNote.sessionDate) : new Date(),
        sessionNumber: sessionNote?.sessionNumber ?? 0,
        reportContent: rc,
      });

      // Persist the regenerated HTML
      await sessionNotesDb.updateProgressReport(report.id, { reportHtml: freshHtml } as any);

      try {
        const result = await getResend().emails.send({
          from: "coach@coachstevemobilecoach.com",
          to: input.parentEmail,
          subject: `${athleteData.athleteName} — ${report.title}`,
          html: freshHtml,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        // Update report status
        await sessionNotesDb.updateProgressReport(report.id, {
          status: "sent",
          sentAt: new Date(),
          sentToEmail: input.parentEmail,
          sentToName: input.parentName ?? null,
        } as any);

        return { success: true };
      } catch (error) {
        console.error("[ProgressReport] Failed to send email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /** Delete a report */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "coach") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
      }
      return sessionNotesDb.deleteProgressReport(input.id);
    }),
});

/** Generate branded HTML for the progress report email */
function generateReportHtml(params: {
  athleteName: string;
  sessionDate: Date;
  sessionNumber: number;
  reportContent: {
    greeting: string;
    sessionSummary: string;
    strengths: string;
    areasForImprovement: string;
    homeworkAndNextSteps: string;
    playerNote: string;
    signOff: string;
    sectionHeadings?: {
      strengths?: string;
      areasForImprovement?: string;
      homeworkAndNextSteps?: string;
    };
  };
}): string {
  const { athleteName, sessionDate, sessionNumber, reportContent } = params;
  const dateStr = sessionDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const headings = {
    strengths: reportContent.sectionHeadings?.strengths || "What Stood Out",
    areasForImprovement: reportContent.sectionHeadings?.areasForImprovement || "What We're Building On",
    homeworkAndNextSteps: reportContent.sectionHeadings?.homeworkAndNextSteps || "Next Steps & Homework",
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1e293b; margin: 0; padding: 0; background-color: #f1f5f9; -webkit-font-smoothing: antialiased; }
    .wrapper { max-width: 620px; margin: 0 auto; padding: 32px 16px; }
    .email-card { border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 10px 15px -3px rgba(0,0,0,0.05); }

    /* Header */
    .header { background: linear-gradient(145deg, #0b1a2e 0%, #122240 40%, #1a3055 100%); color: white; padding: 40px 32px 36px; text-align: center; position: relative; }
    .header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(96,165,250,0.3), transparent); }
    .header-logo { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 6px; }
    .header-subtitle { font-size: 10px; color: rgba(96,165,250,0.9); font-weight: 600; letter-spacing: 3px; text-transform: uppercase; }

    /* Meta */
    .meta-bar { background: linear-gradient(90deg, #15304f, #1a3a5c); padding: 14px 32px; display: flex; justify-content: space-between; align-items: center; }
    .meta-bar span { font-size: 12px; color: #94a3b8; font-weight: 500; }
    .meta-bar .athlete-name { color: #cbd5e1; font-weight: 600; }

    /* Content */
    .content { background: #ffffff; padding: 36px 32px 28px; }
    .content p { margin: 0 0 18px 0; font-size: 15px; color: #374151; line-height: 1.75; }

    /* Section blocks */
    .section { margin: 28px 0; }
    .section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
    .section-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .section-dot.green { background: #10b981; }
    .section-dot.amber { background: #f59e0b; }
    .section-dot.blue { background: #3b82f6; }
    .section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
    .section-label.green { color: #059669; }
    .section-label.amber { color: #d97706; }
    .section-label.blue { color: #2563eb; }
    .section-body { padding-left: 14px; border-left: 2px solid #e5e7eb; }
    .section-body.green { border-color: #d1fae5; }
    .section-body.amber { border-color: #fef3c7; }
    .section-body.blue { border-color: #dbeafe; }
    .section-body p { margin: 0; color: #374151; font-size: 15px; line-height: 1.75; }

    /* Player note */
    .player-note { background: linear-gradient(135deg, #eff6ff, #f0f9ff); border-left: 3px solid #3b82f6; padding: 20px 24px; border-radius: 0 12px 12px 0; margin: 32px 0 24px; }
    .player-note p { color: #1e40af; font-style: italic; margin: 0; font-size: 15px; line-height: 1.7; }

    /* Sign-off */
    .sign-off-section { margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
    .sign-off-name { font-weight: 700; color: #0f172a; font-size: 15px; margin-bottom: 4px; }
    .sign-off-desc { font-size: 12px; color: #64748b; line-height: 1.5; font-style: italic; }

    /* Footer */
    .footer { background: linear-gradient(145deg, #0b1a2e, #122240); text-align: center; padding: 28px 32px; }
    .footer-brand { color: #60a5fa; font-weight: 700; font-size: 14px; letter-spacing: 0.3px; margin-bottom: 4px; }
    .footer-tagline { color: #475569; font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; font-weight: 500; }
    .footer-divider { width: 40px; height: 2px; background: linear-gradient(90deg, transparent, #60a5fa, transparent); margin: 12px auto; }

    @media (max-width: 480px) {
      .wrapper { padding: 16px 8px; }
      .header { padding: 28px 20px 24px; }
      .meta-bar { padding: 12px 20px; flex-direction: column; gap: 4px; text-align: center; }
      .content { padding: 24px 20px 20px; }
      .footer { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="email-card">
      <div class="header">
        <div class="header-logo">Coach Steve</div>
        <div class="header-subtitle">Division 1 All-American &bull; Elite Player Development</div>
      </div>

      <div class="meta-bar">
        <span><span class="athlete-name">${athleteName}</span> &mdash; Session #${sessionNumber}</span>
        <span>${dateStr}</span>
      </div>

      <div class="content">
        <p>${reportContent.greeting}</p>
        <p>${reportContent.sessionSummary}</p>

        <div class="section">
          <div class="section-header">
            <div class="section-dot green"></div>
            <div class="section-label green">${headings.strengths}</div>
          </div>
          <div class="section-body green">
            <p>${reportContent.strengths}</p>
          </div>
        </div>

        <div class="section">
          <div class="section-header">
            <div class="section-dot amber"></div>
            <div class="section-label amber">${headings.areasForImprovement}</div>
          </div>
          <div class="section-body amber">
            <p>${reportContent.areasForImprovement}</p>
          </div>
        </div>

        <div class="section">
          <div class="section-header">
            <div class="section-dot blue"></div>
            <div class="section-label blue">${headings.homeworkAndNextSteps}</div>
          </div>
          <div class="section-body blue">
            <p>${reportContent.homeworkAndNextSteps}</p>
          </div>
        </div>

        <div class="player-note">
          <p>${reportContent.playerNote}</p>
        </div>

        <div class="sign-off-section">
          <div class="sign-off-name">${reportContent.signOff}</div>
          <div class="sign-off-desc">Elite private hitting instruction in Westbury, NY.<br>Building powerful, confident players through professional mechanics and mental preparation.</div>
        </div>
      </div>

      <div class="footer">
        <div class="footer-brand">Coach Steve Goldstein</div>
        <div class="footer-divider"></div>
        <div class="footer-tagline">Elite Instruction &bull; Measurable Growth</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
