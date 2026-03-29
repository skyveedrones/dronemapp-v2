import { and, desc, eq, gte, inArray, isNull, isNotNull, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { Pool } from "mysql2/promise";
import mysql from "mysql2/promise";
import { auditLog, clients, clientInvitations, clientProjectAssignments, clientUsers, flights, InsertFlight, InsertMedia, InsertProject, InsertProjectCollaborator, InsertProjectInvitation, InsertUser, InsertWarrantyReminder, media, projectCollaborators, projectInvitations, projects, users, warrantyReminders, type InsertClient, type InsertClientUser, type InsertClientInvitation, type InsertClientProjectAssignment } from "../drizzle/schema";
import { ENV } from './_core/env';
import { sendWelcomeEmail } from './_core/email';
import { notifyOwner } from './_core/notification';
import { sendOwnerNotificationEmail } from './owner-notification-email';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

// Create connection pool with explicit SSL for TiDB
async function createPool() {
  if (_pool) return _pool;
  
  if (!process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL not set");
    return null;
  }

  try {
    // Parse DATABASE_URL to extract connection parameters
    const url = new URL(process.env.DATABASE_URL);
    
    // Create pool with explicit SSL configuration for TiDB
    _pool = mysql.createPool({
      host: url.hostname,
      port: url.port ? parseInt(url.port) : 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1),
      ssl: { rejectUnauthorized: true }, // TiDB requires SSL
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
      decimalNumbers: true,
    });
    
    console.log("[Database] Connection pool created with SSL enabled for TiDB");
    return _pool;
  } catch (error) {
    console.error("[Database] Failed to create pool:", error);
    return null;
  }
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = await createPool();
      if (pool) {
        _db = drizzle(pool as any);
        console.log("[Database] Drizzle initialized with SSL-enabled pool");
      } else {
        console.warn("[Database] Failed to create pool, attempting direct connection");
        _db = drizzle(process.env.DATABASE_URL);
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // Check if this is a new user (for welcome email)
    const existingUser = await getUserByOpenId(user.openId);
    const isNewUser = !existingUser;

    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "organization"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (!existingUser && user.openId === ENV.ownerOpenId) {
      // Only set admin role for the owner on FIRST signup, not on subsequent logins
      values.role = 'admin';
      // Don't add to updateSet — preserve whatever role is already in the DB
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });

    // Send welcome email to new users
    if (isNewUser && user.email && user.name) {
      console.log('[User] New user detected, sending welcome email to:', user.email);
      sendWelcomeEmail(user.email, user.name).catch(error => {
        console.error('[User] Failed to send welcome email:', error);
        // Don't throw - email failure shouldn't block user creation
      });

      // Notify owner about new user signup via email
      console.log('[User] Notifying owner about new user signup:', user.email);
      sendOwnerNotificationEmail({
        userName: user.name,
        userEmail: user.email,
        loginMethod: user.loginMethod || 'OAuth',
        organization: user.organization || 'Not specified',
      }).catch(error => {
        console.error('[User] Failed to send owner notification email:', error);
        // Don't throw - notification failure shouldn't block user creation
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================
// Project CRUD Operations
// ============================================

/**
 * Create a new project for a user
 */
export async function createProject(project: InsertProject) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(projects).values(project);
  const insertId = result[0].insertId;
  
  // Return the created project
  const created = await db.select().from(projects).where(eq(projects.id, insertId)).limit(1);
  return created[0];
}

/**
 * Get all projects for a specific user
 */
export async function getUserProjects(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.updatedAt));
}

/**
 * Get a single project by ID
 */
export async function getProjectById(projectId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get a project by ID, ensuring it belongs to the specified user
 */
export async function getUserProject(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId), isNull(projects.deletedAt)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: number,
  userId: number,
  updates: Partial<Omit<InsertProject, "id" | "userId" | "createdAt">>
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // First verify the project belongs to the user
  const existing = await getUserProject(projectId, userId);
  if (!existing) {
    return null;
  }

  await db
    .update(projects)
    .set(updates)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  // Return the updated project
  return getUserProject(projectId, userId);
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // First verify the project belongs to the user
  const existing = await getUserProject(projectId, userId);
  if (!existing) {
    return false;
  }

  // Delete all media associated with the project first
  await db
    .delete(media)
    .where(and(eq(media.projectId, projectId), eq(media.userId, userId)));

  await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  return true;
}

/**
 * Get project count for a user (owned + shared + client projects)
 */
export async function getUserProjectCount(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get owned projects count
  const ownedProjects = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)));

  // Get shared projects count (where user is a collaborator)
  const sharedProjects = await db
    .select({ projectId: projectCollaborators.projectId })
    .from(projectCollaborators)
    .where(eq(projectCollaborators.userId, userId));

  // Get client projects count
  const clientProjects = await getUserClientProjects(userId);

  // Combine and deduplicate
  const allProjectIds = new Set([
    ...ownedProjects.map(p => p.id),
    ...sharedProjects.map(p => p.projectId),
    ...clientProjects.map(p => p.id),
  ]);

  return allProjectIds.size;
}

/**
 * Increment project media count
 */
export async function incrementProjectMediaCount(projectId: number, increment: number = 1) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(projects)
    .set({ mediaCount: sql`${projects.mediaCount} + ${increment}` })
    .where(eq(projects.id, projectId));
}

/**
 * Decrement project media count
 */
export async function decrementProjectMediaCount(projectId: number, decrement: number = 1) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(projects)
    .set({ mediaCount: sql`GREATEST(${projects.mediaCount} - ${decrement}, 0)` })
    .where(eq(projects.id, projectId));
}

// ============================================
// Media CRUD Operations
// ============================================

/**
 * Create a new media record
 */
export async function createMedia(mediaItem: InsertMedia) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(media).values(mediaItem);
  const insertId = result[0].insertId;
  
  // Increment the project's media count
  await incrementProjectMediaCount(mediaItem.projectId);
  
  // Return the created media
  const created = await db.select().from(media).where(eq(media.id, insertId)).limit(1);
  return created[0];
}

/**
 * Get all media for a specific project
 */
export async function getProjectMedia(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(media)
    .where(and(eq(media.projectId, projectId), eq(media.userId, userId), isNull(media.deletedAt)))
    .orderBy(desc(media.createdAt));
}
/**
 * Get a single media item by ID
 */
