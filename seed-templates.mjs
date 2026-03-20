import 'dotenv/config';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const systemTemplates = [
  {
    name: "Video + Key Points",
    description: "Lead with a video demonstration, followed by key coaching points and step-by-step instructions. Best for drills that need visual demonstration.",
    blocks: [
      { id: "t1-1", type: "text", content: "Drill Overview", style: { fontSize: "24px", fontWeight: "bold", textAlign: "left" } },
      { id: "t1-2", type: "text", content: "Add a brief description of the drill purpose and what it develops.", style: { fontSize: "16px", fontWeight: "normal", textAlign: "left" } },
      { id: "t1-3", type: "video", url: "" },
      { id: "t1-4", type: "text", content: "Key Coaching Points", style: { fontSize: "24px", fontWeight: "bold", textAlign: "left" } },
      { id: "t1-5", type: "list", items: ["Focus on proper mechanics", "Maintain balance throughout", "Follow through completely"] },
      { id: "t1-6", type: "divider" },
      { id: "t1-7", type: "text", content: "Step-by-Step Instructions", style: { fontSize: "24px", fontWeight: "bold", textAlign: "left" } },
      { id: "t1-8", type: "list", items: ["Step 1: Setup position", "Step 2: Execute the movement", "Step 3: Follow through"], listType: "numbered" },
      { id: "t1-9", type: "callout", content: "Coach's Tip: Add your personal coaching insight here.", calloutType: "info" }
    ],
    isSystem: true,
    createdBy: 0
  },
  {
    name: "Drill Breakdown",
    description: "Structured breakdown with purpose, equipment, setup, execution, and common mistakes. Great for detailed drill documentation.",
    blocks: [
      { id: "t2-1", type: "text", content: "Purpose", style: { fontSize: "24px", fontWeight: "bold", textAlign: "left" } },
      { id: "t2-2", type: "text", content: "Describe what this drill develops and why it matters.", style: { fontSize: "16px", fontWeight: "normal", textAlign: "left" } },
      { id: "t2-3", type: "divider" },
      { id: "t2-4", type: "text", content: "Equipment Needed", style: { fontSize: "24px", fontWeight: "bold", textAlign: "left" } },
      { id: "t2-5", type: "list", items: ["Bat", "Tee", "Baseballs (dozen)"] },
      { id: "t2-6", type: "divider" },
      { id: "t2-7", type: "text", content: "Setup", style: { fontSize: "24px", fontWeight: "bold", textAlign: "left" } },
      { id: "t2-8", type: "text", content: "Describe how to set up the drill space and equipment.", style: { fontSize: "16px", fontWeight: "normal", textAlign: "left" } },
      { id: "t2-9", type: "divider" },
      { id: "t2-10", type: "text", content: "Execution", style: { fontSize: "24px", fontWeight: "bold", textAlign: "left" } },
      { id: "t2-11", type: "list", items: ["Phase 1: Warm-up reps at 50%", "Phase 2: Full speed reps", "Phase 3: Game-speed with intent"], listType: "numbered" },
      { id: "t2-12", type: "divider" },
      { id: "t2-13", type: "text", content: "Common Mistakes to Avoid", style: { fontSize: "24px", fontWeight: "bold", textAlign: "left" } },
      { id: "t2-14", type: "callout", content: "Rushing through reps without focusing on quality. Each rep should be intentional.", calloutType: "warning" },
      { id: "t2-15", type: "list", items: ["Dropping the hands", "Stepping out instead of toward the pitcher", "Not finishing the swing"] }
    ],
    isSystem: true,
    createdBy: 0
  },
  {
    name: "Quick Reference Card",
    description: "Compact, at-a-glance format with just the essentials. Perfect for drills athletes already know — just need a quick reminder.",
    blocks: [
      { id: "t3-1", type: "text", content: "Quick Reference", style: { fontSize: "24px", fontWeight: "bold", textAlign: "left" } },
      { id: "t3-2", type: "callout", content: "Difficulty: Medium | Duration: 10-15 min | Equipment: Bat, Tee", calloutType: "info" },
      { id: "t3-3", type: "text", content: "What to Focus On", style: { fontSize: "20px", fontWeight: "bold", textAlign: "left" } },
      { id: "t3-4", type: "list", items: ["Hands inside the ball", "Stay balanced", "Drive through contact"] },
      { id: "t3-5", type: "divider" },
      { id: "t3-6", type: "text", content: "Reps", style: { fontSize: "20px", fontWeight: "bold", textAlign: "left" } },
      { id: "t3-7", type: "text", content: "3 sets of 10 swings with 30 seconds rest between sets.", style: { fontSize: "16px", fontWeight: "normal", textAlign: "left" } },
      { id: "t3-8", type: "callout", content: "Remember: Quality over quantity. Every rep counts.", calloutType: "info" }
    ],
    isSystem: true,
    createdBy: 0
  },
  {
    name: "Video Gallery",
    description: "Multiple video angles with coaching commentary between each. Ideal for complex drills that benefit from different viewing angles.",
    blocks: [
      { id: "t4-1", type: "text", content: "Drill Demonstration", style: { fontSize: "24px", fontWeight: "bold", textAlign: "left" } },
      { id: "t4-2", type: "text", content: "Watch the drill from multiple angles to understand the full movement.", style: { fontSize: "16px", fontWeight: "normal", textAlign: "left" } },
      { id: "t4-3", type: "text", content: "Front View", style: { fontSize: "20px", fontWeight: "bold", textAlign: "left" } },
      { id: "t4-4", type: "video", url: "" },
      { id: "t4-5", type: "text", content: "Notice the hand path and how the barrel stays in the zone.", style: { fontSize: "16px", fontWeight: "normal", textAlign: "left" } },
      { id: "t4-6", type: "divider" },
      { id: "t4-7", type: "text", content: "Side View", style: { fontSize: "20px", fontWeight: "bold", textAlign: "left" } },
      { id: "t4-8", type: "video", url: "" },
      { id: "t4-9", type: "text", content: "Pay attention to the hip rotation and weight transfer.", style: { fontSize: "16px", fontWeight: "normal", textAlign: "left" } },
      { id: "t4-10", type: "divider" },
      { id: "t4-11", type: "text", content: "Key Takeaways", style: { fontSize: "24px", fontWeight: "bold", textAlign: "left" } },
      { id: "t4-12", type: "list", items: ["Smooth load and trigger", "Efficient hand path", "Full extension through the ball"] }
    ],
    isSystem: true,
    createdBy: 0
  },
  {
    name: "Progressive Drill Series",
    description: "Multi-phase progression from basic to advanced. Best for drills that build on each other across difficulty levels.",
    blocks: [
      { id: "t5-1", type: "text", content: "Progression Overview", style: { fontSize: "24px", fontWeight: "bold", textAlign: "left" } },
      { id: "t5-2", type: "text", content: "This drill has three progression levels. Master each level before moving to the next.", style: { fontSize: "16px", fontWeight: "normal", textAlign: "left" } },
      { id: "t5-3", type: "divider" },
      { id: "t5-4", type: "callout", content: "Level 1: Foundation", calloutType: "info" },
      { id: "t5-5", type: "text", content: "Start with the basic movement pattern at 50% speed. Focus on form over power.", style: { fontSize: "16px", fontWeight: "normal", textAlign: "left" } },
      { id: "t5-6", type: "list", items: ["10 reps at slow speed", "Focus: Proper mechanics", "When ready: Move to Level 2"] },
      { id: "t5-7", type: "divider" },
      { id: "t5-8", type: "callout", content: "Level 2: Development", calloutType: "info" },
      { id: "t5-9", type: "text", content: "Increase speed to 75%. Add intent while maintaining form.", style: { fontSize: "16px", fontWeight: "normal", textAlign: "left" } },
      { id: "t5-10", type: "list", items: ["10 reps at moderate speed", "Focus: Timing and rhythm", "When ready: Move to Level 3"] },
      { id: "t5-11", type: "divider" },
      { id: "t5-12", type: "callout", content: "Level 3: Game Speed", calloutType: "warning" },
      { id: "t5-13", type: "text", content: "Full game speed with maximum intent. This is where it all comes together.", style: { fontSize: "16px", fontWeight: "normal", textAlign: "left" } },
      { id: "t5-14", type: "list", items: ["10 reps at full speed", "Focus: Compete with every swing", "Track results and adjust"] }
    ],
    isSystem: true,
    createdBy: 0
  }
];

async function seed() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // Check if system templates already exist
  const [existing] = await conn.execute('SELECT COUNT(*) as cnt FROM drillPageTemplates WHERE isSystem = 1');
  if (existing[0].cnt > 0) {
    console.log(`System templates already exist (${existing[0].cnt}). Skipping seed.`);
    await conn.end();
    return;
  }

  for (const tmpl of systemTemplates) {
    await conn.execute(
      'INSERT INTO drillPageTemplates (name, description, blocks, createdBy, isSystem) VALUES (?, ?, ?, ?, ?)',
      [tmpl.name, tmpl.description, JSON.stringify(tmpl.blocks), tmpl.createdBy, tmpl.isSystem ? 1 : 0]
    );
    console.log(`  Seeded: ${tmpl.name}`);
  }

  console.log(`Done — ${systemTemplates.length} system templates seeded.`);
  await conn.end();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
