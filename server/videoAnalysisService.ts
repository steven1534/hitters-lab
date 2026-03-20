/**
 * Video Analysis Service — Gemini-powered baseball mechanics analysis
 *
 * Sends athlete video URLs to the LLM (which supports multimodal video input)
 * and returns structured feedback on mechanics, strengths, and areas for improvement.
 */

import { invokeLLM } from "./_core/llm";

export interface VideoAnalysisResult {
  overallAssessment: string;
  mechanicsBreakdown: {
    phase: string;
    observation: string;
    rating: number; // 1-5
  }[];
  strengths: string[];
  areasForImprovement: string[];
  drillRecommendations: string[];
  coachingCues: string[];
  confidenceScore: number; // 0-100
}

const COACHING_SYSTEM_PROMPT = `You are an expert baseball hitting and pitching instructor with 20+ years of experience, including time as a professional scout. Your coaching philosophy emphasizes:

1. **Development over Results** — Focus on skill development and long-term growth, not just stats.
2. **Awareness Before Mechanics** — Understand the situation before fixing the swing. Baseball IQ matters.
3. **Individualized Coaching** — Every athlete is different. Adapt feedback to their age, skill level, and learning style.

When analyzing video:
- Identify specific phases of the movement (stance, load, stride, swing/delivery, follow-through)
- Note body positioning, timing, balance, and bat/arm path
- Be encouraging but honest — highlight what's working before addressing what needs improvement
- Provide actionable coaching cues (short, memorable phrases athletes can use during practice)
- Recommend specific drills that address identified areas for improvement
- Rate each mechanical phase 1-5 (1=needs significant work, 3=developing, 5=excellent)
- Provide an overall confidence score (0-100) for how confident you are in the analysis based on video quality

Keep language professional but approachable — these reports will be reviewed by a coach and potentially shared with parents.`;

/**
 * Analyze an athlete's video submission using the LLM with multimodal video input.
 */
export async function analyzeAthleteVideo(params: {
  videoUrl: string;
  drillName: string;
  athleteName?: string;
  athleteAge?: string;
  athletePosition?: string;
  additionalContext?: string;
}): Promise<VideoAnalysisResult> {
  const { videoUrl, drillName, athleteName, athleteAge, athletePosition, additionalContext } = params;

  let userPrompt = `Analyze this baseball drill video submission.\n\n`;
  userPrompt += `**Drill:** ${drillName}\n`;
  if (athleteName) userPrompt += `**Athlete:** ${athleteName}\n`;
  if (athleteAge) userPrompt += `**Age:** ${athleteAge}\n`;
  if (athletePosition) userPrompt += `**Position:** ${athletePosition}\n`;
  if (additionalContext) userPrompt += `**Additional Context:** ${additionalContext}\n`;
  userPrompt += `\nProvide a comprehensive analysis of the athlete's mechanics, technique, and areas for development. Return your analysis as structured JSON.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: COACHING_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "file_url",
            file_url: {
              url: videoUrl,
              mime_type: "video/mp4",
            },
          },
          {
            type: "text",
            text: userPrompt,
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "video_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            overallAssessment: {
              type: "string",
              description: "A 2-3 sentence overall assessment of the athlete's performance in this video",
            },
            mechanicsBreakdown: {
              type: "array",
              description: "Breakdown of each mechanical phase observed",
              items: {
                type: "object",
                properties: {
                  phase: {
                    type: "string",
                    description: "Name of the mechanical phase (e.g., Stance, Load, Stride, Swing, Follow-Through)",
                  },
                  observation: {
                    type: "string",
                    description: "Detailed observation of what the athlete is doing in this phase",
                  },
                  rating: {
                    type: "number",
                    description: "Rating from 1-5 (1=needs significant work, 3=developing, 5=excellent)",
                  },
                },
                required: ["phase", "observation", "rating"],
                additionalProperties: false,
              },
            },
            strengths: {
              type: "array",
              description: "List of things the athlete is doing well",
              items: { type: "string" },
            },
            areasForImprovement: {
              type: "array",
              description: "List of areas that need work, with specific observations",
              items: { type: "string" },
            },
            drillRecommendations: {
              type: "array",
              description: "Specific drills recommended to address areas for improvement",
              items: { type: "string" },
            },
            coachingCues: {
              type: "array",
              description: "Short, memorable coaching cues the athlete can use during practice",
              items: { type: "string" },
            },
            confidenceScore: {
              type: "number",
              description: "0-100 confidence in the analysis based on video quality and visibility",
            },
          },
          required: [
            "overallAssessment",
            "mechanicsBreakdown",
            "strengths",
            "areasForImprovement",
            "drillRecommendations",
            "coachingCues",
            "confidenceScore",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("No analysis content returned from LLM");
  }

  const parsed = JSON.parse(content) as VideoAnalysisResult;

  // Validate basic structure
  if (!parsed.overallAssessment || !Array.isArray(parsed.mechanicsBreakdown)) {
    throw new Error("Invalid analysis structure returned from LLM");
  }

  return parsed;
}

/**
 * Format AI analysis into a readable coach-editable text block.
 */
export function formatAnalysisForCoachEdit(analysis: VideoAnalysisResult): string {
  let text = `## Overall Assessment\n${analysis.overallAssessment}\n\n`;

  text += `## Mechanics Breakdown\n`;
  for (const phase of analysis.mechanicsBreakdown) {
    const stars = "★".repeat(phase.rating) + "☆".repeat(5 - phase.rating);
    text += `### ${phase.phase} ${stars}\n${phase.observation}\n\n`;
  }

  text += `## Strengths\n`;
  for (const s of analysis.strengths) {
    text += `- ${s}\n`;
  }
  text += `\n`;

  text += `## Areas for Improvement\n`;
  for (const a of analysis.areasForImprovement) {
    text += `- ${a}\n`;
  }
  text += `\n`;

  text += `## Recommended Drills\n`;
  for (const d of analysis.drillRecommendations) {
    text += `- ${d}\n`;
  }
  text += `\n`;

  text += `## Coaching Cues\n`;
  for (const c of analysis.coachingCues) {
    text += `- "${c}"\n`;
  }

  return text;
}