export async function getMediaById(mediaId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db
    .select()
    .from(media)
    .where(and(eq(media.id, mediaId), isNull(media.deletedAt)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Delete a media item
 */
export async function deleteMedia(mediaId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // First get the media to find its project
  const existing = await getMediaById(mediaId, userId);
  if (!existing) {
    return null;
  }

  await db
    .delete(media)
    .where(eq(media.id, mediaId));

  // Decrement the project's media count
  await decrementProjectMediaCount(existing.projectId);

  return existing;
}

/**
 * Update GPS coordinates for a media item
 */
export async function updateMediaGPS(
  mediaId: number,
  gpsData: {
    latitude: string | null;
    longitude: string | null;
    altitude: string | null;
  }
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(media)
    .set({
      latitude: gpsData.latitude,
      longitude: gpsData.longitude,
      altitude: gpsData.altitude,
      updatedAt: new Date(),
    })
    .where(eq(media.id, mediaId));

  // Return the updated media item
  const [updated] = await db
    .select()
    .from(media)
    .where(eq(media.id, mediaId));

  return updated;
}

/**
 * Update media URLs (for watermarking - replaces original with watermarked version)
 */
export async function updateMediaUrls(
  mediaId: number,
  urls: {
    url: string;
    fileKey: string;
    thumbnailUrl?: string | null;
  }
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const updateData: Record<string, unknown> = {
    url: urls.url,
    fileKey: urls.fileKey,
    updatedAt: new Date(),
  };

  if (urls.thumbnailUrl !== undefined) {
    updateData.thumbnailUrl = urls.thumbnailUrl;
  }

  await db
    .update(media)
    .set(updateData)
    .where(eq(media.id, mediaId));

  // Return the updated media item
  const [updated] = await db
    .select()
    .from(media)
    .where(eq(media.id, mediaId));

  return updated;
}

/**
 * Delete all media for a project
 */
export async function deleteProjectMedia(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const deleted = await db
    .delete(media)
    .where(and(eq(media.projectId, projectId), eq(media.userId, userId)));

  return deleted;
}

/**
 * Get media count for a project
 */
export async function getProjectMediaCount(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(media)
    .where(and(eq(media.projectId, projectId), eq(media.userId, userId), isNull(media.deletedAt)));
  return result.length;
}
// ============================================
// Project Collaborators & Invitationsns
// ============================================

/**
 * Check if a user has access to a project (owner or collaborator)
 */
export async function userHasProjectAccess(projectId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

   // Check if user is the owner
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId), isNull(projects.deletedAt)))
    .limit(1);
  if (project.length > 0) {
    return true;
  }
  // Check if user is a collaboratorr
  const collaborator = await db
    .select()
    .from(projectCollaborators)
    .where(and(eq(projectCollaborators.projectId, projectId), eq(projectCollaborators.userId, userId)))
    .limit(1);

  return collaborator.length > 0;
}

/**
 * Get a project with access check (owner or collaborator)
 */
export async function getProjectWithAccess(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

   const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);
  if (project.length === 0) {
    return null;
  }
  // Check if user is ownerr
  if (project[0].userId === userId) {
    return { ...project[0], accessRole: 'owner' as const };
  }

  // Check if user is collaborator
  const collaborator = await db
    .select()
    .from(projectCollaborators)
    .where(and(eq(projectCollaborators.projectId, projectId), eq(projectCollaborators.userId, userId)))
    .limit(1);

  if (collaborator.length > 0) {
    return { ...project[0], accessRole: collaborator[0].role };
  }

  return null;
}

/**
 * Get all projects a user has access to (owned + shared)
 */
export async function getUserAccessibleProjects(userId: number): Promise<{
  owned: typeof projects.$inferSelect[];
  shared: (typeof projects.$inferSelect & { sharedRole: 'viewer' | 'editor' | 'vendor' })[];
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get owned projects
  const ownedProjects = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.updatedAt));

  // Get shared projects
  const sharedProjectIds = await db
    .select({ projectId: projectCollaborators.projectId, role: projectCollaborators.role })
    .from(projectCollaborators)
    .where(eq(projectCollaborators.userId, userId));

  const sharedProjects = [];
  for (const collab of sharedProjectIds) {
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, collab.projectId), isNull(projects.deletedAt)))
      .limit(1);
    if (project.length > 0) {
      sharedProjects.push({ ...project[0], sharedRole: collab.role });
    }
  }

  return {
    owned: ownedProjects,
    shared: sharedProjects,
  };
}

/**
 * Add a collaborator to a project
 */
export async function addProjectCollaborator(collaborator: InsertProjectCollaborator) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Check if collaborator already exists
  const existing = await db
    .select()
    .from(projectCollaborators)
    .where(and(
      eq(projectCollaborators.projectId, collaborator.projectId),
      eq(projectCollaborators.userId, collaborator.userId)
    ))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const result = await db.insert(projectCollaborators).values(collaborator);
  const insertId = result[0].insertId;

  const created = await db
    .select()
    .from(projectCollaborators)
    .where(eq(projectCollaborators.id, insertId))
    .limit(1);

  return created[0];
}

/**
 * Remove a collaborator from a project
 */
export async function removeProjectCollaborator(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await db
    .select()
    .from(projectCollaborators)
    .where(and(
      eq(projectCollaborators.projectId, projectId),
      eq(projectCollaborators.userId, userId)
    ))
    .limit(1);

  if (existing.length === 0) {
    return null;
  }

  await db
    .delete(projectCollaborators)
    .where(and(
      eq(projectCollaborators.projectId, projectId),
      eq(projectCollaborators.userId, userId)
    ));

  return existing[0];
}

/**
 * Get all collaborators for a project
 */
