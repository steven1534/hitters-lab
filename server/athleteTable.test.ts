import { describe, it, expect } from "vitest";

/**
 * Tests for the AthleteTable component logic.
 * Since the AthleteTable is a frontend-only component that merges data from
 * getAthleteAssignmentOverview and getAllUsers, we test the data transformation
 * and filtering/sorting logic here.
 */

// Mock data matching the shape returned by getAthleteAssignmentOverview
const mockOverviewData = {
  summary: {
    totalAthletes: 4,
    athletesWithDrills: 3,
    athletesWithoutDrills: 1,
    totalDrillsAssigned: 10,
    totalCompleted: 3,
    completionRate: 30,
  },
  athletes: [
    {
      id: "user-1",
      name: "John Smith",
      email: "john@example.com",
      type: "user" as const,
      status: "active" as const,
      hasDrills: true,
      totalDrills: 5,
      completedDrills: 2,
      inProgressDrills: 1,
      assignedDrills: 2,
      lastActivity: new Date("2026-02-10T10:00:00Z"),
    },
    {
      id: "user-2",
      name: "Jane Doe",
      email: "jane@example.com",
      type: "user" as const,
      status: "active" as const,
      hasDrills: true,
      totalDrills: 3,
      completedDrills: 1,
      inProgressDrills: 0,
      assignedDrills: 2,
      lastActivity: new Date("2026-02-12T14:00:00Z"),
    },
    {
      id: "invite-10",
      name: "pending_user",
      email: "pending@example.com",
      type: "invite" as const,
      status: "pending" as const,
      hasDrills: true,
      totalDrills: 2,
      completedDrills: 0,
      inProgressDrills: 0,
      assignedDrills: 2,
      lastActivity: null,
    },
    {
      id: "user-3",
      name: "Bob Wilson",
      email: "bob@example.com",
      type: "user" as const,
      status: "pending" as const,
      hasDrills: false,
      totalDrills: 0,
      completedDrills: 0,
      inProgressDrills: 0,
      assignedDrills: 0,
      lastActivity: null,
    },
  ],
};

// Mock user records from getAllUsers
const mockUsers = [
  {
    id: 1,
    openId: "abc123",
    name: "John Smith",
    email: "john@example.com",
    role: "athlete",
    isActiveClient: 1,
    createdAt: new Date("2026-01-15T08:00:00Z"),
    lastSignedIn: new Date("2026-02-14T09:00:00Z"),
    updatedAt: new Date("2026-02-14T09:00:00Z"),
  },
  {
    id: 2,
    openId: "def456",
    name: "Jane Doe",
    email: "jane@example.com",
    role: "athlete",
    isActiveClient: 1,
    createdAt: new Date("2026-01-20T10:00:00Z"),
    lastSignedIn: new Date("2026-02-13T11:00:00Z"),
    updatedAt: new Date("2026-02-13T11:00:00Z"),
  },
  {
    id: 3,
    openId: "ghi789",
    name: "Bob Wilson",
    email: "bob@example.com",
    role: "user",
    isActiveClient: 0,
    createdAt: new Date("2026-02-01T12:00:00Z"),
    lastSignedIn: new Date("2026-02-05T15:00:00Z"),
    updatedAt: new Date("2026-02-05T15:00:00Z"),
  },
];

// Helper: merge overview data with user records (mirrors AthleteTable component logic)
function mergeAthleteData(overviewAthletes: typeof mockOverviewData.athletes, allUsers: typeof mockUsers) {
  return overviewAthletes.map((athlete) => {
    const numericId = parseInt(athlete.id.replace(/^(user-|invite-)/, ""));
    const userRecord = athlete.type === "user"
      ? allUsers.find((u) => u.id === numericId)
      : null;

    return {
      numericId,
      id: athlete.id,
      name: athlete.name,
      email: athlete.email,
      type: athlete.type,
      status: athlete.status,
      role: userRecord?.role || (athlete.type === "invite" ? "invite" : "user"),
      isActiveClient: userRecord?.isActiveClient === 1,
      hasDrills: athlete.hasDrills,
      totalDrills: athlete.totalDrills,
      completedDrills: athlete.completedDrills,
      inProgressDrills: athlete.inProgressDrills,
      assignedDrills: athlete.assignedDrills,
      lastActivity: athlete.lastActivity ? new Date(athlete.lastActivity) : null,
      createdAt: userRecord?.createdAt ? new Date(userRecord.createdAt) : null,
      lastSignedIn: userRecord?.lastSignedIn ? new Date(userRecord.lastSignedIn) : null,
    };
  });
}

