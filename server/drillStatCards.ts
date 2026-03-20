import { getDb } from "./db";
import { drillStatCards } from "../drizzle/schema";
import { eq, asc } from "drizzle-orm";

export async function getStatCards(drillId: string) {
  const database = await getDb();
  if (!database) return [];
  return database
    .select()
    .from(drillStatCards)
    .where(eq(drillStatCards.drillId, drillId))
    .orderBy(asc(drillStatCards.position));
}

export async function upsertStatCards(
  drillId: string,
  cards: Array<{ id?: number; label: string; value: string; icon?: string; position: number; isVisible: number }>
) {
  const database = await getDb();
  if (!database) return [];
  // Delete existing cards for this drill and re-insert
  await database.delete(drillStatCards).where(eq(drillStatCards.drillId, drillId));
  if (cards.length === 0) return [];
  await database.insert(drillStatCards).values(
    cards.map((c, i) => ({
      drillId,
      label: c.label,
      value: c.value,
      icon: c.icon ?? "info",
      position: c.position ?? i,
      isVisible: c.isVisible ?? 1,
    }))
  );
  return getStatCards(drillId);
}
