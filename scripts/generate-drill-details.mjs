import fs from 'fs';
import path from 'path';

// Read drills.json
const drillsPath = path.resolve('./client/src/data/drills.json');
const drillsData = JSON.parse(fs.readFileSync(drillsPath, 'utf-8'));

// Read DrillDetail.tsx to extract existing drill IDs
const drillDetailPath = path.resolve('./client/src/pages/DrillDetail.tsx');
const drillDetailContent = fs.readFileSync(drillDetailPath, 'utf-8');

// Extract drill IDs from drillDetails object
const existingDrillIds = new Set();
const idMatches = drillDetailContent.match(/"([a-z0-9-]+)":\s*\{\s*skillSet:/g);
if (idMatches) {
  idMatches.forEach(match => {
    const id = match.match(/"([^"]+)"/)[1];
    existingDrillIds.add(id);
  });
}

// Find missing drills
const missingDrills = drillsData.filter(drill => !existingDrillIds.has(drill.id));

console.log(`Total drills: ${drillsData.length}`);
console.log(`Drills with details: ${existingDrillIds.size}`);
console.log(`Missing drills: ${missingDrills.length}`);
console.log('');

// Generate TypeScript code for missing drills
let generatedCode = '';

missingDrills.forEach(drill => {
  const skillSet = drill.categories[0] || 'General';
  const difficulty = drill.difficulty || 'Unknown';
  const duration = drill.duration || 'Unknown';
  
  generatedCode += `  "${drill.id}": {
    skillSet: "${skillSet}",
    difficulty: "${difficulty}",
    athletes: "Varies",
    time: "${duration}",
    equipment: "Varies",
    goal: "${drill.name}",
    description: [
      "Step 1: Set up the drill",
      "Step 2: Execute the drill",
      "Step 3: Focus on proper technique",
      "Step 4: Repeat for multiple sets"
    ],
    videoUrl: null
  },\n`;
});

// Write to output file
const outputPath = path.resolve('./scripts/generated-drill-details.ts');
fs.writeFileSync(outputPath, generatedCode);

console.log(`Generated drill details for ${missingDrills.length} missing drills`);
console.log(`Output written to: ${outputPath}`);
console.log('');
console.log('To add these drills to DrillDetail.tsx:');
console.log('1. Open client/src/pages/DrillDetail.tsx');
console.log('2. Find the closing brace of the drillDetails object (around line 857)');
console.log('3. Copy the contents of generated-drill-details.ts and paste before the closing brace');
console.log('4. Remove the trailing comma from the last entry');