// Helper: filter athletes (mirrors AthleteTable component logic)
function filterAthletes(
  athletes: ReturnType<typeof mergeAthleteData>,
  statusFilter: "all" | "active" | "pending" | "inactive",
  searchQuery: string
) {
  return athletes.filter((a) => {
    if (statusFilter === "active" && !a.isActiveClient) return false;
    if (statusFilter === "pending" && a.type !== "invite") return false;
    if (statusFilter === "inactive" && (a.isActiveClient || a.type === "invite")) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        String(a.numericId).includes(q)
      );
    }
    return true;
  });
}

// Helper: sort athletes (mirrors AthleteTable component logic)
function sortAthletes(
  athletes: ReturnType<typeof mergeAthleteData>,
  sortField: string,
  sortDirection: "asc" | "desc"
) {
  return [...athletes].sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;
    switch (sortField) {
      case "id":
        return (a.numericId - b.numericId) * dir;
      case "name":
        return a.name.localeCompare(b.name) * dir;
      case "totalDrills":
        return (a.totalDrills - b.totalDrills) * dir;
      case "completedDrills":
        return (a.completedDrills - b.completedDrills) * dir;
      case "lastActivity": {
        const aTime = a.lastActivity?.getTime() || 0;
        const bTime = b.lastActivity?.getTime() || 0;
        return (aTime - bTime) * dir;
      }
      default:
        return 0;
    }
  });
}

describe("AthleteTable data merging", () => {
  it("correctly merges overview data with user records", () => {
    const merged = mergeAthleteData(mockOverviewData.athletes, mockUsers);

    expect(merged).toHaveLength(4);

    // John Smith (user-1) should have user record data
    const john = merged.find((a) => a.id === "user-1");
    expect(john).toBeDefined();
    expect(john!.name).toBe("John Smith");
    expect(john!.email).toBe("john@example.com");
    expect(john!.role).toBe("athlete");
    expect(john!.isActiveClient).toBe(true);
    expect(john!.totalDrills).toBe(5);
    expect(john!.completedDrills).toBe(2);
    expect(john!.createdAt).toBeInstanceOf(Date);
    expect(john!.lastSignedIn).toBeInstanceOf(Date);
  });

  it("handles invite records without user records", () => {
    const merged = mergeAthleteData(mockOverviewData.athletes, mockUsers);

    const invite = merged.find((a) => a.id === "invite-10");
    expect(invite).toBeDefined();
    expect(invite!.type).toBe("invite");
    expect(invite!.role).toBe("invite");
    expect(invite!.isActiveClient).toBe(false);
    expect(invite!.createdAt).toBeNull();
    expect(invite!.lastSignedIn).toBeNull();
  });

  it("correctly parses numeric IDs from prefixed IDs", () => {
    const merged = mergeAthleteData(mockOverviewData.athletes, mockUsers);

    expect(merged.find((a) => a.id === "user-1")!.numericId).toBe(1);
    expect(merged.find((a) => a.id === "user-2")!.numericId).toBe(2);
    expect(merged.find((a) => a.id === "invite-10")!.numericId).toBe(10);
    expect(merged.find((a) => a.id === "user-3")!.numericId).toBe(3);
  });

  it("identifies inactive users correctly", () => {
    const merged = mergeAthleteData(mockOverviewData.athletes, mockUsers);

    const bob = merged.find((a) => a.id === "user-3");
    expect(bob!.isActiveClient).toBe(false);
    expect(bob!.role).toBe("user");
  });
});

describe("AthleteTable filtering", () => {
  const merged = mergeAthleteData(mockOverviewData.athletes, mockUsers);

  it("returns all athletes when filter is 'all'", () => {
    const result = filterAthletes(merged, "all", "");
    expect(result).toHaveLength(4);
  });

  it("filters active athletes correctly", () => {
    const result = filterAthletes(merged, "active", "");
    expect(result.every((a) => a.isActiveClient)).toBe(true);
    expect(result).toHaveLength(2); // John and Jane
  });

  it("filters pending (invite) athletes correctly", () => {
    const result = filterAthletes(merged, "pending", "");
    expect(result.every((a) => a.type === "invite")).toBe(true);
    expect(result).toHaveLength(1); // pending_user
  });

  it("filters inactive athletes correctly", () => {
    const result = filterAthletes(merged, "inactive", "");
    expect(result.every((a) => !a.isActiveClient && a.type !== "invite")).toBe(true);
    expect(result).toHaveLength(1); // Bob
  });

  it("searches by name", () => {
    const result = filterAthletes(merged, "all", "john");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("John Smith");
  });

  it("searches by email", () => {
    const result = filterAthletes(merged, "all", "jane@");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Jane Doe");
  });

  it("searches by numeric ID", () => {
    const result = filterAthletes(merged, "all", "10");
    // Should match invite-10
    expect(result.some((a) => a.numericId === 10)).toBe(true);
  });

  it("search is case-insensitive", () => {
    const result = filterAthletes(merged, "all", "JOHN");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("John Smith");
  });

  it("returns empty when no matches", () => {
    const result = filterAthletes(merged, "all", "zzzznonexistent");
    expect(result).toHaveLength(0);
  });
});

