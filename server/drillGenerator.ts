import { ENV } from "./_core/env";
import OpenAI from "openai";

interface GeneratedDrill {
  name: string;
  goal: string;
  difficulty: "Easy" | "Medium" | "Hard";
  duration: string;
  skillSet: string;
  instructions: string;
  equipment?: string;
  tips?: string;
}

const client = new OpenAI({
  apiKey: ENV.openaiApiKey,
});

export async function generateDrill(
  issue: string,
  skillLevel?: "beginner" | "intermediate" | "advanced"
): Promise<GeneratedDrill> {
  if (!ENV.openaiApiKey) {
    throw new Error("OpenAI API key is not configured");
  }

  const skillLevelText = skillLevel || "intermediate";
  const prompt = `You are a professional baseball coach with 20+ years of experience. 
Create a specific, practical drill to address this issue: "${issue}"

The drill should be appropriate for ${skillLevelText} level players.

Format your response EXACTLY as follows (use | as separator):
Drill Name | The Goal | Difficulty (Easy/Medium/Hard) | Duration (e.g., 15 minutes) | Skill Set (Hitting) | Equipment Needed | Step-by-step instructions (numbered, detailed) | Coach Tips and Common Mistakes

Example format:
Hand Position Drill | Fix dropped hands in swing | Medium | 15 minutes | Batting | Baseball bat, tee, baseballs | 1. Set up tee at waist height... | Tip 1: Watch for elbow drop... Mistake: Players often rush...

Now create the drill:`;

  try {
    const message = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText = message.choices[0].message.content || "";

    // Parse the response
    const parts = responseText.split("|").map((p: string) => p.trim());

    if (parts.length < 7) {
      throw new Error("Invalid drill format received from AI");
    }

    const drill: GeneratedDrill = {
      name: parts[0],
      goal: parts[1],
      difficulty: (parts[2] as "Easy" | "Medium" | "Hard") || "Medium",
      duration: parts[3],
      skillSet: parts[4],
      equipment: parts[5],
      instructions: parts[6],
      tips: parts[7],
    };

    return drill;
  } catch (error) {
    console.error("[DrillGenerator] Error:", error);
    throw new Error(
      `Failed to generate drill: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
