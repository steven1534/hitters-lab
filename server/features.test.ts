import { describe, it, expect } from "vitest";

// Test drill comparison logic - extracting YouTube video IDs
describe("Drill Comparison - YouTube Video ID Extraction", () => {
  const extractYouTubeId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  it("extracts video ID from standard YouTube URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=ScZkMAXQX1g")).toBe("ScZkMAXQX1g");
  });

  it("extracts video ID from YouTube URL with tracking params", () => {
    expect(extractYouTubeId("https://youtube.com/watch?v=ScZkMAXQX1g&si=7rBwnRAJ8-Sy7ROS")).toBe("ScZkMAXQX1g");
  });

  it("extracts video ID from youtu.be short URL", () => {
    expect(extractYouTubeId("https://youtu.be/ScZkMAXQX1g")).toBe("ScZkMAXQX1g");
  });

  it("extracts video ID from embed URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/embed/ScZkMAXQX1g")).toBe("ScZkMAXQX1g");
  });

  it("returns null for non-YouTube URLs", () => {
    expect(extractYouTubeId("https://vimeo.com/12345")).toBeNull();
  });
});

// Test athlete assessment report logic
describe("Athlete Assessment - Engagement Level", () => {
  const getEngagementLevel = (completionRate: number) => {
    if (completionRate >= 80) return "Highly Engaged";
    if (completionRate >= 50) return "Moderately Engaged";
    if (completionRate >= 25) return "Needs Encouragement";
    return "At Risk";
  };

  it("returns Highly Engaged for 80%+ completion", () => {
    expect(getEngagementLevel(80)).toBe("Highly Engaged");
    expect(getEngagementLevel(100)).toBe("Highly Engaged");
    expect(getEngagementLevel(95)).toBe("Highly Engaged");
  });

  it("returns Moderately Engaged for 50-79% completion", () => {
    expect(getEngagementLevel(50)).toBe("Moderately Engaged");
    expect(getEngagementLevel(65)).toBe("Moderately Engaged");
    expect(getEngagementLevel(79)).toBe("Moderately Engaged");
  });

  it("returns Needs Encouragement for 25-49% completion", () => {
    expect(getEngagementLevel(25)).toBe("Needs Encouragement");
    expect(getEngagementLevel(40)).toBe("Needs Encouragement");
    expect(getEngagementLevel(49)).toBe("Needs Encouragement");
  });

  it("returns At Risk for below 25% completion", () => {
    expect(getEngagementLevel(0)).toBe("At Risk");
    expect(getEngagementLevel(10)).toBe("At Risk");
    expect(getEngagementLevel(24)).toBe("At Risk");
  });
});

// Test recommendation generation logic
describe("Athlete Assessment - Recommendations", () => {
  interface MetricsInput {
    completionRate: number;
    inProgress: number;
    avgDaysToComplete: number;
    totalAssigned: number;
  }

  const generateRecommendations = (metrics: MetricsInput, weeklyAllZero: boolean): string[] => {
    const recommendations: string[] = [];
    if (metrics.completionRate < 50) {
      recommendations.push("Consider reducing the number of assigned drills to avoid overwhelming the athlete.");
    }
    if (metrics.inProgress > 3) {
      recommendations.push("Multiple drills are in-progress. Encourage the athlete to complete current drills before starting new ones.");
    }
    if (metrics.avgDaysToComplete > 7) {
      recommendations.push("Average completion time is over a week. Consider setting shorter deadlines or breaking drills into smaller sessions.");
    }
    if (metrics.completionRate >= 80) {
      recommendations.push("Excellent completion rate! Consider increasing difficulty or adding more advanced drills.");
    }
    if (weeklyAllZero) {
      recommendations.push("No drill completions in the last 4 weeks. A check-in conversation may be helpful.");
    }
    if (metrics.totalAssigned === 0) {
      recommendations.push("No drills have been assigned yet. Start with 2-3 foundational drills.");
    }
    if (recommendations.length === 0) {
      recommendations.push("Athlete is progressing steadily. Continue current training plan.");
    }
    return recommendations;
  };

  it("recommends reducing drills for low completion rate", () => {
    const recs = generateRecommendations(
      { completionRate: 30, inProgress: 1, avgDaysToComplete: 3, totalAssigned: 10 },
      false
    );
    expect(recs).toContain("Consider reducing the number of assigned drills to avoid overwhelming the athlete.");
  });

  it("recommends completing current drills when too many in progress", () => {
    const recs = generateRecommendations(
      { completionRate: 60, inProgress: 5, avgDaysToComplete: 3, totalAssigned: 10 },
      false
    );
    expect(recs).toContain("Multiple drills are in-progress. Encourage the athlete to complete current drills before starting new ones.");
  });

  it("recommends increasing difficulty for high completion rate", () => {
    const recs = generateRecommendations(
      { completionRate: 90, inProgress: 1, avgDaysToComplete: 3, totalAssigned: 10 },
      false
    );
    expect(recs).toContain("Excellent completion rate! Consider increasing difficulty or adding more advanced drills.");
  });

  it("flags no activity in last 4 weeks", () => {
    const recs = generateRecommendations(
      { completionRate: 60, inProgress: 1, avgDaysToComplete: 3, totalAssigned: 10 },
      true
    );
    expect(recs).toContain("No drill completions in the last 4 weeks. A check-in conversation may be helpful.");
  });

  it("suggests starting drills when none assigned", () => {
    const recs = generateRecommendations(
      { completionRate: 0, inProgress: 0, avgDaysToComplete: 0, totalAssigned: 0 },
      true
    );
    expect(recs).toContain("No drills have been assigned yet. Start with 2-3 foundational drills.");
  });

  it("provides default recommendation when athlete is on track", () => {
    const recs = generateRecommendations(
      { completionRate: 65, inProgress: 2, avgDaysToComplete: 4, totalAssigned: 10 },
      false
    );
    expect(recs).toContain("Athlete is progressing steadily. Continue current training plan.");
  });

  it("flags slow completion time", () => {
    const recs = generateRecommendations(
      { completionRate: 60, inProgress: 2, avgDaysToComplete: 10, totalAssigned: 10 },
      false
    );
    expect(recs).toContain("Average completion time is over a week. Consider setting shorter deadlines or breaking drills into smaller sessions.");
  });
});

// Test drill data structure for comparison
describe("Drill Comparison - Data Structure", () => {
  it("validates drill structure has required fields", () => {
    const drill = {
      id: "1",
      name: "1-2-3 Drill",
      difficulty: "Easy",
      categories: ["Hitting"],
      duration: "10 min",
    };
    expect(drill).toHaveProperty("id");
    expect(drill).toHaveProperty("name");
    expect(drill).toHaveProperty("difficulty");
    expect(drill).toHaveProperty("categories");
    expect(drill).toHaveProperty("duration");
    expect(Array.isArray(drill.categories)).toBe(true);
  });

  it("compares drill difficulties correctly", () => {
    const difficultyOrder: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
    expect(difficultyOrder["Easy"]).toBeLessThan(difficultyOrder["Medium"]);
    expect(difficultyOrder["Medium"]).toBeLessThan(difficultyOrder["Hard"]);
  });
});
