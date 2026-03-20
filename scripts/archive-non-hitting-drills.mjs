/**
 * Archive Non-Hitting Drills
 * 
 * This script:
 * 1. Reads drills.json and identifies all non-hitting drills
 * 2. Archives them to the archivedDrills database table
 * 3. Removes them from drills.json (keeping only Hitting drills)
 * 4. Also archives any non-hitting custom drills from the customDrills table
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Load env
import 'dotenv/config';

const REMOVE_CATEGORIES = new Set(['Bunting', 'Pitching', 'Infield', 'Outfield', 'Catching', 'Base Running']);

async function main() {
  // Read drills.json
  const drillsPath = path.join(projectRoot, 'client/src/data/drills.json');
  const drills = JSON.parse(fs.readFileSync(drillsPath, 'utf-8'));
  
  console.log(`Total drills in drills.json: ${drills.length}`);
  
  // Separate hitting vs non-hitting
  const hittingDrills = [];
  const nonHittingDrills = [];
  
  for (const drill of drills) {
    const categories = drill.categories || [];
    const isNonHitting = categories.every(cat => REMOVE_CATEGORIES.has(cat));
    
    if (isNonHitting && categories.length > 0) {
      nonHittingDrills.push(drill);
    } else {
      hittingDrills.push(drill);
    }
  }
  
  console.log(`Hitting drills to KEEP: ${hittingDrills.length}`);
  console.log(`Non-hitting drills to ARCHIVE: ${nonHittingDrills.length}`);
  
  // Connect to database
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set!');
    process.exit(1);
  }
  
  const connection = await mysql.createConnection(dbUrl);
  
  try {
    // Archive non-hitting drills to database
    console.log('\nArchiving non-hitting drills to database...');
    
    for (const drill of nonHittingDrills) {
      await connection.execute(
        `INSERT INTO archivedDrills (originalDrillId, name, difficulty, categories, duration, url, isDirectLink, fullData, archiveReason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [
          String(drill.id),
          drill.name,
          drill.difficulty,
          JSON.stringify(drill.categories),
          drill.duration || 'Unknown',
          drill.url || null,
          drill.is_direct_link ? 1 : 0,
          JSON.stringify(drill),
          'non-hitting-category-removal'
        ]
      );
    }
    
    console.log(`✓ Archived ${nonHittingDrills.length} drills to archivedDrills table`);
    
    // Also archive any non-hitting custom drills
    const [customDrills] = await connection.execute(
      `SELECT * FROM customDrills WHERE category IN ('Bunting', 'Pitching', 'Infield', 'Outfield', 'Catching', 'Base Running')`
    );
    
    if (customDrills.length > 0) {
      console.log(`\nFound ${customDrills.length} non-hitting custom drills to archive...`);
      for (const cd of customDrills) {
        await connection.execute(
          `INSERT INTO archivedDrills (originalDrillId, name, difficulty, categories, duration, fullData, archiveReason)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name)`,
          [
            cd.drillId || 'custom-' + cd.id, // custom drills use their drillId
            cd.name,
            cd.difficulty,
            JSON.stringify([cd.category]),
            cd.duration,
            JSON.stringify(cd),
            'non-hitting-custom-drill-removal'
          ]
        );
      }
      
      // Soft-archive: mark them but don't delete from customDrills table
      // We'll filter them out in the frontend query instead
      console.log(`✓ Archived ${customDrills.length} custom drills`);
    }
    
    // Write filtered drills.json
    console.log('\nWriting filtered drills.json...');
    fs.writeFileSync(drillsPath, JSON.stringify(hittingDrills, null, 2) + '\n');
    console.log(`✓ drills.json updated: ${hittingDrills.length} hitting drills`);
    
    // Verify
    const verification = JSON.parse(fs.readFileSync(drillsPath, 'utf-8'));
    console.log(`\nVerification: drills.json now has ${verification.length} drills`);
    
    // Check all remaining drills are Hitting
    const allHitting = verification.every(d => d.categories.includes('Hitting'));
    console.log(`All remaining drills are Hitting: ${allHitting}`);
    
    // Print summary
    console.log('\n=== SUMMARY ===');
    console.log(`Before: ${drills.length} drills`);
    console.log(`After: ${hittingDrills.length} drills (Hitting only)`);
    console.log(`Archived: ${nonHittingDrills.length} non-hitting drills`);
    console.log(`Custom drills archived: ${customDrills.length}`);
    console.log('\nRemoved categories:');
    const removedCats = {};
    for (const d of nonHittingDrills) {
      for (const c of d.categories) {
        removedCats[c] = (removedCats[c] || 0) + 1;
      }
    }
    for (const [cat, count] of Object.entries(removedCats).sort()) {
      console.log(`  ${cat}: ${count} drills`);
    }
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