export async function getProjectCollaborators(projectId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const collaborators = await db
    .select({
      id: projectCollaborators.id,
      projectId: projectCollaborators.projectId,
      userId: projectCollaborators.userId,
      role: projectCollaborators.role,
      createdAt: projectCollaborators.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(projectCollaborators)
    .innerJoin(users, eq(projectCollaborators.userId, users.id))
    .where(eq(projectCollaborators.projectId, projectId));

  return collaborators;
}

/**
 * Create a project invitation
 */
export async function createProjectInvitation(invitation: InsertProjectInvitation) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Check if there's already a pending invitation for this email
  const existing = await db
    .select()
    .from(projectInvitations)
    .where(and(
      eq(projectInvitations.projectId, invitation.projectId),
      eq(projectInvitations.email, invitation.email),
      eq(projectInvitations.status, 'pending')
    ))
    .limit(1);

  if (existing.length > 0) {
    return { invitation: existing[0], isNew: false };
  }

  const result = await db.insert(projectInvitations).values(invitation);
  const insertId = result[0].insertId;

  const created = await db
    .select()
    .from(projectInvitations)
    .where(eq(projectInvitations.id, insertId))
    .limit(1);

  return { invitation: created[0], isNew: true };
}

/**
 * Get a project invitation by token
 */
export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(projectInvitations)
    .where(eq(projectInvitations.token, token))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Accept a project invitation
 */
export async function acceptProjectInvitation(token: string, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get the invitation
  const invitation = await getInvitationByToken(token);
  if (!invitation) {
    return { success: false, error: 'Invitation not found' };
  }

  if (invitation.status !== 'pending') {
    return { success: false, error: `Invitation has already been ${invitation.status}` };
  }

  if (new Date() > invitation.expiresAt) {
    // Update status to expired
    await db
      .update(projectInvitations)
      .set({ status: 'expired' })
      .where(eq(projectInvitations.id, invitation.id));
    return { success: false, error: 'Invitation has expired' };
  }

  // Add user as collaborator
  await addProjectCollaborator({
    projectId: invitation.projectId,
    userId: userId,
    role: invitation.role,
  });

  // Update invitation status
  await db
    .update(projectInvitations)
    .set({ status: 'accepted', acceptedAt: new Date() })
    .where(eq(projectInvitations.id, invitation.id));

  return { success: true, invitation };
}

/**
 * Revoke a project invitation
 */
export async function revokeProjectInvitation(invitationId: number, projectOwnerId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get the invitation and verify ownership
  const invitation = await db
    .select()
    .from(projectInvitations)
    .where(eq(projectInvitations.id, invitationId))
    .limit(1);

  if (invitation.length === 0) {
    return { success: false, error: 'Invitation not found' };
  }

  // Verify the project belongs to the user
  const project = await getUserProject(invitation[0].projectId, projectOwnerId);
  if (!project) {
    return { success: false, error: 'Not authorized to revoke this invitation' };
  }

  if (invitation[0].status !== 'pending') {
    return { success: false, error: 'Can only revoke pending invitations' };
  }

  await db
    .update(projectInvitations)
    .set({ status: 'revoked' })
    .where(eq(projectInvitations.id, invitationId));

  return { success: true };
}

/**
 * Get all invitations for a project
 */
export async function getProjectInvitations(projectId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(projectInvitations)
    .where(eq(projectInvitations.projectId, projectId))
    .orderBy(desc(projectInvitations.createdAt));
}

/**
 * Get pending invitations for an email address
 */
export async function getPendingInvitationsForEmail(email: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const now = new Date();
  const invitations = await db
    .select()
    .from(projectInvitations)
    .where(and(
      eq(projectInvitations.email, email),
      eq(projectInvitations.status, 'pending')
    ));

  // Filter out expired ones
  return invitations.filter(inv => inv.expiresAt > now);
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get project media with access check (for collaborators and client users)
 */
export async function getProjectMediaWithAccess(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // First verify user has access to the project (owner/collaborator OR client user)
  const hasAccess = await userHasProjectAccess(projectId, userId);
  const hasClientAccess = await userHasClientProjectAccess(userId, projectId);
  
  if (!hasAccess && !hasClientAccess) {
    return null;
  }

   return db
    .select()
    .from(media)
    .where(and(eq(media.projectId, projectId), isNull(media.deletedAt)))
    .orderBy(desc(media.createdAt));
}
// ============================================
// Flights
// ============================================

/**
 * Create a new flight within a project
 */
export async function createFlight(flight: InsertFlight) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(flights).values(flight);
  const insertId = result[0].insertId;

  const created = await db
    .select()
    .from(flights)
    .where(eq(flights.id, insertId))
    .limit(1);

  return created[0];
}

/**
 * Get all flights for a project
 */
export async function getProjectFlights(projectId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(flights)
    .where(and(eq(flights.projectId, projectId), isNull(flights.deletedAt)))
    .orderBy(desc(flights.flightDate), desc(flights.createdAt));
}

/**
 * Get a single flight by ID
 */
export async function getFlightById(flightId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(flights)
    .where(and(eq(flights.id, flightId), isNull(flights.deletedAt)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get a flight by ID, ensuring it belongs to the specified user
 */
export async function getUserFlight(flightId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(flights)
    .where(and(eq(flights.id, flightId), eq(flights.userId, userId), isNull(flights.deletedAt)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Update a flight
 */
export async function updateFlight(
  flightId: number,
  userId: number,
  updates: Partial<Omit<InsertFlight, "id" | "userId" | "projectId" | "createdAt">>
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // First verify the flight belongs to the user
  const existing = await getUserFlight(flightId, userId);
  if (!existing) {
    return null;
  }

  await db
    .update(flights)
    .set(updates)
    .where(and(eq(flights.id, flightId), eq(flights.userId, userId)));

  return getUserFlight(flightId, userId);
}

/**
 * Delete a flight and all its media
 */
export async function deleteFlight(flightId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // First verify the flight belongs to the user
  const existing = await getUserFlight(flightId, userId);
  if (!existing) {
    return null;
  }

  // Delete all media associated with this flight
  await db
    .delete(media)
    .where(eq(media.flightId, flightId));

  // Delete the flight
  await db
    .delete(flights)
    .where(and(eq(flights.id, flightId), eq(flights.userId, userId)));

  return existing;
}

/**
 * Get media for a specific flight
 */
export async function getFlightMedia(flightId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(media)
      .where(and(eq(media.flightId, flightId), isNull(media.deletedAt)))
    .orderBy(desc(media.capturedAt), desc(media.createdAt));
}
/**
 * Get media count for a flight
 */
export async function getFlightMediaCount(flightId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db
    .select()
    .from(media)
    .where(and(eq(media.flightId, flightId), isNull(media.deletedAt)));

  return result.length;
}

/**
 * Update flight media count
 */
export async function updateFlightMediaCount(flightId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const count = await getFlightMediaCount(flightId);
  
  await db
    .update(flights)
    .set({ mediaCount: count })
    .where(eq(flights.id, flightId));

  return count;
}

/**
 * Check if user has access to a flight (owner or project collaborator)
 */
export async function userHasFlightAccess(flightId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get the flight
  const flight = await getFlightById(flightId);
  if (!flight) {
    return false;
  }

  // Check if user is the owner of the flight
  if (flight.userId === userId) {
    return true;
  }

  // Check if user has access to the parent project
  return userHasProjectAccess(flight.projectId, userId);
}

/**
 * Get project media that is not assigned to any flight
 */
export async function getProjectUnassignedMedia(projectId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(media)
    .where(and(
      eq(media.projectId, projectId),
      sql`${media.flightId} IS NULL`,
      isNull(media.deletedAt)
    ))
    .orderBy(desc(media.capturedAt), desc(media.createdAt));
}

/**
 * Assign media to a flight
 */
export async function assignMediaToFlight(mediaId: number, flightId: number | null) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(media)
    .set({ flightId: flightId })
    .where(eq(media.id, mediaId));

  // If assigning to a flight, update the flight's media count
  if (flightId) {
    await updateFlightMediaCount(flightId);
  }

  const [updated] = await db
    .select()
    .from(media)
    .where(eq(media.id, mediaId));

  return updated;
}


// ==================== Project Logo Functions ====================

export async function updateProjectLogo(
  projectId: number,
  userId: number,
  logoUrl: string,
  logoKey: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Verify user owns the project
  const project = await getUserProject(projectId, userId);
  if (!project) {
    throw new Error("Project not found or access denied");
  }

  await db
    .update(projects)
    .set({ logoUrl, logoKey })
    .where(eq(projects.id, projectId));

  return getUserProject(projectId, userId);
}

export async function deleteProjectLogo(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Verify user owns the project
  const project = await getUserProject(projectId, userId);
  if (!project) {
    throw new Error("Project not found or access denied");
  }

  const logoKey = project.logoKey;

  await db
    .update(projects)
    .set({ logoUrl: null, logoKey: null })
    .where(eq(projects.id, projectId));

  return logoKey || null;
}

export async function getProjectLogo(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    return null;
  }

  // Get project with access check
  const project = await getProjectWithAccess(projectId, userId);
  if (!project) {
    return null;
  }

  return {
    logoUrl: project.logoUrl,
    logoKey: project.logoKey,
  };
}

// ==================== User Logo Functions ====================

export async function updateUserLogo(
  userId: number,
  logoUrl: string,
  logoKey: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({ logoUrl, logoKey })
    .where(eq(users.id, userId));

  const [updated] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  return updated;
}

export async function deleteUserLogo(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get current logo key before deleting
  const [user] = await db
    .select({ logoKey: users.logoKey })
    .from(users)
    .where(eq(users.id, userId));

  await db
    .update(users)
    .set({ logoUrl: null, logoKey: null })
    .where(eq(users.id, userId));

  return user?.logoKey || null;
}

export async function getUserLogo(userId: number) {
  const db = await getDb();
  if (!db) {
    return null;
  }

  const [user] = await db
    .select({ logoUrl: users.logoUrl, logoKey: users.logoKey })
    .from(users)
    .where(eq(users.id, userId));

  return user || null;
}

// ==================== User Watermark Functions ====================

export async function updateUserWatermark(
  userId: number,
  watermarkUrl: string,
  watermarkKey: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({ watermarkUrl, watermarkKey })
    .where(eq(users.id, userId));

  const [updated] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  return updated;
}

export async function deleteUserWatermark(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get current watermark key before deleting
  const [user] = await db
    .select({ watermarkKey: users.watermarkKey })
    .from(users)
    .where(eq(users.id, userId));

  await db
    .update(users)
    .set({ watermarkUrl: null, watermarkKey: null })
    .where(eq(users.id, userId));

  return user?.watermarkKey || null;
}

export async function getUserWatermark(userId: number) {
  const db = await getDb();
  if (!db) {
    return null;
  }

  const [user] = await db
    .select({ watermarkUrl: users.watermarkUrl, watermarkKey: users.watermarkKey })
    .from(users)
    .where(eq(users.id, userId));

  return user || null;
}

// ==================== WARRANTY REMINDER FUNCTIONS ====================

export async function createWarrantyReminder(reminder: InsertWarrantyReminder) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const [result] = await db.insert(warrantyReminders).values(reminder).$returningId();
  return result.id;
}

export async function getProjectWarrantyReminder(projectId: number) {
  const db = await getDb();
  if (!db) {
    return null;
  }

  const [reminder] = await db
    .select()
    .from(warrantyReminders)
    .where(eq(warrantyReminders.projectId, projectId));

  return reminder || null;
}

export async function updateWarrantyReminder(
  reminderId: number,
  userId: number,
  updates: Partial<{
    reminderEmail: string;
    intervals: string;
    emailSubject: string | null;
    emailMessage: string | null;
    enabled: "yes" | "no";
    nextReminderDate: Date | null;
    lastSentAt: Date | null;
  }>
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(warrantyReminders)
    .set(updates)
    .where(
      and(
        eq(warrantyReminders.id, reminderId),
        eq(warrantyReminders.userId, userId)
      )
    );
}

export async function deleteWarrantyReminder(reminderId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .delete(warrantyReminders)
    .where(
      and(
        eq(warrantyReminders.id, reminderId),
        eq(warrantyReminders.userId, userId)
      )
    );
}

export async function getDueWarrantyReminders() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const now = new Date();
  
  // Get all enabled reminders where nextReminderDate is in the past or today
  const reminders = await db
    .select({
      reminder: warrantyReminders,
      project: projects,
      user: users,
    })
    .from(warrantyReminders)
    .innerJoin(projects, eq(warrantyReminders.projectId, projects.id))
    .innerJoin(users, eq(warrantyReminders.userId, users.id))
    .where(
      and(
        eq(warrantyReminders.enabled, "yes"),
        sql`${warrantyReminders.nextReminderDate} <= ${now}`
      )
    );

  return reminders;
}

export async function updateProjectWarranty(
  projectId: number,
  userId: number,
  warrantyStartDate: Date | null,
  warrantyEndDate: Date | null
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(projects)
    .set({
      warrantyStartDate,
      warrantyEndDate,
    })
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.userId, userId)
      )
    );
}


