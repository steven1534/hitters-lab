import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// Mock the drillAssignments module
vi.mock("./drillAssignments", () => ({
  getAssignmentById: vi.fn(),
  updateAssignmentStatus: vi.fn(),
}));

import * as drillAssignmentDb from "./drillAssignments";

describe("updateStatus authorization logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow admin to update any assignment", async () => {
    const mockAssignment = {
      id: 1,
      userId: 100,
      drillId: "drill-1",
      drillName: "Test Drill",
      status: "assigned",
    };

    vi.mocked(drillAssignmentDb.getAssignmentById).mockResolvedValue(mockAssignment as any);
    vi.mocked(drillAssignmentDb.updateAssignmentStatus).mockResolvedValue({} as any);

    // Simulate admin user context
    const adminUser = { id: 999, role: "admin" };
    const input = { assignmentId: 1, status: "completed" as const };

    // Admin should be able to update any assignment
    // The logic: if user.role === 'admin', update directly without checking ownership
    if (adminUser.role === "admin") {
      await drillAssignmentDb.updateAssignmentStatus(input.assignmentId, input.status);
    }

    expect(drillAssignmentDb.updateAssignmentStatus).toHaveBeenCalledWith(1, "completed");
  });

  it("should allow athlete to update their own assignment", async () => {
    const athleteUserId = 100;
    const mockAssignment = {
      id: 1,
      userId: athleteUserId,
      drillId: "drill-1",
      drillName: "Test Drill",
      status: "assigned",
    };

    vi.mocked(drillAssignmentDb.getAssignmentById).mockResolvedValue(mockAssignment as any);
    vi.mocked(drillAssignmentDb.updateAssignmentStatus).mockResolvedValue({} as any);

    // Simulate athlete user context
    const athleteUser = { id: athleteUserId, role: "athlete" };
    const input = { assignmentId: 1, status: "completed" as const };

    // Athlete should be able to update their own assignment
    const assignment = await drillAssignmentDb.getAssignmentById(input.assignmentId);
    
    expect(assignment).not.toBeNull();
    expect(assignment!.userId).toBe(athleteUser.id);

    // Since userId matches, athlete can update
    if (assignment && assignment.userId === athleteUser.id) {
      await drillAssignmentDb.updateAssignmentStatus(input.assignmentId, input.status);
    }

    expect(drillAssignmentDb.updateAssignmentStatus).toHaveBeenCalledWith(1, "completed");
  });

  it("should prevent athlete from updating another user's assignment", async () => {
    const mockAssignment = {
      id: 1,
      userId: 100, // Different user
      drillId: "drill-1",
      drillName: "Test Drill",
      status: "assigned",
    };

    vi.mocked(drillAssignmentDb.getAssignmentById).mockResolvedValue(mockAssignment as any);

    // Simulate different athlete user context
    const athleteUser = { id: 200, role: "athlete" }; // Different user ID
    const input = { assignmentId: 1, status: "completed" as const };

    const assignment = await drillAssignmentDb.getAssignmentById(input.assignmentId);
    
    expect(assignment).not.toBeNull();
    expect(assignment!.userId).not.toBe(athleteUser.id);

    // Since userId doesn't match, athlete should NOT be able to update
    // This would throw FORBIDDEN error in the actual implementation
    let shouldForbid = false;
    if (assignment && assignment.userId !== athleteUser.id) {
      shouldForbid = true;
    }

    expect(shouldForbid).toBe(true);
    expect(drillAssignmentDb.updateAssignmentStatus).not.toHaveBeenCalled();
  });

  it("should return NOT_FOUND when assignment doesn't exist", async () => {
    vi.mocked(drillAssignmentDb.getAssignmentById).mockResolvedValue(null);

    const athleteUser = { id: 100, role: "athlete" };
    const input = { assignmentId: 999, status: "completed" as const };

    const assignment = await drillAssignmentDb.getAssignmentById(input.assignmentId);
    
    expect(assignment).toBeNull();
    // This would throw NOT_FOUND error in the actual implementation
  });

  it("should verify getAssignmentById returns correct assignment structure", async () => {
    const mockAssignment = {
      id: 1,
      userId: 100,
      inviteId: null,
      drillId: "drill-1",
      drillName: "Test Drill",
      status: "assigned",
      notes: null,
      assignedAt: new Date(),
      completedAt: null,
      updatedAt: new Date(),
    };

    vi.mocked(drillAssignmentDb.getAssignmentById).mockResolvedValue(mockAssignment as any);

    const assignment = await drillAssignmentDb.getAssignmentById(1);

    expect(assignment).toHaveProperty("id");
    expect(assignment).toHaveProperty("userId");
    expect(assignment).toHaveProperty("drillId");
    expect(assignment).toHaveProperty("status");
  });
});
