import { getDb } from "./db";
import { projectTemplates, type InsertProjectTemplate, type ProjectTemplate } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Template configuration interface
 */
export interface TemplateConfig {
  // Project fields
  description?: string;
  location?: string;
  clientName?: string;
  status?: "active" | "completed" | "archived";
  dronePilot?: string;
  faaLicenseNumber?: string;
  laancAuthNumber?: string;
  logoUrl?: string;
  logoKey?: string;
  
  // Warranty settings
  warrantyPeriodMonths?: number;
  warrantyReminderIntervals?: number[]; // e.g., [3, 6, 9]
  
  // Media settings
  requireGps?: boolean;
  applyWatermark?: boolean;
  
  // Export settings
  defaultExportFormats?: string[]; // e.g., ["kml", "geojson", "csv"]
  
  // Report settings
  includeProjectLogo?: boolean;
  includeClientLogo?: boolean;
  reportSections?: string[];
  
  // Custom fields
  customFields?: Record<string, any>;
}

/**
 * Get all templates for a user (including system templates)
 */
export async function getTemplates(userId: number): Promise<ProjectTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(projectTemplates)
    .where(
      eq(projectTemplates.userId, userId)
    )
    .orderBy(desc(projectTemplates.lastUsedAt), desc(projectTemplates.createdAt));
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(templateId: number, userId: number): Promise<ProjectTemplate | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [template] = await db
    .select()
    .from(projectTemplates)
    .where(
      and(
        eq(projectTemplates.id, templateId),
        eq(projectTemplates.userId, userId)
      )
    )
    .limit(1);
  
  return template || null;
}

/**
 * Create a new template
 */
export async function createTemplate(data: {
  userId: number;
  name: string;
  description?: string;
  category?: string;
  config: TemplateConfig;
  isSystem?: boolean;
}): Promise<ProjectTemplate> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [template] = await db
    .insert(projectTemplates)
    .values({
      userId: data.userId,
      name: data.name,
      description: data.description,
      category: data.category,
      config: JSON.stringify(data.config),
      isSystem: data.isSystem ? "yes" : "no",
      useCount: 0,
    })
    .$returningId();
  
  const created = await getTemplateById(template.id, data.userId);
  if (!created) throw new Error("Failed to create template");
  return created;
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  templateId: number,
  userId: number,
  updates: {
    name?: string;
    description?: string;
    category?: string;
    config?: TemplateConfig;
  }
): Promise<ProjectTemplate> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = {};
  
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.config !== undefined) updateData.config = JSON.stringify(updates.config);
  
  await db
    .update(projectTemplates)
    .set(updateData)
    .where(
      and(
        eq(projectTemplates.id, templateId),
        eq(projectTemplates.userId, userId)
      )
    );
  
  const updated = await getTemplateById(templateId, userId);
  if (!updated) throw new Error("Template not found");
  return updated;
}

/**
 * Delete a template
 */
export async function deleteTemplate(templateId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .delete(projectTemplates)
    .where(
      and(
        eq(projectTemplates.id, templateId),
        eq(projectTemplates.userId, userId)
      )
    );
}

/**
 * Increment template use count and update last used timestamp
 */
export async function incrementTemplateUse(templateId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const template = await getTemplateById(templateId, userId);
  if (!template) return;
  
  await db
    .update(projectTemplates)
    .set({
      useCount: (template.useCount || 0) + 1,
      lastUsedAt: new Date(),
    })
    .where(eq(projectTemplates.id, templateId));
}

/**
 * Parse template config from JSON string
 */
export function parseTemplateConfig(configJson: string): TemplateConfig {
  try {
    return JSON.parse(configJson);
  } catch {
    return {};
  }
}
