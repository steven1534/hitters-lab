import { drillCatalogOverrides, type DrillCatalogOverride } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "./db";

function trimOrNull(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t === "" ? null : t;
}

function isRowUnused(row: Record<string, unknown>): boolean {
  return (
    !row.name &&
    !row.difficulty &&
    (row.categories == null || (row.categories as string[]).length === 0) &&
    !row.duration &&
    (row.tags == null || (row.tags as string[]).length === 0) &&
    !row.externalUrl &&
    (row.hiddenFromDirectory as number) === 0 &&
    !row.purpose && !row.bestFor && !row.equipment &&
    !row.coachCue && !row.watchFor &&
    (row.whatThisFixes == null || (row.whatThisFixes as string[]).length === 0) &&
    (row.whatToFeel == null || (row.whatToFeel as string[]).length === 0) &&
    (row.commonMistakes == null || (row.commonMistakes as string[]).length === 0)
  );
}

export async function getAllCatalogOverrides(): Promise<DrillCatalogOverride[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(drillCatalogOverrides);
}

export async function getCatalogOverride(drillId: string): Promise<DrillCatalogOverride | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(drillCatalogOverrides)
    .where(eq(drillCatalogOverrides.drillId, drillId))
    .limit(1);
  return rows[0] ?? null;
}

export type CatalogOverrideSaveInput = {
  name: string | null;
  difficulty: string | null;
  categories: string[] | null;
  duration: string | null;
  tags: string[] | null;
  externalUrl: string | null;
  hiddenFromDirectory: number;
  purpose?: string | null;
  bestFor?: string | null;
  equipment?: string | null;
  coachCue?: string | null;
  watchFor?: string | null;
  whatThisFixes?: string[] | null;
  whatToFeel?: string[] | null;
  commonMistakes?: string[] | null;
};

export async function upsertCatalogOverride(
  drillId: string,
  data: CatalogOverrideSaveInput,
  userId: number
): Promise<DrillCatalogOverride | null> {
  const db = await getDb();
  if (!db) return null;

  const row = {
    name: trimOrNull(data.name),
    difficulty: trimOrNull(data.difficulty),
    categories:
      data.categories != null && data.categories.length > 0 ? data.categories : null,
    duration: trimOrNull(data.duration),
    tags: data.tags != null && data.tags.length > 0 ? data.tags : null,
    externalUrl: trimOrNull(data.externalUrl),
    hiddenFromDirectory: data.hiddenFromDirectory ? 1 : 0,
    purpose: trimOrNull(data.purpose),
    bestFor: trimOrNull(data.bestFor),
    equipment: trimOrNull(data.equipment),
    coachCue: trimOrNull(data.coachCue),
    watchFor: trimOrNull(data.watchFor),
    whatThisFixes: data.whatThisFixes?.length ? data.whatThisFixes : null,
    whatToFeel: data.whatToFeel?.length ? data.whatToFeel : null,
    commonMistakes: data.commonMistakes?.length ? data.commonMistakes : null,
  };

  if (isRowUnused(row)) {
    await db.delete(drillCatalogOverrides).where(eq(drillCatalogOverrides.drillId, drillId));
    return null;
  }

  const existing = await getCatalogOverride(drillId);
  const now = new Date();

  if (existing) {
    await db
      .update(drillCatalogOverrides)
      .set({
        ...row,
        updatedBy: userId,
        updatedAt: now,
      })
      .where(eq(drillCatalogOverrides.drillId, drillId));
  } else {
    await db.insert(drillCatalogOverrides).values({
      drillId,
      ...row,
      updatedBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  }

  return getCatalogOverride(drillId);
}

export async function deleteCatalogOverride(drillId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.delete(drillCatalogOverrides).where(eq(drillCatalogOverrides.drillId, drillId));
  return true;
}
