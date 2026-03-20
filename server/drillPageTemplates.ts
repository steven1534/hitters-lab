import { getDb } from "./db";
import { drillPageTemplates } from "../drizzle/schema";
import { eq, or } from "drizzle-orm";

export async function createTemplate(data: {
  name: string;
  description?: string;
  blocks: any[];
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const [template] = await db.insert(drillPageTemplates).values(data);
  return template;
}

export async function getTemplates(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  // Return both user-created templates and system (built-in) templates
  const templates = await db
    .select()
    .from(drillPageTemplates)
    .where(
      or(
        eq(drillPageTemplates.createdBy, userId),
        eq(drillPageTemplates.isSystem, 1)
      )
    );
  return templates;
}

export async function getTemplateById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const [template] = await db
    .select()
    .from(drillPageTemplates)
    .where(eq(drillPageTemplates.id, id));
  return template || null;
}

export async function deleteTemplate(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  await db
    .delete(drillPageTemplates)
    .where(eq(drillPageTemplates.id, id));
  return true;
}
