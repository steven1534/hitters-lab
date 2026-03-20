import { describe, it, expect } from "vitest";

// Replicate the YouTube regex used across the app
const youtubeRegex = /(?:(?:www\.|m\.)?youtube\.com\/watch\?v=|(?:www\.|m\.)?youtube\.com\/watch\/|youtu\.be\/|(?:www\.|m\.)?youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?:[&?]|$)/;

function extractYouTubeId(url: string): string | null {
  const match = url.match(youtubeRegex);
  return match ? match[1] : null;
}

describe("YouTube URL Parsing", () => {
  it("should extract video ID from standard youtube.com/watch?v= URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=ScZkMAXQX1g")).toBe("ScZkMAXQX1g");
  });

  it("should extract video ID from youtube.com without www", () => {
    expect(extractYouTubeId("https://youtube.com/watch?v=ScZkMAXQX1g")).toBe("ScZkMAXQX1g");
  });

  it("should extract video ID from URL with &si= tracking parameter", () => {
    expect(extractYouTubeId("https://youtube.com/watch?v=ScZkMAXQX1g&si=7rBwnRAJ8-Sy7ROSS")).toBe("ScZkMAXQX1g");
  });

  it("should extract video ID from URL with www and &si= tracking parameter", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=ScZkMAXQX1g&si=7rBwnRAJ8-Sy7ROSS")).toBe("ScZkMAXQX1g");
  });

  it("should extract video ID from youtu.be short URL", () => {
    expect(extractYouTubeId("https://youtu.be/ScZkMAXQX1g")).toBe("ScZkMAXQX1g");
  });

  it("should extract video ID from youtu.be with ?si= tracking parameter", () => {
    expect(extractYouTubeId("https://youtu.be/ScZkMAXQX1g?si=7rBwnRAJ8-Sy7ROSS")).toBe("ScZkMAXQX1g");
  });

  it("should extract video ID from embed URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/embed/ScZkMAXQX1g")).toBe("ScZkMAXQX1g");
  });

  it("should extract video ID from mobile youtube URL", () => {
    expect(extractYouTubeId("https://m.youtube.com/watch?v=ScZkMAXQX1g")).toBe("ScZkMAXQX1g");
  });

  it("should extract video ID from URL with multiple query params", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf")).toBe("dQw4w9WgXcQ");
  });

  it("should extract video ID from youtube.com/watch/ format", () => {
    expect(extractYouTubeId("https://youtube.com/watch/ScZkMAXQX1g")).toBe("ScZkMAXQX1g");
  });

  it("should return null for invalid URLs", () => {
    expect(extractYouTubeId("https://example.com/video")).toBeNull();
    expect(extractYouTubeId("not-a-url")).toBeNull();
  });
});