// ============================================
// Client CRUD Operations
// ============================================

/**
 * Create a new client
 */
export async function createClient(client: InsertClient) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(clients).values(client);
  const insertId = result[0].insertId;
  
  const created = await db.select().from(clients).where(eq(clients.id, insertId)).limit(1);
  return created[0];
}

/**
 * Get all clients for an owner.
 * Webmaster users can see all clients regardless of ownerId.
 */
export async function getOwnerClients(ownerId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Check if the requesting user is a webmaster — they can see all clients
  const userResult = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1);

  const isWebmaster = userResult.length > 0 && userResult[0].role === 'webmaster';

  return db
    .select()
    .from(clients)
    .where(
      isWebmaster
        ? isNull(clients.deletedAt)
        : and(eq(clients.ownerId, ownerId), isNull(clients.deletedAt))
    )
    .orderBy(desc(clients.updatedAt));
}

/**
 * Get a single client by ID
 */
export async function getClientById(clientId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get a client by ID, ensuring it belongs to the specified owner.
 * Webmaster users can access any client regardless of ownerId.
 */
export async function getOwnerClient(clientId: number, ownerId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Check if the requesting user is a webmaster — they can access any client
  const userResult = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1);

  const isWebmaster = userResult.length > 0 && userResult[0].role === 'webmaster';

  const result = await db
    .select()
    .from(clients)
    .where(
      isWebmaster
        ? and(eq(clients.id, clientId), isNull(clients.deletedAt))
        : and(eq(clients.id, clientId), eq(clients.ownerId, ownerId), isNull(clients.deletedAt))
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Update a client
 */
export async function updateClient(
  clientId: number,
  ownerId: number,
  updates: Partial<Omit<InsertClient, "id" | "ownerId" | "createdAt">>
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await getOwnerClient(clientId, ownerId);
  if (!existing) {
    return null;
  }

  await db
    .update(clients)
    .set(updates)
    .where(and(eq(clients.id, clientId), eq(clients.ownerId, ownerId)));

  return getOwnerClient(clientId, ownerId);
}

/**
 * Delete a client
 */
export async function deleteClient(clientId: number, ownerId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await getOwnerClient(clientId, ownerId);
  if (!existing) {
    return false;
  }

  // Remove client association from projects
  await db
    .update(projects)
    .set({ clientId: null })
    .where(eq(projects.clientId, clientId));

  // Delete client users
  await db.delete(clientUsers).where(eq(clientUsers.clientId, clientId));

  // Delete client invitations
  await db.delete(clientInvitations).where(eq(clientInvitations.clientId, clientId));

  // Delete the client
  await db.delete(clients).where(eq(clients.id, clientId));

  return true;
}

/**
 * Get projects assigned to a client
 */
export async function getClientProjects(clientId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(projects)
    .where(and(eq(projects.clientId, clientId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.updatedAt));
}
/**
 * Get all projects accessible to a user through their client memberships
 */
export async function getUserClientProjects(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get all clients the user belongs to
  const userClients = await db
    .select({ clientId: clientUsers.clientId })
    .from(clientUsers)
    .where(eq(clientUsers.userId, userId));

  if (userClients.length === 0) {
    return [];
  }

  const clientIds = userClients.map(uc => uc.clientId);

  // Get all projects assigned to those clients
  return db
    .select()
    .from(projects)
    .where(and(inArray(projects.clientId, clientIds), isNull(projects.deletedAt)))
    .orderBy(desc(projects.updatedAt));
}

/**
 * Assign a project to a client
 */
export async function assignProjectToClient(projectId: number, clientId: number | null, ownerId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Verify the project belongs to the owner
  const project = await getUserProject(projectId, ownerId);
  if (!project) {
    return null;
  }

  // If assigning to a client, verify the client belongs to the owner
  if (clientId !== null) {
    const client = await getOwnerClient(clientId, ownerId);
    if (!client) {
      return null;
    }
  }

  // Get the old clientId to update project counts
  const oldClientId = project.clientId;

  // Update the project
  await db
    .update(projects)
    .set({ clientId })
    .where(eq(projects.id, projectId));

  // Update project counts
  if (oldClientId !== null && oldClientId !== clientId) {
    await db
      .update(clients)
      .set({ projectCount: sql`GREATEST(${clients.projectCount} - 1, 0)` })
      .where(eq(clients.id, oldClientId));
  }

  if (clientId !== null && clientId !== oldClientId) {
    await db
      .update(clients)
      .set({ projectCount: sql`${clients.projectCount} + 1` })
      .where(eq(clients.id, clientId));
  }

  return getProjectById(projectId);
}

// ============================================
// Client Users & Invitations
// ============================================

/**
 * Check if a user has access to a client portal
 */
export async function userHasClientAccess(clientId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

   // Check if user is the owner
  const client = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.ownerId, userId), isNull(clients.deletedAt)))
    .limit(1);
  if (client.length > 0) {
    return true;
  }
  // Check if user is a client userr
  const clientUser = await db
    .select()
    .from(clientUsers)
    .where(and(eq(clientUsers.clientId, clientId), eq(clientUsers.userId, userId)))
    .limit(1);

  return clientUser.length > 0;
}

