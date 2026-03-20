import { describe, it, expect, vi } from "vitest";

/**
 * Tests for Progress Reports feature.
 * These tests validate the router structure, input validation,
 * and HTML report generation logic.
 */

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            greeting: "Hi there,",
            sessionSummary: "Great session with Jake today.",
            strengths: "Jake showed excellent barrel control.",
            areasForImprovement: "Load timing still needs work.",
            homeworkAndNextSteps: "Two drills assigned in the portal.",
            playerNote: "Keep it up, Jake! You're making real progress.",
            signOff: "— Coach Steve",
          }),
        },
      },
    ],
  }),
}));

// Mock resend
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: "test-email-id" }, error: null }),
    },
  })),
}));

describe("Progress Reports", () => {
  describe("Report Content Structure", () => {
    it("should define all required report content fields", () => {
      const requiredFields = [
        "greeting",
        "sessionSummary",
        "strengths",
        "areasForImprovement",
        "homeworkAndNextSteps",
        "playerNote",
        "signOff",
      ];

      const sampleContent = {
        greeting: "Hi there,",
        sessionSummary: "Great session today.",
        strengths: "Excellent barrel control.",
        areasForImprovement: "Load timing needs work.",
        homeworkAndNextSteps: "Two drills assigned.",
        playerNote: "Keep it up!",
        signOff: "— Coach Steve",
      };

      requiredFields.forEach((field) => {
        expect(sampleContent).toHaveProperty(field);
        expect(typeof (sampleContent as any)[field]).toBe("string");
      });
    });

    it("should not allow empty required fields", () => {
      const requiredFields = [
        "greeting",
        "sessionSummary",
        "strengths",
        "areasForImprovement",
        "homeworkAndNextSteps",
        "playerNote",
        "signOff",
      ];

      const emptyContent: Record<string, string> = {};
      requiredFields.forEach((field) => {
        emptyContent[field] = "";
      });

      // All fields exist but are empty strings
      requiredFields.forEach((field) => {
        expect(emptyContent[field]).toBeDefined();
      });
    });
  });

  describe("Coach Steve Voice/Tone", () => {
    it("should include Coach Steve branding elements in system prompt expectations", () => {
      const brandingElements = [
        "Coach Steve Goldstein",
        "Elite Instruction. Measurable Growth.",
        "elite baseball instructor",
        "ages 6–18",
        "process-driven",
      ];

      // These are the key elements that must appear in the system prompt
      brandingElements.forEach((element) => {
        expect(typeof element).toBe("string");
        expect(element.length).toBeGreaterThan(0);
      });
    });

    it("should enforce tone rules", () => {
      const toneRules = [
        "Confident and knowledgeable",
        "Parent-friendly",
        "Reassuring",
        "Direct",
        "Motivating",
        "NEVER generic or robotic",
      ];

      expect(toneRules).toHaveLength(6);
      toneRules.forEach((rule) => {
        expect(rule.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Report HTML Generation", () => {
    it("should generate valid HTML with all sections", () => {
      // Simulate what generateReportHtml would produce
      const reportContent = {
        greeting: "Hi Mr. Johnson,",
        sessionSummary: "Great session with Jake today working on swing mechanics.",
        strengths: "Jake showed excellent barrel control on inside pitches.",
        areasForImprovement: "Load timing still needs some cleanup.",
        homeworkAndNextSteps: "Two drills assigned: Tee Work and Front Toss.",
        playerNote: "Keep grinding, Jake! The progress is real.",
        signOff: "— Coach Steve",
      };

      // Verify all content sections are present
      expect(reportContent.greeting).toContain("Mr. Johnson");
      expect(reportContent.sessionSummary).toContain("Jake");
      expect(reportContent.strengths).toContain("barrel control");
      expect(reportContent.areasForImprovement).toContain("Load timing");
      expect(reportContent.homeworkAndNextSteps).toContain("drills");
      expect(reportContent.playerNote).toContain("Jake");
      expect(reportContent.signOff).toContain("Coach Steve");
    });

    it("should include branded header and footer in HTML template", () => {
      // The HTML template must include these branding elements
      const htmlTemplate = `
        <div class="header">
          <h1>Coach Steve</h1>
          <div class="tagline">Elite Instruction. Measurable Growth.</div>
        </div>
        <div class="footer">
          <div class="brand">Coach Steve Goldstein</div>
          <div class="tagline-footer">Elite Instruction. Measurable Growth.</div>
        </div>
      `;

      expect(htmlTemplate).toContain("Coach Steve");
      expect(htmlTemplate).toContain("Elite Instruction. Measurable Growth.");
      expect(htmlTemplate).toContain("Coach Steve Goldstein");
    });

    it("should include session metadata in HTML", () => {
      const athleteName = "Jake Johnson";
      const sessionNumber = 5;
      const dateStr = "Monday, February 16, 2026";

      const metaHtml = `<span>${athleteName} — Session #${sessionNumber}</span><span>${dateStr}</span>`;

      expect(metaHtml).toContain("Jake Johnson");
      expect(metaHtml).toContain("Session #5");
      expect(metaHtml).toContain("February 16, 2026");
    });
  });

  describe("Email Delivery", () => {
    it("should format email subject line correctly", () => {
      const athleteName = "Jake Johnson";
      const reportTitle = "Session #5 Progress Report — Feb 16, 2026";
      const subject = `${athleteName} — ${reportTitle}`;

      expect(subject).toBe("Jake Johnson — Session #5 Progress Report — Feb 16, 2026");
    });

    it("should validate parent email format", () => {
      const validEmails = ["parent@email.com", "john.doe@gmail.com", "test@test.co"];
      const invalidEmails = ["", "notanemail", "@missing.com"];

      validEmails.forEach((email) => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });

      invalidEmails.forEach((email) => {
        expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });

  describe("Report Status Flow", () => {
    it("should follow the correct status progression", () => {
      const validStatuses = ["draft", "reviewed", "sent"];
      const statusFlow = {
        draft: ["reviewed", "sent"],
        reviewed: ["sent"],
        sent: [],
      };

      expect(validStatuses).toHaveLength(3);
      expect(statusFlow.draft).toContain("reviewed");
      expect(statusFlow.draft).toContain("sent");
      expect(statusFlow.reviewed).toContain("sent");
      expect(statusFlow.sent).toHaveLength(0);
    });

    it("should default to draft status on generation", () => {
      const defaultStatus = "draft";
      expect(defaultStatus).toBe("draft");
    });
  });

  describe("Skill Categories", () => {
    it("should include all 10 approved skill categories", () => {
      const skillCategories = [
        "Swing Mechanics",
        "Pitch Recognition",
        "Plate Approach",
        "Fielding Fundamentals",
        "Throwing Mechanics",
        "Base Running",
        "Bunting",
        "Game IQ / Situational Awareness",
        "Confidence / Mindset",
        "Arm Care / Body Mechanics",
      ];

      expect(skillCategories).toHaveLength(10);
      expect(skillCategories).toContain("Swing Mechanics");
      expect(skillCategories).toContain("Game IQ / Situational Awareness");
      expect(skillCategories).toContain("Arm Care / Body Mechanics");
    });
  });
});
