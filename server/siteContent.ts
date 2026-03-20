import { drizzle } from "drizzle-orm/mysql2";
import { siteContent } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "./db";

/**
 * Get all site content overrides (bulk fetch for client-side cache).
 */
export async function getAllSiteContent(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select({ contentKey: siteContent.contentKey, value: siteContent.value }).from(siteContent);
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.contentKey] = row.value;
  }
  return map;
}

/**
 * Get a batch of site content values by keys.
 */
export async function getSiteContentByKeys(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select({ contentKey: siteContent.contentKey, value: siteContent.value })
    .from(siteContent)
    .where(inArray(siteContent.contentKey, keys));
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.contentKey] = row.value;
  }
  return map;
}

/**
 * Upsert a single site content value.
 */
export async function upsertSiteContent(contentKey: string, value: string, updatedBy: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(siteContent).values({ contentKey, value, updatedBy })
    .onDuplicateKeyUpdate({ set: { value, updatedBy } });
}

/**
 * Delete a single site content override (reset to default).
 */
export async function deleteSiteContent(contentKey: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(siteContent).where(eq(siteContent.contentKey, contentKey));
}

/**
 * Bulk upsert multiple site content values.
 */
export async function bulkUpsertSiteContent(entries: { contentKey: string; value: string }[], updatedBy: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  for (const entry of entries) {
    await db.insert(siteContent).values({ contentKey: entry.contentKey, value: entry.value, updatedBy })
      .onDuplicateKeyUpdate({ set: { value: entry.value, updatedBy } });
  }
}