/**
 * Get clients a user has access to (as a client user, not owner)
 */
export async function getUserClientAccess(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select({
      client: clients,
      role: clientUsers.role,
    })
    .from(clientUsers)
    .innerJoin(clients, eq(clientUsers.clientId, clients.id))
    .where(eq(clientUsers.userId, userId));

  return result;
}

/**
 * Add a user to a client
 */
export async function addClientUser(clientUser: InsertClientUser) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Check if user already has access
  const existing = await db
    .select()
    .from(clientUsers)
    .where(and(eq(clientUsers.clientId, clientUser.clientId), eq(clientUsers.userId, clientUser.userId)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const result = await db.insert(clientUsers).values(clientUser);
  const insertId = result[0].insertId;

  const created = await db.select().from(clientUsers).where(eq(clientUsers.id, insertId)).limit(1);
  return created[0];
}

/**
 * Remove a user from a client
 */
export async function removeClientUser(clientId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .delete(clientUsers)
    .where(and(eq(clientUsers.clientId, clientId), eq(clientUsers.userId, userId)));

  return true;
}

/**
 * Get all users for a client
 */
export async function getClientUsers(clientId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select({
      clientUser: clientUsers,
      user: users,
    })
    .from(clientUsers)
    .innerJoin(users, eq(clientUsers.userId, users.id))
    .where(eq(clientUsers.clientId, clientId));
}

/**
 * Create a client invitation
 */
export async function createClientInvitation(invitation: InsertClientInvitation) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(clientInvitations).values(invitation);
  const insertId = result[0].insertId;

  const created = await db.select().from(clientInvitations).where(eq(clientInvitations.id, insertId)).limit(1);
  return created[0];
}

/**
 * Get a client invitation by token
 */
export async function getClientInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select({
      invitation: clientInvitations,
      client: clients,
    })
    .from(clientInvitations)
    .innerJoin(clients, eq(clientInvitations.clientId, clients.id))
    .where(eq(clientInvitations.token, token))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Accept a client invitation
 */
export async function acceptClientInvitation(token: string, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const invitationData = await getClientInvitationByToken(token);
  if (!invitationData) {
    return { success: false, error: "Invitation not found" };
  }

  const { invitation, client } = invitationData;

  if (invitation.status !== "pending") {
    return { success: false, error: "Invitation is no longer valid" };
  }

  if (new Date() > invitation.expiresAt) {
    await db
      .update(clientInvitations)
      .set({ status: "expired" })
      .where(eq(clientInvitations.id, invitation.id));
    return { success: false, error: "Invitation has expired" };
  }

  // Add user to client
  await addClientUser({
    clientId: invitation.clientId,
    userId,
    role: invitation.role,
  });

  // Update invitation status
  await db
    .update(clientInvitations)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(clientInvitations.id, invitation.id));

  return { success: true, client };
}

/**
 * Get pending invitations for a client
 */
export async function getClientPendingInvitations(clientId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(clientInvitations)
    .where(and(eq(clientInvitations.clientId, clientId), eq(clientInvitations.status, "pending")));
}

/**
 * Revoke a client invitation
 */
export async function revokeClientInvitation(invitationId: number, ownerId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const invitation = await db
    .select()
    .from(clientInvitations)
    .where(eq(clientInvitations.id, invitationId))
    .limit(1);

  if (invitation.length === 0) {
    return false;
  }

  // Verify the client belongs to the owner
  const client = await getOwnerClient(invitation[0].clientId, ownerId);
  if (!client) {
    return false;
  }

  await db
    .update(clientInvitations)
    .set({ status: "revoked" })
    .where(eq(clientInvitations.id, invitationId));

  return true;
}

/**
 * Check if a user has client access to a specific project
 * (i.e., the user is a client user for a client that has this project assigned)
 */
export async function userHasClientProjectAccess(userId: number, projectId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get the project to check its clientId
  const project = await db
    .select({ clientId: projects.clientId })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (project.length === 0 || !project[0].clientId) {
    return false;
  }

  // Check if user has access to this client
  const clientAccess = await db
    .select()
    .from(clientUsers)
    .where(
      and(
        eq(clientUsers.userId, userId),
        eq(clientUsers.clientId, project[0].clientId)
      )
    )
    .limit(1);

  return clientAccess.length > 0;
}


/**
 * Update client logo
 */
export async function updateClientLogo(
  clientId: number,
  ownerId: number,
  logoUrl: string,
  logoKey: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await getOwnerClient(clientId, ownerId);
  if (!existing) {
    return null;
  }

  await db
    .update(clients)
    .set({ logoUrl, logoKey })
    .where(and(eq(clients.id, clientId), eq(clients.ownerId, ownerId)));

  return getOwnerClient(clientId, ownerId);
}

/**
 * Delete client logo
 */
export async function deleteClientLogo(clientId: number, ownerId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await getOwnerClient(clientId, ownerId);
  if (!existing) {
    return null;
  }

  const oldKey = existing.logoKey;

  await db
    .update(clients)
    .set({ logoUrl: null, logoKey: null })
    .where(and(eq(clients.id, clientId), eq(clients.ownerId, ownerId)));

  return oldKey;
}

/**
 * Get client logo
 */
export async function getClientLogo(clientId: number, ownerId: number) {
  const client = await getOwnerClient(clientId, ownerId);
  if (!client) {
    return null;
  }
  return {
    logoUrl: client.logoUrl,
    logoKey: client.logoKey,
  };
}


// ==================== User Pilot Settings Functions ====================

/**
 * Update user's default pilot settings
 */
export async function updateUserPilotSettings(
  userId: number,
  settings: {
    defaultDronePilot?: string | null;
    defaultFaaLicenseNumber?: string | null;
    defaultLaancAuthNumber?: string | null;
  }
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({
      defaultDronePilot: settings.defaultDronePilot,
      defaultFaaLicenseNumber: settings.defaultFaaLicenseNumber,
      defaultLaancAuthNumber: settings.defaultLaancAuthNumber,
    })
    .where(eq(users.id, userId));

  const [updated] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  return updated;
}

/**
 * Get user's default pilot settings
 */
export async function getUserPilotSettings(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const [user] = await db
    .select({
      defaultDronePilot: users.defaultDronePilot,
      defaultFaaLicenseNumber: users.defaultFaaLicenseNumber,
      defaultLaancAuthNumber: users.defaultLaancAuthNumber,
    })
    .from(users)
    .where(eq(users.id, userId));

  return user || null;
}

/**
 * Update notes for a media item
 */
export async function updateMediaNotes(
  mediaId: number,
  notes: string | null
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(media)
    .set({
      notes: notes,
      updatedAt: new Date(),
    })
    .where(eq(media.id, mediaId));

  // Return the updated media item
  const [updated] = await db
    .select()
    .from(media)
    .where(eq(media.id, mediaId));

  return updated;
}

/**
 * Update priority for a media item
 */
