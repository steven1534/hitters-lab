import { getDb } from "./db";
import { drillPageLayouts } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export async function saveDrillPageLayout(drillId: string, blocks: any[], createdBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(drillPageLayouts).where(eq(drillPageLayouts.drillId, drillId)).limit(1);
  
  if (existing.length > 0) {
    // Update existing layout
    await db.update(drillPageLayouts)
      .set({ blocks, updatedAt: new Date() })
      .where(eq(drillPageLayouts.drillId, drillId));
    return { success: true, updated: true };
  } else {
    // Insert new layout
    await db.insert(drillPageLayouts).values({
      drillId,
      blocks,
      createdBy,
    });
    return { success: true, updated: false };
  }
}

export async function getDrillPageLayout(drillId: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(drillPageLayouts).where(eq(drillPageLayouts.drillId, drillId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function deleteDrillPageLayout(drillId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(drillPageLayouts).where(eq(drillPageLayouts.drillId, drillId));
  return { success: true };
}
