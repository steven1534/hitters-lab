import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";
import * as drillAssignmentDb from "./drillAssignments";

describe("Parent Management", () => {
  let parentUserId: number;
  let childUserId: number;
  let assignmentId: number;

  beforeAll(async () => {
    // Create test parent user
    await db.upsertUser({
      openId: "test-parent-openid",
      name: "Test Parent",
      email: "parent@test.com",
      role: "user",
    });
    const parent = await db.getUserByOpenId("test-parent-openid");
    if (!parent) throw new Error("Failed to create parent user");
    parentUserId = parent.id;

    // Create test child user
    await db.upsertUser({
      openId: "test-child-openid",
      name: "Test Child",
      email: "child@test.com",
      role: "athlete",
    });
    const child = await db.getUserByOpenId("test-child-openid");
    if (!child) throw new Error("Failed to create child user");
    childUserId = child.id;

    // Assign a drill to the child
    await drillAssignmentDb.assignDrill(
      childUserId,
      "test-drill-1",
      "Test Drill",
      "Test notes"
    );
    
    // Get the assignment ID by querying
    const assignments = await drillAssignmentDb.getUserAssignments(childUserId);
    const testAssignment = assignments.find((a: any) => a.drillId === "test-drill-1");
    if (!testAssignment) throw new Error("Failed to create assignment");
    assignmentId = testAssignment.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test users and assignments
    const database = await db.getDb();
    if (database) {
      const { users, drillAssignments } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      await database.delete(drillAssignments).where(eq(drillAssignments.id, assignmentId));
      await database.delete(users).where(eq(users.id, childUserId));
      await database.delete(users).where(eq(users.id, parentUserId));
    }
  });

  it("should link child to parent", async () => {
    const success = await db.linkChildToParent(childUserId, parentUserId);
    expect(success).toBe(true);

    // Verify the link
    const isParent = await db.isParentOf(parentUserId, childUserId);
    expect(isParent).toBe(true);
  });

  it("should get children by parent", async () => {
    const children = await db.getChildrenByParent(parentUserId);
    expect(children.length).toBeGreaterThan(0);
    expect(children.some(c => c.id === childUserId)).toBe(true);
  });

  it("should get parent of child", async () => {
    const parent = await db.getParentOfChild(childUserId);
    expect(parent).not.toBeNull();
    expect(parent?.id).toBe(parentUserId);
  });

  it("should get child's assignments", async () => {
    const assignments = await drillAssignmentDb.getUserAssignments(childUserId);
    expect(assignments.length).toBeGreaterThan(0);
    expect(assignments.some((a: any) => a.id === assignmentId)).toBe(true);
  });

  it("should update assignment status", async () => {
    const result = await drillAssignmentDb.updateAssignmentStatus(assignmentId, "in-progress");
    expect(result).toBeDefined();

    const assignment = await drillAssignmentDb.getAssignmentById(assignmentId);
    expect(assignment?.status).toBe("in-progress");
  });

  it("should mark assignment as complete", async () => {
    const result = await drillAssignmentDb.updateAssignmentStatus(assignmentId, "completed");
    expect(result).toBeDefined();

    const assignment = await drillAssignmentDb.getAssignmentById(assignmentId);
    expect(assignment?.status).toBe("completed");
    expect(assignment?.completedAt).not.toBeNull();
  });

  it("should get child's progress stats", async () => {
    const stats = await drillAssignmentDb.getAthleteProgressStats(childUserId);
    expect(stats).toBeDefined();
    expect(stats.coreMetrics).toBeDefined();
    expect(stats.coreMetrics.totalAssigned).toBeGreaterThan(0);
  });

  it("should not allow non-parent to access child data", async () => {
    // Create another user who is not the parent
    await db.upsertUser({
      openId: "test-other-user-openid",
      name: "Other User",
      email: "other@test.com",
      role: "user",
    });
    const otherUser = await db.getUserByOpenId("test-other-user-openid");
    if (!otherUser) throw new Error("Failed to create other user");

    const isParent = await db.isParentOf(otherUser.id, childUserId);
    expect(isParent).toBe(false);

    // Cleanup
    const database = await db.getDb();
    if (database) {
      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await database.delete(users).where(eq(users.id, otherUser.id));
    }
  });
});