export async function updateMediaPriority(
  mediaId: number,
  priority: "none" | "low" | "high"
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(media)
    .set({
      priority: priority,
      updatedAt: new Date(),
    })
    .where(eq(media.id, mediaId));

  // Return the updated media item
  const [updated] = await db
    .select()
    .from(media)
    .where(eq(media.id, mediaId));

  return updated;
}

/**
 * Update filename for a media item
 */
export async function updateMediaFilename(
  mediaId: number,
  filename: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(media)
    .set({
      filename: filename,
      updatedAt: new Date(),
    })
    .where(eq(media.id, mediaId));

  // Return the updated media item
  const [updated] = await db
    .select()
    .from(media)
    .where(eq(media.id, mediaId));

  return updated;
}

/**
 * Get all media for a specific flight
 */
export async function getMediaByFlight(flightId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(media)
    .where(and(eq(media.flightId, flightId), eq(media.userId, userId), isNull(media.deletedAt)))
    .orderBy(desc(media.createdAt));
}
/**
 * Get all projects assigned to a specific client user
 */
export async function getUserAssignedProjects(clientId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { clientProjectAssignments } = await import("../drizzle/schema");
  
  return db
    .select({
      id: clientProjectAssignments.id,
      projectId: clientProjectAssignments.projectId,
      assignedAt: clientProjectAssignments.assignedAt,
      project: projects,
    })
    .from(clientProjectAssignments)
    .leftJoin(projects, eq(clientProjectAssignments.projectId, projects.id))
    .where(
      and(
        eq(clientProjectAssignments.clientId, clientId),
        eq(clientProjectAssignments.userId, userId)
      )
    )
    .orderBy(desc(clientProjectAssignments.assignedAt));
}

/**
 * Get all projects in a client folder (for assignment UI)
 */
export async function getClientProjectsForAssignment(clientId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(projects)
    .where(and(eq(projects.clientId, clientId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.createdAt));
}

/**
 * Assign a project to a client user
 */
export async function assignProjectToUser(
  clientId: number,
  userId: number,
  projectId: number,
  assignedBy: number
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { clientProjectAssignments } = await import("../drizzle/schema");

  // Check if already assigned
  const existing = await db
    .select()
    .from(clientProjectAssignments)
    .where(
      and(
        eq(clientProjectAssignments.clientId, clientId),
        eq(clientProjectAssignments.userId, userId),
        eq(clientProjectAssignments.projectId, projectId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { alreadyAssigned: true, assignment: existing[0] };
  }

  const newAssignment: InsertClientProjectAssignment = {
    clientId,
    userId,
    projectId,
    assignedBy,
  };

  const result = await db.insert(clientProjectAssignments).values(newAssignment);
  
  return {
    alreadyAssigned: false,
    assignment: {
      id: result[0]?.insertId ? Number(result[0].insertId) : 0,
      ...newAssignment,
      assignedAt: new Date(),
    },
  };
}

/**
 * Unassign a project from a client user
 */
export async function unassignProjectFromUser(
  clientId: number,
  userId: number,
  projectId: number
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { clientProjectAssignments } = await import("../drizzle/schema");

  await db
    .delete(clientProjectAssignments)
    .where(
      and(
        eq(clientProjectAssignments.clientId, clientId),
        eq(clientProjectAssignments.userId, userId),
        eq(clientProjectAssignments.projectId, projectId)
      )
    );

  return { success: true };
}

/**
 * Transfer a project from one user to another within the same client
 */
export async function transferProjectBetweenUsers(
  clientId: number,
  fromUserId: number,
  toUserId: number,
  projectId: number,
  assignedBy: number
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Unassign from old user
  await unassignProjectFromUser(clientId, fromUserId, projectId);
  
  // Assign to new user
  const result = await assignProjectToUser(clientId, toUserId, projectId, assignedBy);
  
  return result;
}

/**
 * Bulk assign multiple projects to a user
 */
export async function bulkAssignProjects(
  clientId: number,
  userId: number,
  projectIds: number[],
  assignedBy: number
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { clientProjectAssignments } = await import("../drizzle/schema");

  // Get existing assignments to avoid duplicates
  const existing = await db
    .select()
    .from(clientProjectAssignments)
    .where(
      and(
        eq(clientProjectAssignments.clientId, clientId),
        eq(clientProjectAssignments.userId, userId)
      )
    );

  const existingProjectIds = new Set(existing.map(a => a.projectId));
  const newProjectIds = projectIds.filter(id => !existingProjectIds.has(id));

  if (newProjectIds.length === 0) {
    return { assigned: 0, skipped: projectIds.length };
  }

  const assignments: InsertClientProjectAssignment[] = newProjectIds.map(projectId => ({
    clientId,
    userId,
    projectId,
    assignedBy,
  }));

  await db.insert(clientProjectAssignments).values(assignments);

  return { assigned: newProjectIds.length, skipped: projectIds.length - newProjectIds.length };
}

/**
 * Bulk unassign multiple projects from a user
 */
export async function bulkUnassignProjects(
  clientId: number,
  userId: number,
  projectIds: number[]
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { clientProjectAssignments } = await import("../drizzle/schema");

  await db
    .delete(clientProjectAssignments)
    .where(
      and(
        eq(clientProjectAssignments.clientId, clientId),
        eq(clientProjectAssignments.userId, userId),
        inArray(clientProjectAssignments.projectId, projectIds)
      )
    );

  return { success: true };
}

/**
 * Get all users and their project assignments for a client
 */
export async function getClientUsersWithAssignments(clientId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { clientProjectAssignments } = await import("../drizzle/schema");

  // Get all client users
  const clientUsersList = await getClientUsers(clientId);

  // Get all assignments for this client
  const assignments = await db
    .select()
    .from(clientProjectAssignments)
    .where(eq(clientProjectAssignments.clientId, clientId));

  // Group assignments by user
  const assignmentsByUser = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.userId]) {
      acc[assignment.userId] = [];
    }
    acc[assignment.userId].push(assignment);
    return acc;
  }, {} as Record<number, typeof assignments>);

  // Combine user data with their assignments
  return clientUsersList.map(cu => ({
    ...cu,
    assignments: assignmentsByUser[cu.clientUser.userId] || [],
    projectCount: (assignmentsByUser[cu.clientUser.userId] || []).length,
  }));
}


/**
 * Get all users who have access to the owner's projects (collaborators)
 */
export async function getOwnerUsers(ownerId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get all projects owned by this user
  const ownerProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.userId, ownerId), isNull(projects.deletedAt)));

  if (ownerProjects.length === 0) {
    return [];
  }

  const projectIds = ownerProjects.map(p => p.id);

  // Get all collaborators for these projects
  const allCollaborators = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      companyName: users.companyName,
      department: users.department,
      phone: users.phone,
      projectId: projectCollaborators.projectId,
    })
    .from(projectCollaborators)
    .innerJoin(users, eq(projectCollaborators.userId, users.id))
    .where(inArray(projectCollaborators.projectId, projectIds));

  // Deduplicate users and count their projects
  const userMap = new Map<number, any>();
  for (const collab of allCollaborators) {
    if (!userMap.has(collab.id)) {
      userMap.set(collab.id, {
        id: collab.id,
        name: collab.name,
        email: collab.email,
        role: collab.role,
        companyName: collab.companyName,
        department: collab.department,
        phone: collab.phone,
        projectCount: 0,
      });
    }
    const user = userMap.get(collab.id)!;
    user.projectCount++;
  }

  return Array.from(userMap.values());
}

/**
 * Get a specific user's details including contact info and assigned projects
 */
