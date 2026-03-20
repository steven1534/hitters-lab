import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Invite Name Column Feature", () => {
  describe("Schema", () => {
    it("should have a name column in the invites table", () => {
      const schemaPath = path.join(__dirname, "../drizzle/schema.ts");
      const content = fs.readFileSync(schemaPath, "utf-8");

      // Find the invites table definition
      const invitesMatch = content.match(/export const invites = mysqlTable\("invites",\s*\{([\s\S]*?)\}\);/);
      expect(invitesMatch).not.toBeNull();

      const invitesBody = invitesMatch![1];
      expect(invitesBody).toContain('name:');
      expect(invitesBody).toContain('varchar("name"');
    });
  });

  describe("Server: invites.ts", () => {
    it("createInvite should accept an optional name parameter", () => {
      const filePath = path.join(__dirname, "invites.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      // Check function signature includes name parameter
      expect(content).toContain("name?: string");

      // Check that name is included in the insert values
      expect(content).toContain("name: name || null");
    });

    it("createInvite should return name in the response", () => {
      const filePath = path.join(__dirname, "invites.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      // Check return object includes name
      const returnMatch = content.match(/return \{[\s\S]*?name:[\s\S]*?\}/);
      expect(returnMatch).not.toBeNull();
    });

    it("resendInvite should preserve name when recreating invite", () => {
      const filePath = path.join(__dirname, "invites.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      // Check that resendInvite passes oldInvite.name
      expect(content).toContain("oldInvite.name");
    });

    it("sendExpirationReminder should use invite name if available", () => {
      const filePath = path.join(__dirname, "invites.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      // Check that reminder uses invite.name as fallback
      expect(content).toContain('invite.name || invite.email.split("@")[0]');
    });
  });

  describe("Server: routers.ts", () => {
    it("createInvite procedure should accept optional name in input", () => {
      const filePath = path.join(__dirname, "routers.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      // Check that the input schema includes name
      expect(content).toContain("name: z.string().optional()");
    });

    it("createInvite procedure should pass name to inviteDb.createInvite", () => {
      const filePath = path.join(__dirname, "routers.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      // Check that input.name is passed
      expect(content).toContain("input.name");
    });
  });

  describe("Server: drillAssignments.ts", () => {
    it("should use invite.name when resolving athlete name from invite", () => {
      const filePath = path.join(__dirname, "drillAssignments.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      // Check that invite name is used as primary fallback
      expect(content).toContain("invite?.name || invite?.email?.split('@')[0]");
    });

    it("should use invite.name in athlete overview for pending invites", () => {
      const filePath = path.join(__dirname, "drillAssignments.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      // Check that athlete overview uses invite.name
      expect(content).toContain("invite.name || invite.email.split('@')[0]");
    });
  });

  describe("Frontend: AdminDashboard.tsx", () => {
    it("should have a name input field in the invite creation form", () => {
      const filePath = path.join(__dirname, "../client/src/pages/AdminDashboard.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      // Check for name input
      expect(content).toContain('placeholder="Athlete name (optional)"');
      expect(content).toContain("newInviteName");
      expect(content).toContain("setNewInviteName");
    });

    it("should display invite name alongside email in the invite list", () => {
      const filePath = path.join(__dirname, "../client/src/pages/AdminDashboard.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      // Check that invite.name is displayed
      expect(content).toContain("invite.name");
    });

    it("should pass name to createInvite mutation", () => {
      const filePath = path.join(__dirname, "../client/src/pages/AdminDashboard.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      // Check mutation call includes name
      expect(content).toContain("name: newInviteName || undefined");
    });

    it("should reset name field after successful invite creation", () => {
      const filePath = path.join(__dirname, "../client/src/pages/AdminDashboard.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      // Check that name is reset on success
      expect(content).toContain('setNewInviteName("")');
    });
  });

  describe("Frontend: CoachDashboard.tsx", () => {
    it("should use invite name in athlete options when available", () => {
      const filePath = path.join(__dirname, "../client/src/pages/CoachDashboard.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      // Check that inv.name is used
      expect(content).toContain("inv.name || inv.email.split('@')[0]");
    });
  });
});
