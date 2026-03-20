import { drillCustomizations, DrillCustomization, InsertDrillCustomization } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "./db";

// Get customization for a specific drill
export async function getDrillCustomization(drillId: string): Promise<DrillCustomization | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(drillCustomizations)
    .where(eq(drillCustomizations.drillId, drillId))
    .limit(1);

  return result[0] || null;
}

// Get all drill customizations
export async function getAllDrillCustomizations(): Promise<DrillCustomization[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(drillCustomizations);
}

// Create or update drill customization
export async function upsertDrillCustomization(
  drillId: string,
  data: {
    thumbnailUrl?: string | null;
    imageBase64?: string | null;
    imageMimeType?: string | null;
    briefDescription?: string | null;
    difficulty?: string | null;
    category?: string | null;
  },
  updatedBy: number
): Promise<DrillCustomization | null> {
  console.log('[DrillCustomizations] upsertDrillCustomization called for drillId:', drillId);
  console.log('[DrillCustomizations] Data keys:', Object.keys(data));
  console.log('[DrillCustomizations] updatedBy:', updatedBy);
  
  const db = await getDb();
  if (!db) {
    console.error('[DrillCustomizations] Database not available!');
    return null;
  }
  console.log('[DrillCustomizations] Database connection obtained');

  // Check if customization exists
  const existing = await getDrillCustomization(drillId);
  console.log('[DrillCustomizations] Existing record:', existing ? 'FOUND' : 'NOT FOUND');
  if (existing) {
    console.log('[DrillCustomizations] Existing record id:', existing.id);
    // Update existing
    console.log('[DrillCustomizations] Updating existing record');
    try {
      await db
        .update(drillCustomizations)
        .set({
          thumbnailUrl: data.thumbnailUrl ?? existing.thumbnailUrl,
          imageBase64: data.imageBase64 ?? existing.imageBase64,
          imageMimeType: data.imageMimeType ?? existing.imageMimeType,
          briefDescription: data.briefDescription ?? existing.briefDescription,
          difficulty: data.difficulty ?? existing.difficulty,
          category: data.category ?? existing.category,
          updatedBy,
        })
        .where(eq(drillCustomizations.drillId, drillId));
      console.log('[DrillCustomizations] Update successful');
    } catch (error) {
      console.error('[DrillCustomizations] Update failed:', error);
      throw error;
    }
  } else {
    // Insert new
    console.log('[DrillCustomizations] Inserting new record');
    try {
      await db.insert(drillCustomizations).values({
        drillId,
        thumbnailUrl: data.thumbnailUrl || null,
        imageBase64: data.imageBase64 || null,
        imageMimeType: data.imageMimeType || null,
        briefDescription: data.briefDescription || null,
        difficulty: data.difficulty || null,
        category: data.category || null,
        updatedBy,
      });
      console.log('[DrillCustomizations] Insert successful');
    } catch (error) {
      console.error('[DrillCustomizations] Insert failed:', error);
      throw error;
    }
  }

  return await getDrillCustomization(drillId);
}

// Delete drill customization
export async function deleteDrillCustomization(drillId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(drillCustomizations)
    .where(eq(drillCustomizations.drillId, drillId));

  return true;
}