export async function getUserDetailsById(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const user = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      openId: users.openId,
      companyName: users.companyName,
      department: users.department,
      phone: users.phone,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]) return null;

  // Get assigned projects for this user
  const assignedProjects = await db
    .select({
      projectId: projectCollaborators.projectId,
      projectName: projects.name,
      role: projectCollaborators.role,
    })
    .from(projectCollaborators)
    .innerJoin(projects, eq(projectCollaborators.projectId, projects.id))
    .where(eq(projectCollaborators.userId, userId));

  return { ...user[0], assignedProjects };
}

/**
 * Update a user's details including contact info
 */
export async function updateUserDetails(userId: number, data: {
  name?: string;
  role?: 'user' | 'admin' | 'webmaster' | 'client';
  companyName?: string | null;
  department?: string | null;
  phone?: string | null;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.companyName !== undefined) updateData.companyName = data.companyName;
  if (data.department !== undefined) updateData.department = data.department;
  if (data.phone !== undefined) updateData.phone = data.phone;

  if (Object.keys(updateData).length === 0) {
    return { success: true };
  }

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId));

  return { success: true };
}

/**
 * Set or update a user's password (bcrypt hashed)
 */
export async function setUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId));

  return { success: true };
}

/**
 * Assign a user to a project as a collaborator
 */
export async function assignUserToProject(userId: number, projectId: number, role: 'viewer' | 'editor' | 'vendor' = 'viewer') {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Check if already assigned
  const existing = await db
    .select()
    .from(projectCollaborators)
    .where(and(eq(projectCollaborators.userId, userId), eq(projectCollaborators.projectId, projectId)))
    .limit(1);

  if (existing.length > 0) {
    return { success: true, alreadyAssigned: true };
  }

  await db.insert(projectCollaborators).values({
    userId,
    projectId,
    role,
  });

  return { success: true, alreadyAssigned: false };
}

/**
 * Remove a user from a project
 */
export async function removeUserFromProject(userId: number, projectId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .delete(projectCollaborators)
    .where(and(eq(projectCollaborators.userId, userId), eq(projectCollaborators.projectId, projectId)));

  return { success: true };
}


/**
 * Get a user's role in the client that owns a specific project
 * Returns the role (viewer, user, admin, owner, collaborator) or null if user doesn't have access
 */
export async function getUserRoleForProject(projectId: number, userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection failed");
  }

  // First, check if user is the project owner
  const ownerProject = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId), isNull(projects.deletedAt)))
    .limit(1);

  if (ownerProject.length > 0) {
    return "owner"; // Owner has full permissions
  }

  // Check if user is a project collaborator
  const collaborator = await db
    .select()
    .from(projectCollaborators)
    .where(and(eq(projectCollaborators.projectId, projectId), eq(projectCollaborators.userId, userId)))
    .limit(1);

  if (collaborator.length > 0) {
    return "collaborator"; // Collaborators have edit permissions
  }

  // Check if project is assigned to a client
  const assignment = await db
    .select({ clientId: clientProjectAssignments.clientId })
    .from(clientProjectAssignments)
    .where(eq(clientProjectAssignments.projectId, projectId))
    .limit(1);

  if (assignment.length === 0) {
    // Project not assigned to any client and user is not a collaborator
    return null;
  }

  // Get user's role in that client
  const clientId = assignment[0].clientId;
  const userRole = await db
    .select({ role: clientUsers.role })
    .from(clientUsers)
    .where(and(eq(clientUsers.clientId, clientId), eq(clientUsers.userId, userId)))
    .limit(1);

  if (userRole.length === 0) {
    return null;
  }

  return userRole[0].role;
}


// ============================================
// Subscription Management Functions
// ============================================

/**
 * Update user subscription status after successful payment
 */
export async function updateUserSubscription(
  userId: number,
  data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionTier: "free" | "starter" | "professional" | "business" | "enterprise";
    subscriptionStatus?: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
    billingPeriod?: "monthly" | "annual";
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: "yes" | "no";
  }
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const updateData: Record<string, any> = {
    subscriptionTier: data.subscriptionTier,
    updatedAt: new Date(),
  };

  if (data.stripeCustomerId) updateData.stripeCustomerId = data.stripeCustomerId;
  if (data.stripeSubscriptionId) updateData.stripeSubscriptionId = data.stripeSubscriptionId;
  if (data.subscriptionStatus) updateData.subscriptionStatus = data.subscriptionStatus;
  if (data.billingPeriod) updateData.billingPeriod = data.billingPeriod;
  if (data.currentPeriodStart) updateData.currentPeriodStart = data.currentPeriodStart;
  if (data.currentPeriodEnd) updateData.currentPeriodEnd = data.currentPeriodEnd;
  if (data.cancelAtPeriodEnd) updateData.cancelAtPeriodEnd = data.cancelAtPeriodEnd;

  await db.update(users).set(updateData).where(eq(users.id, userId));
}

/**
 * Get user subscription details
 */
export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      subscriptionTier: users.subscriptionTier,
      subscriptionStatus: users.subscriptionStatus,
      billingPeriod: users.billingPeriod,
      currentPeriodStart: users.currentPeriodStart,
      currentPeriodEnd: users.currentPeriodEnd,
      cancelAtPeriodEnd: users.cancelAtPeriodEnd,
      stripeCustomerId: users.stripeCustomerId,
      stripeSubscriptionId: users.stripeSubscriptionId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Downgrade user to free tier
 */