describe("AthleteTable sorting", () => {
  const merged = mergeAthleteData(mockOverviewData.athletes, mockUsers);

  it("sorts by name ascending", () => {
    const sorted = sortAthletes(merged, "name", "asc");
    expect(sorted[0].name).toBe("Bob Wilson");
    expect(sorted[1].name).toBe("Jane Doe");
    expect(sorted[2].name).toBe("John Smith");
    expect(sorted[3].name).toBe("pending_user");
  });

  it("sorts by name descending", () => {
    const sorted = sortAthletes(merged, "name", "desc");
    expect(sorted[0].name).toBe("pending_user");
    expect(sorted[sorted.length - 1].name).toBe("Bob Wilson");
  });

  it("sorts by totalDrills ascending", () => {
    const sorted = sortAthletes(merged, "totalDrills", "asc");
    expect(sorted[0].totalDrills).toBe(0);
    expect(sorted[sorted.length - 1].totalDrills).toBe(5);
  });

  it("sorts by totalDrills descending", () => {
    const sorted = sortAthletes(merged, "totalDrills", "desc");
    expect(sorted[0].totalDrills).toBe(5);
    expect(sorted[sorted.length - 1].totalDrills).toBe(0);
  });

  it("sorts by completedDrills ascending", () => {
    const sorted = sortAthletes(merged, "completedDrills", "asc");
    expect(sorted[0].completedDrills).toBe(0);
    expect(sorted[sorted.length - 1].completedDrills).toBe(2);
  });

  it("sorts by lastActivity ascending (null values at start)", () => {
    const sorted = sortAthletes(merged, "lastActivity", "asc");
    // Null activities (time=0) should come first in ascending
    expect(sorted[0].lastActivity).toBeNull();
  });

  it("sorts by lastActivity descending (most recent first)", () => {
    const sorted = sortAthletes(merged, "lastActivity", "desc");
    // Jane has the most recent activity (Feb 12)
    expect(sorted[0].name).toBe("Jane Doe");
  });

  it("sorts by id ascending", () => {
    const sorted = sortAthletes(merged, "id", "asc");
    expect(sorted[0].numericId).toBe(1);
    expect(sorted[sorted.length - 1].numericId).toBe(10);
  });
});

describe("AthleteTable pagination logic", () => {
  it("calculates total pages correctly", () => {
    const rowsPerPage = 15;
    const totalItems = 16;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    expect(totalPages).toBe(2);
  });

  it("calculates total pages for exact fit", () => {
    const rowsPerPage = 15;
    const totalItems = 15;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    expect(totalPages).toBe(1);
  });

  it("slices data correctly for page 1", () => {
    const data = Array.from({ length: 20 }, (_, i) => i);
    const rowsPerPage = 15;
    const page = 1;
    const sliced = data.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    expect(sliced).toHaveLength(15);
    expect(sliced[0]).toBe(0);
    expect(sliced[14]).toBe(14);
  });

  it("slices data correctly for page 2", () => {
    const data = Array.from({ length: 20 }, (_, i) => i);
    const rowsPerPage = 15;
    const page = 2;
    const sliced = data.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    expect(sliced).toHaveLength(5);
    expect(sliced[0]).toBe(15);
    expect(sliced[4]).toBe(19);
  });
});

describe("AthleteTable stats calculation", () => {
  const merged = mergeAthleteData(mockOverviewData.athletes, mockUsers);

  it("counts active athletes correctly", () => {
    const activeCount = merged.filter((a) => a.isActiveClient).length;
    expect(activeCount).toBe(2); // John and Jane
  });

  it("counts pending (invite) athletes correctly", () => {
    const pendingCount = merged.filter((a) => a.type === "invite").length;
    expect(pendingCount).toBe(1);
  });

  it("counts inactive athletes correctly", () => {
    const inactiveCount = merged.filter((a) => !a.isActiveClient && a.type !== "invite").length;
    expect(inactiveCount).toBe(1); // Bob
  });
});
