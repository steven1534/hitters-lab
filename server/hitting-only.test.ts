import { describe, it, expect } from "vitest";
import drillsData from "../client/src/data/drills.json";
import path from "path";
import fs from "fs";

const NON_HITTING_CATEGORIES = new Set([
  "Bunting",
  "Pitching",
  "Infield",
  "Outfield",
  "Catching",
  "Base Running",
]);

describe("Hitting-Only Platform: drills.json", () => {
  it("should only contain drills with Hitting category", () => {
    for (const drill of drillsData) {
      expect(drill.categories).toContain("Hitting");
    }
  });

  it("should not contain any non-hitting categories", () => {
    for (const drill of drillsData) {
      for (const cat of drill.categories) {
        expect(NON_HITTING_CATEGORIES.has(cat)).toBe(false);
      }
    }
  });

  it("should have at least 80 hitting drills", () => {
    expect(drillsData.length).toBeGreaterThanOrEqual(80);
  });

  it("should have exactly 87 hitting drills", () => {
    expect(drillsData.length).toBe(87);
  });

  it("every drill should have required fields", () => {
    for (const drill of drillsData) {
      expect(drill).toHaveProperty("id");
      expect(drill).toHaveProperty("name");
      expect(drill).toHaveProperty("difficulty");
      expect(drill).toHaveProperty("categories");
      expect(drill).toHaveProperty("duration");
    }
  });
});

describe("Hitting-Only Platform: DrillDetail.tsx", () => {
  it("should not contain non-hitting skillSet references", () => {
    const filePath = path.join(__dirname, "../client/src/pages/DrillDetail.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    for (const cat of NON_HITTING_CATEGORIES) {
      // Check for skillSet: "Category" pattern (drill detail entries)
      const pattern = new RegExp(`skillSet:\\s*"${cat}"`, "g");
      const matches = content.match(pattern);
      expect(matches).toBeNull();
    }
  });
});

describe("Hitting-Only Platform: Category Configuration", () => {
  it("Home page CATEGORIES should only include Hitting (no All Skills)", () => {
    const filePath = path.join(__dirname, "../client/src/pages/Home.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    const match = content.match(/const CATEGORIES\s*=\s*\[(.*?)\]/s);
    expect(match).not.toBeNull();

    const categoriesStr = match![1];
    for (const cat of NON_HITTING_CATEGORIES) {
      expect(categoriesStr).not.toContain(`"${cat}"`);
    }
    // "All" should NOT be in CATEGORIES anymore
    expect(categoriesStr).not.toContain('"All"');
    expect(categoriesStr).toContain('"Hitting"');
  });

  it("DrillEditModal CATEGORIES should only include Hitting", () => {
    const filePath = path.join(__dirname, "../client/src/components/DrillEditModal.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    const match = content.match(/const CATEGORIES\s*=\s*\[(.*?)\]/s);
    expect(match).not.toBeNull();

    const categoriesStr = match![1];
    for (const cat of NON_HITTING_CATEGORIES) {
      expect(categoriesStr).not.toContain(`"${cat}"`);
    }
    expect(categoriesStr).toContain('"Hitting"');
  });

  it("categoryColors.ts should not contain non-hitting categories", () => {
    const filePath = path.join(__dirname, "../client/src/lib/categoryColors.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    for (const cat of NON_HITTING_CATEGORIES) {
      expect(content).not.toContain(`"${cat}"`);
    }
    expect(content).toContain('"Hitting"');
  });
});

describe("Hitting-Only Platform: Session Notes Skill Categories", () => {
  it("server-side SKILL_CATEGORIES should not include non-hitting skills", () => {
    const filePath = path.join(__dirname, "routers-session-notes.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    const removedSkills = [
      "Fielding Fundamentals",
      "Throwing Mechanics",
      "Base Running",
      "Bunting",
      "Arm Care / Body Mechanics",
    ];

    for (const skill of removedSkills) {
      expect(content).not.toContain(`"${skill}"`);
    }

    // Should include hitting-focused skills
    expect(content).toContain('"Swing Mechanics"');
    expect(content).toContain('"Pitch Recognition"');
    expect(content).toContain('"Bat Speed Development"');
    expect(content).toContain('"Exit Velocity"');
    expect(content).toContain('"Contact Quality"');
  });

  it("SessionNotesForm should not include non-hitting skill categories", () => {
    const filePath = path.join(__dirname, "../client/src/components/SessionNotesForm.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    const removedSkills = [
      "Fielding Fundamentals",
      "Throwing Mechanics",
      "Base Running",
      "Arm Care / Body Mechanics",
    ];

    // Check SKILL_CATEGORIES array
    const match = content.match(/const SKILL_CATEGORIES\s*=\s*\[(.*?)\]\s*as\s*const/s);
    expect(match).not.toBeNull();

    for (const skill of removedSkills) {
      expect(match![1]).not.toContain(`"${skill}"`);
    }
  });
});

describe("Hitting-Only Platform: Archive Table Schema", () => {
  it("schema should include archivedDrills table", () => {
    const filePath = path.join(__dirname, "../drizzle/schema.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toContain("archivedDrills");
    expect(content).toContain("originalDrillId");
    expect(content).toContain("fullData");
    expect(content).toContain("archiveReason");
  });
});