export async function downgradeToFreeTier(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({
      subscriptionTier: "free",
      subscriptionStatus: "canceled",
      stripeSubscriptionId: null,
      billingPeriod: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: "no",
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}


// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Insert an audit log entry
 */
export async function createAuditLogEntry(entry: {
  action: string;
  entityType: string;
  entityId: number;
  entityName?: string;
  userId: number;
  userName?: string;
  details?: string;
  ipAddress?: string;
}) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditLog).values({
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityName: entry.entityName ?? null,
      userId: entry.userId,
      userName: entry.userName ?? null,
      details: entry.details ?? null,
      ipAddress: entry.ipAddress ?? null,
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write audit log:", err);
  }
}

/**
 * List audit log entries with optional filters
 */
export async function listAuditLog(opts: {
  entityType?: string;
  entityId?: number;
  userId?: number;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [];
  if (opts.entityType) conditions.push(eq(auditLog.entityType, opts.entityType));
  if (opts.entityId) conditions.push(eq(auditLog.entityId, opts.entityId));
  if (opts.userId) conditions.push(eq(auditLog.userId, opts.userId));
  if (opts.action) conditions.push(eq(auditLog.action, opts.action));

  const rows = await db
    .select()
    .from(auditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(opts.limit ?? 100)
    .offset(opts.offset ?? 0);

  return rows;
}

/**
 * Count audit log entries with optional filters
 */
export async function countAuditLog(opts: {
  entityType?: string;
  action?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [];
  if (opts.entityType) conditions.push(eq(auditLog.entityType, opts.entityType));
  if (opts.action) conditions.push(eq(auditLog.action, opts.action));

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return result[0]?.count ?? 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// SOFT DELETE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Soft-delete a project (set deletedAt instead of hard delete)
 */
export async function softDeleteProject(projectId: number, userId: number, deletedByUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUserProject(projectId, userId);
  if (!existing) return false;

  const now = new Date();

  // Soft-delete all media in this project
  await db
    .update(media)
    .set({ deletedAt: now, deletedBy: deletedByUserId })
    .where(and(eq(media.projectId, projectId), isNull(media.deletedAt)));

  // Soft-delete all flights in this project
  await db
    .update(flights)
    .set({ deletedAt: now, deletedBy: deletedByUserId })
    .where(and(eq(flights.projectId, projectId), isNull(flights.deletedAt)));

  // Soft-delete the project
  await db
    .update(projects)
    .set({ deletedAt: now, deletedBy: deletedByUserId })
    .where(eq(projects.id, projectId));

  return true;
}

/**
 * Soft-delete a media item
 */
export async function softDeleteMedia(mediaId: number, userId: number, deletedByUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getMediaById(mediaId, userId);
  if (!existing) return null;

  await db
    .update(media)
    .set({ deletedAt: new Date(), deletedBy: deletedByUserId })
    .where(eq(media.id, mediaId));

  // Decrement the project's media count
  await decrementProjectMediaCount(existing.projectId);

  return existing;
}

/**
 * Soft-delete a flight
 */
export async function softDeleteFlight(flightId: number, userId: number, deletedByUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUserFlight(flightId, userId);
  if (!existing) return null;

  const now = new Date();

  // Soft-delete all media in this flight
  await db
    .update(media)
    .set({ deletedAt: now, deletedBy: deletedByUserId })
    .where(and(eq(media.flightId, flightId), isNull(media.deletedAt)));

  // Soft-delete the flight
  await db
    .update(flights)
    .set({ deletedAt: now, deletedBy: deletedByUserId })
    .where(eq(flights.id, flightId));

  return existing;
}

/**
 * Soft-delete a client
 */
export async function softDeleteClient(clientId: number, ownerId: number, deletedByUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getOwnerClient(clientId, ownerId);
  if (!existing) return false;

  await db
    .update(clients)
    .set({ deletedAt: new Date(), deletedBy: deletedByUserId })
    .where(eq(clients.id, clientId));

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESTORE (UNDELETE) HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Restore a soft-deleted project and its media/flights
 */
export async function restoreProject(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Restore the project
  await db
    .update(projects)
    .set({ deletedAt: null, deletedBy: null })
    .where(eq(projects.id, projectId));

  // Restore media that was deleted at the same time
  await db
    .update(media)
    .set({ deletedAt: null, deletedBy: null })
    .where(and(eq(media.projectId, projectId), isNotNull(media.deletedAt)));

  // Restore flights
  await db
    .update(flights)
    .set({ deletedAt: null, deletedBy: null })
    .where(and(eq(flights.projectId, projectId), isNotNull(flights.deletedAt)));

  return true;
}

/**
 * Restore a soft-deleted media item
 */
export async function restoreMedia(mediaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [item] = await db.select().from(media).where(eq(media.id, mediaId)).limit(1);
  if (!item) return null;

  await db
    .update(media)
    .set({ deletedAt: null, deletedBy: null })
    .where(eq(media.id, mediaId));

  // Re-increment project media count
  if (item.projectId) {
    await db
      .update(projects)
      .set({ mediaCount: sql`${projects.mediaCount} + 1` })
      .where(eq(projects.id, item.projectId));
  }

  return item;
}

/**
 * Restore a soft-deleted flight and its media
 */
export async function restoreFlight(flightId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(flights)
    .set({ deletedAt: null, deletedBy: null })
    .where(eq(flights.id, flightId));

  // Restore media in this flight
  await db
    .update(media)
    .set({ deletedAt: null, deletedBy: null })
    .where(and(eq(media.flightId, flightId), isNotNull(media.deletedAt)));

  return true;
}

/**
 * Restore a soft-deleted client
 */
export async function restoreClient(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(clients)
    .set({ deletedAt: null, deletedBy: null })
    .where(eq(clients.id, clientId));

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRASH LISTING (soft-deleted items)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * List all soft-deleted items across all entity types for the trash view
 */
export async function listTrashItems(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const deletedProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      deletedAt: projects.deletedAt,
      deletedBy: projects.deletedBy,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(and(eq(projects.userId, ownerId), isNotNull(projects.deletedAt)));

  const deletedMedia = await db
    .select({
      id: media.id,
      name: media.filename,
      projectId: media.projectId,
      mediaType: media.mediaType,
      thumbnailUrl: media.thumbnailUrl,
      url: media.url,
      deletedAt: media.deletedAt,
      deletedBy: media.deletedBy,
      createdAt: media.createdAt,
    })
    .from(media)
    .where(and(eq(media.userId, ownerId), isNotNull(media.deletedAt)));

  const deletedFlights = await db
    .select({
      id: flights.id,
      name: flights.name,
      projectId: flights.projectId,
      deletedAt: flights.deletedAt,
      deletedBy: flights.deletedBy,
      createdAt: flights.createdAt,
    })
    .from(flights)
    .where(and(eq(flights.userId, ownerId), isNotNull(flights.deletedAt)));

  const deletedClients = await db
    .select({
      id: clients.id,
      name: clients.name,
      deletedAt: clients.deletedAt,
      deletedBy: clients.deletedBy,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .where(and(eq(clients.ownerId, ownerId), isNotNull(clients.deletedAt)));

  return {
    projects: deletedProjects,
    media: deletedMedia,
    flights: deletedFlights,
    clients: deletedClients,
  };
}

/**
 * Permanently delete items that have been in trash for more than 30 days
 */
export async function purgeExpiredTrashItems() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Permanently delete old media
  await db
    .delete(media)
    .where(and(isNotNull(media.deletedAt), gte(sql`TIMESTAMPDIFF(SECOND, ${media.deletedAt}, NOW())`, 30 * 24 * 60 * 60)));

  // Permanently delete old flights
  await db
    .delete(flights)
    .where(and(isNotNull(flights.deletedAt), gte(sql`TIMESTAMPDIFF(SECOND, ${flights.deletedAt}, NOW())`, 30 * 24 * 60 * 60)));

  // Permanently delete old projects
  await db
    .delete(projects)
    .where(and(isNotNull(projects.deletedAt), gte(sql`TIMESTAMPDIFF(SECOND, ${projects.deletedAt}, NOW())`, 30 * 24 * 60 * 60)));

  // Permanently delete old clients
  await db
    .delete(clients)
    .where(and(isNotNull(clients.deletedAt), gte(sql`TIMESTAMPDIFF(SECOND, ${clients.deletedAt}, NOW())`, 30 * 24 * 60 * 60)));

  return true;
}

/**
 * Permanently delete a single item from trash
 */
export async function permanentlyDeleteTrashItem(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  switch (entityType) {
    case "project":
      // Delete associated media and flights first
      await db.delete(media).where(eq(media.projectId, entityId));
      await db.delete(flights).where(eq(flights.projectId, entityId));
      await db.delete(projects).where(eq(projects.id, entityId));
      break;
    case "media":
      await db.delete(media).where(eq(media.id, entityId));
      break;
    case "flight":
      await db.delete(media).where(eq(media.flightId, entityId));
      await db.delete(flights).where(eq(flights.id, entityId));
      break;
    case "client":
      // Remove client associations but don't delete projects
      await db.update(projects).set({ clientId: null }).where(eq(projects.clientId, entityId));
      await db.delete(clientUsers).where(eq(clientUsers.clientId, entityId));
      await db.delete(clientInvitations).where(eq(clientInvitations.clientId, entityId));
      await db.delete(clientProjectAssignments).where(eq(clientProjectAssignments.clientId, entityId));
      await db.delete(clients).where(eq(clients.id, entityId));
      break;
  }

  return true;
}
