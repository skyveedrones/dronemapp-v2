import { boolean, decimal, json, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Organizations table for multi-tenant support.
 * Each organization represents a drone service provider, municipality, or firm.
 */
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  /** Organization display name */
  name: varchar("name", { length: 255 }).notNull(),
  /** Logo URL (stored in S3) */
  logoUrl: varchar("logoUrl", { length: 500 }),
  /** Primary brand color (hex, e.g. #10b981) */
  brandColor: varchar("brandColor", { length: 20 }),
  /** Organization type */
  type: mysqlEnum("type", ["drone_service_provider", "municipality", "engineering_firm", "other"]).default("drone_service_provider").notNull(),
  /** Subscription tier for the organization */
  subscriptionTier: mysqlEnum("subscriptionTier", ["starter", "professional", "pilot"]).default("starter").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;
/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "webmaster", "client"]).default("user").notNull(),
  /** User's company/client logo URL */
  logoUrl: varchar("logoUrl", { length: 500 }),
  /** S3 storage key for the logo */
  logoKey: varchar("logoKey", { length: 500 }),
  /** User's saved watermark image URL */
  watermarkUrl: varchar("watermarkUrl", { length: 500 }),
  /** S3 storage key for the watermark */
  watermarkKey: varchar("watermarkKey", { length: 500 }),
  /** Default drone pilot name for new projects */
  defaultDronePilot: varchar("defaultDronePilot", { length: 255 }),
  /** Default FAA license number for new projects */
  defaultFaaLicenseNumber: varchar("defaultFaaLicenseNumber", { length: 100 }),
  /** Default LAANC authorization number for new projects */
  defaultLaancAuthNumber: varchar("defaultLaancAuthNumber", { length: 100 }),
  /** User's organization name */
  organization: varchar("organization", { length: 255 }),
  /** Company name (for managed users) */
  companyName: varchar("companyName", { length: 255 }),
  /** Department within the company */
  department: varchar("department", { length: 255 }),
  /** Phone number */
  phone: varchar("phone", { length: 50 }),
  /** Hashed password for local auth (bcrypt) */
  passwordHash: varchar("passwordHash", { length: 255 }),
  /** Stripe customer ID for billing */
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  /** Stripe subscription ID for active subscription */
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  /** Current subscription plan tier */
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "starter", "professional", "business", "enterprise"]).default("free").notNull(),
  /** Subscription status */
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "canceled", "past_due", "trialing", "incomplete"]),
  /** Subscription billing period (monthly or annual) */
  billingPeriod: mysqlEnum("billingPeriod", ["monthly", "annual"]),
  /** Current billing period start date */
  currentPeriodStart: timestamp("currentPeriodStart"),
  /** Current billing period end date */
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  /** Whether subscription will cancel at period end */
  cancelAtPeriodEnd: mysqlEnum("cancelAtPeriodEnd", ["yes", "no"]).default("no"),
  /** Foreign key to organizations table (null = not onboarded) */
  organizationId: int("organizationId"),
  /** Role within the organization */
  orgRole: mysqlEnum("orgRole", ["PROVIDER", "ORG_ADMIN", "ORG_USER"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table for drone mapping projects.
 * Each project belongs to a user and contains metadata about the mapping job.
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to users table */
  userId: int("userId").notNull(),
  /** Project name/title */
  name: varchar("name", { length: 255 }).notNull(),
  /** Optional description of the project */
  description: text("description"),
  /** Project location (address or coordinates) */
  location: varchar("location", { length: 500 }),
  /** Client name for the project */
  clientName: varchar("clientName", { length: 255 }),
  /** Project status */
  status: mysqlEnum("status", ["active", "completed", "archived"]).default("active").notNull(),
  /** Date when the drone flight/mapping was conducted */
  flightDate: timestamp("flightDate"),
  /** Cover image URL for the project */
  coverImage: varchar("coverImage", { length: 500 }),
  /** Number of media items in the project */
  mediaCount: int("mediaCount").default(0).notNull(),
  /** Warranty start date */
  warrantyStartDate: timestamp("warrantyStartDate"),
  /** Warranty end date */
  warrantyEndDate: timestamp("warrantyEndDate"),
  /** Project logo URL */
  logoUrl: varchar("logoUrl", { length: 500 }),
  /** S3 storage key for the project logo */
  logoKey: varchar("logoKey", { length: 500 }),
  /** Foreign key to clients table (optional - project can be assigned to a client) */
  clientId: int("clientId"),
  /** Drone pilot name */
  dronePilot: varchar("dronePilot", { length: 255 }),
  /** FAA License number */
  faaLicenseNumber: varchar("faaLicenseNumber", { length: 100 }),
  /** LAANC Authorization number */
  laancAuthNumber: varchar("laancAuthNumber", { length: 100 }),
  /** Foreign key to organizations table — set when project is created under an org */
  organizationId: int("organizationId"),
  /** Whether this project is pinned/favorited to the top of the dashboard */
  isPinned: boolean("isPinned").default(false).notNull(),
  /** Soft delete timestamp — null means active */
  deletedAt: timestamp("deletedAt"),
  /** User ID who deleted this project */
  deletedBy: int("deletedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Media table for storing uploaded drone photos and videos.
 * Each media item belongs to a project and contains file metadata + GPS coordinates.
 */
export const media = mysqlTable("media", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to projects table */
  projectId: int("projectId").notNull(),
  /** Foreign key to flights table (optional - media can belong to a specific flight) */
  flightId: int("flightId"),
  /** Foreign key to users table (owner) */
  userId: int("userId").notNull(),
  /** Original filename */
  filename: varchar("filename", { length: 255 }).notNull(),
  /** S3 storage key */
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  /** Public URL to access the file */
  url: varchar("url", { length: 500 }).notNull(),
  /** File MIME type (image/jpeg, video/mp4, etc.) */
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  /** File size in bytes */
  fileSize: int("fileSize").notNull(),
  /** Media type: photo or video */
  mediaType: mysqlEnum("mediaType", ["photo", "video"]).notNull(),
  /** GPS latitude from EXIF data (nullable if not available) - high precision for accurate mapping */
  latitude: decimal("latitude", { precision: 12, scale: 9 }),
  /** GPS longitude from EXIF data (nullable if not available) - high precision for accurate mapping */
  longitude: decimal("longitude", { precision: 12, scale: 9 }),
  /** Altitude in meters from EXIF data */
  altitude: decimal("altitude", { precision: 10, scale: 2 }),
  /** Date/time the photo/video was captured (from EXIF) */
  capturedAt: timestamp("capturedAt"),
  /** Camera make from EXIF */
  cameraMake: varchar("cameraMake", { length: 100 }),
  /** Camera model from EXIF */
  cameraModel: varchar("cameraModel", { length: 100 }),
  /** Thumbnail URL for quick preview */
  thumbnailUrl: varchar("thumbnailUrl", { length: 500 }),
  /** S3 key for thumbnail */
  thumbnailKey: varchar("thumbnailKey", { length: 500 }),
  /** Original image width in pixels */
  originalWidth: int("originalWidth"),
  /** Original image height in pixels */
  originalHeight: int("originalHeight"),
  /** Thumbnail width in pixels */
  thumbnailWidth: int("thumbnailWidth"),
  /** Thumbnail height in pixels */
  thumbnailHeight: int("thumbnailHeight"),
  /** Whether this is a high-resolution version (1 = true, 0 = false) */
  isHighResolution: int("isHighResolution").default(1),
  /** Link to high-resolution download URL */
  highResUrl: varchar("highResUrl", { length: 500 }),
  /** S3 key for high-resolution file */
  highResKey: varchar("highResKey", { length: 500 }),
  /** High-resolution file size in bytes */
  highResFileSize: int("highResFileSize"),
  /** User notes for this media file */
  notes: text("notes"),
  /** Priority level for PDF report inclusion: none (not included), low (yellow !), high (red !) */
  priority: mysqlEnum("priority", ["none", "low", "high"]).default("none").notNull(),
  /** Video-specific metadata: duration in seconds */
  duration: int("duration"),
  /** Video resolution (e.g., "3840x2160") */
  resolution: varchar("resolution", { length: 50 }),
  /** Video frame rate (fps) */
  frameRate: int("frameRate"),
  /** DJI telemetry flight path as JSON array of {lat, lng, alt, timestamp} */
  telemetryPath: json("telemetryPath"),
  /** Session ID for resumable chunked uploads */
  uploadSessionId: varchar("uploadSessionId", { length: 255 }),
  /** Processing status for video telemetry extraction */
  processingStatus: mysqlEnum("processingStatus", ["pending", "processing", "completed", "failed"]).default("pending"),
  /** Error message if telemetry extraction failed */
  processingError: text("processingError"),
  /** H.264 transcoded video URL for browser playback (original H.265 stays in url/fileKey) */
  transcodedUrl: varchar("transcodedUrl", { length: 500 }),
  /** S3 key for the transcoded H.264 video */
  transcodedKey: varchar("transcodedKey", { length: 500 }),
  /** Transcode processing status */
  transcodeStatus: mysqlEnum("transcodeStatus", ["none", "pending", "processing", "completed", "failed"]).default("none"),
  /** Error message if transcode failed */
  transcodeError: text("transcodeError"),
  /** Detected video codec (e.g., hevc, h264) */
  videoCodec: varchar("videoCodec", { length: 50 }),
  /** Soft delete timestamp — null means active */
  deletedAt: timestamp("deletedAt"),
  /** User ID who deleted this media */
  deletedBy: int("deletedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Media = typeof media.$inferSelect;
export type InsertMedia = typeof media.$inferInsert;

/**
 * Project collaborators table - links users to projects they have access to.
 * This enables project sharing with registered users.
 */
export const projectCollaborators = mysqlTable("project_collaborators", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to projects table */
  projectId: int("projectId").notNull(),
  /** Foreign key to users table (the collaborator) */
  userId: int("userId").notNull(),
  /** Role of the collaborator: viewer can only view, editor can also upload/edit, vendor has restricted access */
  role: mysqlEnum("role", ["viewer", "editor", "vendor"]).default("viewer").notNull(),
  /** When the collaborator was added */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectCollaborator = typeof projectCollaborators.$inferSelect;
export type InsertProjectCollaborator = typeof projectCollaborators.$inferInsert;

/**
 * Project invitations table - tracks pending invitations sent via email.
 * Once a user registers and logs in, the invitation is converted to a collaborator entry.
 */
export const projectInvitations = mysqlTable("project_invitations", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to projects table */
  projectId: int("projectId").notNull(),
  /** Foreign key to users table (who sent the invitation) */
  invitedBy: int("invitedBy").notNull(),
  /** Email address the invitation was sent to */
  email: varchar("email", { length: 320 }).notNull(),
  /** Unique token for accepting the invitation */
  token: varchar("token", { length: 64 }).notNull().unique(),
  /** Role to assign when invitation is accepted */
  role: mysqlEnum("role", ["viewer", "editor", "vendor"]).default("viewer").notNull(),
  /** Status of the invitation */
  status: mysqlEnum("status", ["pending", "accepted", "expired", "revoked"]).default("pending").notNull(),
  /** When the invitation expires (7 days from creation) */
  expiresAt: timestamp("expiresAt").notNull(),
  /** When the invitation was accepted (if accepted) */
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectInvitation = typeof projectInvitations.$inferSelect;
export type InsertProjectInvitation = typeof projectInvitations.$inferInsert;

/**
 * Flights table for organizing multiple drone flights within a project.
 * Each flight belongs to a project and contains its own set of media files.
 */
export const flights = mysqlTable("flights", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to projects table */
  projectId: int("projectId").notNull(),
  /** Foreign key to users table (creator) */
  userId: int("userId").notNull(),
  /** Flight name/title */
  name: varchar("name", { length: 255 }).notNull(),
  /** Optional description of the flight */
  description: text("description"),
  /** Date when the drone flight was conducted */
  flightDate: timestamp("flightDate"),
  /** Drone pilot name */
  dronePilot: varchar("dronePilot", { length: 255 }),
  /** FAA License number */
  faaLicenseNumber: varchar("faaLicenseNumber", { length: 100 }),
  /** LAANC Authorization number */
  laancAuthNumber: varchar("laancAuthNumber", { length: 100 }),
  /** Number of media items in the flight */
  mediaCount: int("mediaCount").default(0).notNull(),
  /** Soft delete timestamp — null means active */
  deletedAt: timestamp("deletedAt"),
  /** User ID who deleted this flight */
  deletedBy: int("deletedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Flight = typeof flights.$inferSelect;
export type InsertFlight = typeof flights.$inferInsert;

/**
 * Warranty reminders table for scheduling automated email notifications.
 * Each reminder configuration belongs to a project.
 */
export const warrantyReminders = mysqlTable("warranty_reminders", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to projects table */
  projectId: int("projectId").notNull(),
  /** Foreign key to users table (creator) */
  userId: int("userId").notNull(),
  /** Email address to send reminders to */
  reminderEmail: varchar("reminderEmail", { length: 320 }).notNull(),
  /** Reminder intervals in months (stored as JSON array, e.g., [3, 6, 9]) */
  intervals: varchar("intervals", { length: 100 }).notNull(),
  /** Custom email subject template */
  emailSubject: varchar("emailSubject", { length: 255 }),
  /** Custom email message template */
  emailMessage: text("emailMessage"),
  /** Whether reminders are enabled */
  enabled: mysqlEnum("enabled", ["yes", "no"]).default("yes").notNull(),
  /** Last time a reminder was sent */
  lastSentAt: timestamp("lastSentAt"),
  /** Next scheduled reminder date */
  nextReminderDate: timestamp("nextReminderDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WarrantyReminder = typeof warrantyReminders.$inferSelect;
export type InsertWarrantyReminder = typeof warrantyReminders.$inferInsert;

/**
 * Clients table for organizing projects by client.
 * Clients can be invited to view their own portal with all their projects.
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to users table (owner/admin who created the client) */
  ownerId: int("ownerId").notNull(),
  /** Client company/organization name */
  name: varchar("name", { length: 255 }).notNull(),
  /** Primary contact email for the client */
  contactEmail: varchar("contactEmail", { length: 320 }),
  /** Primary contact name */
  contactName: varchar("contactName", { length: 255 }),
  /** Client phone number */
  phone: varchar("phone", { length: 50 }),
  /** Client address */
  address: text("address"),
  /** Client logo URL */
  logoUrl: varchar("logoUrl", { length: 500 }),
  /** S3 storage key for the logo */
  logoKey: varchar("logoKey", { length: 500 }),
  /** Number of projects assigned to this client */
  projectCount: int("projectCount").default(0).notNull(),
  /** Soft delete timestamp — null means active */
  deletedAt: timestamp("deletedAt"),
  /** User ID who deleted this client */
  deletedBy: int("deletedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Client users table - links users to clients for portal access.
 * Users with client access can view all projects assigned to that client.
 */
export const clientUsers = mysqlTable("client_users", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to clients table */
  clientId: int("clientId").notNull(),
  /** Foreign key to users table */
  userId: int("userId").notNull(),
  /** Role of the user: viewer can only view, user can view/download/upload/create flights, admin can manage client settings */
  role: mysqlEnum("role", ["viewer", "user", "admin"]).default("viewer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClientUser = typeof clientUsers.$inferSelect;
export type InsertClientUser = typeof clientUsers.$inferInsert;

/**
 * Client invitations table - tracks pending invitations to client portals.
 */
export const clientInvitations = mysqlTable("client_invitations", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to clients table */
  clientId: int("clientId").notNull(),
  /** Foreign key to users table (who sent the invitation) */
  invitedBy: int("invitedBy").notNull(),
  /** Email address the invitation was sent to */
  email: varchar("email", { length: 320 }).notNull(),
  /** Unique token for accepting the invitation */
  token: varchar("token", { length: 64 }).notNull().unique(),
  /** Role to assign when invitation is accepted */
  role: mysqlEnum("role", ["viewer", "user", "admin"]).default("viewer").notNull(),
  /** Status of the invitation */
  status: mysqlEnum("status", ["pending", "accepted", "expired", "revoked"]).default("pending").notNull(),
  /** When the invitation expires (7 days from creation) */
  expiresAt: timestamp("expiresAt").notNull(),
  /** When the invitation was accepted (if accepted) */
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClientInvitation = typeof clientInvitations.$inferSelect;
export type InsertClientInvitation = typeof clientInvitations.$inferInsert;

/**
 * Project templates table for saving reusable project configurations.
 * Templates store default values for project fields to speed up project creation.
 */
export const projectTemplates = mysqlTable("project_templates", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to users table (template owner) */
  userId: int("userId").notNull(),
  /** Template name */
  name: varchar("name", { length: 255 }).notNull(),
  /** Template description */
  description: text("description"),
  /** Template category (e.g., "Municipal Infrastructure", "Road Construction") */
  category: varchar("category", { length: 100 }),
  /** Whether this is a system template (pre-built) or user-created */
  isSystem: mysqlEnum("isSystem", ["yes", "no"]).default("no").notNull(),
  /** Template configuration stored as JSON */
  config: text("config").notNull(),
  /** Number of times this template has been used */
  useCount: int("useCount").default(0).notNull(),
  /** Last time this template was used */
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectTemplate = typeof projectTemplates.$inferSelect;
export type InsertProjectTemplate = typeof projectTemplates.$inferInsert;

/**
 * Client project assignments table - tracks which specific projects are assigned to which client users.
 * This allows granular control over project access within a client portal.
 */
export const clientProjectAssignments = mysqlTable("client_project_assignments", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to clients table */
  clientId: int("clientId").notNull(),
  /** Foreign key to users table (the client portal user) */
  userId: int("userId").notNull(),
  /** Foreign key to projects table */
  projectId: int("projectId").notNull(),
  /** Foreign key to users table (admin who assigned the project) */
  assignedBy: int("assignedBy").notNull(),
  /** When the project was assigned */
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
    /** Last time this assignment was updated */
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClientProjectAssignment = typeof clientProjectAssignments.$inferSelect;
export type InsertClientProjectAssignment = typeof clientProjectAssignments.$inferInsert;

/**
 * Project members table - tracks which users have access to which projects and their role.
 * Used for project sharing and collaboration features.
 */
export const projectMembers = mysqlTable("project_members", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to projects table */
  projectId: int("projectId").notNull(),
  /** Foreign key to users table */
  userId: int("userId").notNull(),
  /** Role of the user in this project: owner (full access), vendor (restricted access), viewer (read-only) */
  role: mysqlEnum("role", ["owner", "vendor", "viewer"]).default("viewer").notNull(),
  /** Whether the user can edit project details */
  canEdit: mysqlEnum("canEdit", ["yes", "no"]).default("no").notNull(),
  /** Whether the user can delete media */
  canDeleteMedia: mysqlEnum("canDeleteMedia", ["yes", "no"]).default("no").notNull(),
  /** Whether the user can create flights */
  canCreateFlights: mysqlEnum("canCreateFlights", ["yes", "no"]).default("no").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = typeof projectMembers.$inferInsert;

/**
 * Project overlays table - stores overlay files (PNG/PDF) and their map coordinates for Mapbox display.
 */
export const projectOverlays = mysqlTable("project_overlays", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to projects table */
  projectId: int("projectId").notNull(),
  /** Overlay file URL (PNG/PDF) */
  fileUrl: varchar("fileUrl", { length: 512 }).notNull(),
  /** Overlay opacity for display */
  opacity: decimal("opacity", { precision: 4, scale: 2 }).default("0.5"),
  /** 4 corner GPS coordinates for Mapbox (JSON array) */
  coordinates: json("coordinates").default('[ [0,0],[0,0],[0,0],[0,0] ]'),
  /** Whether overlay is active */
  isActive: int("isActive").default(1),
  /** Overlay label for version history */
  label: varchar("label", { length: 100 }).default("Initial Plan"),
  /** Overlay version number for history */
  version_number: int("version_number").default(1),
  /** Rotation in degrees (0-360) applied when rendering the overlay */
  rotation: decimal("rotation", { precision: 7, scale: 4 }).default("0"),
  /** Original GPS-derived bounding box at upload time — used for Reset to Default */
  originalCoordinates: json("original_coordinates").$type<[number, number][]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectOverlay = typeof projectOverlays.$inferSelect;
export type InsertProjectOverlay = typeof projectOverlays.$inferInsert;

/**
 * Project documents table - stores uploaded documents associated with a project.
 */
export const projectDocuments = mysqlTable("project_documents", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to projects table */
  projectId: int("projectId").notNull(),
  /** Original uploaded filename */
  fileName: varchar("fileName", { length: 255 }).notNull(),
  /** Storage key for the uploaded document */
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  /** Document type or MIME family */
  fileType: varchar("fileType", { length: 50 }).notNull(),
  /** Upload/processing state */
  status: varchar("status", { length: 50 }).default("uploaded"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectDocument = typeof projectDocuments.$inferSelect;
export type InsertProjectDocument = typeof projectDocuments.$inferInsert;


/**
 * Audit log table for tracking significant actions across the system.
 * Records who did what, when, and to which entity.
 */
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  /** The action performed (e.g., "delete", "restore", "create", "update", "role_change") */
  action: varchar("action", { length: 50 }).notNull(),
  /** Type of entity affected (e.g., "project", "client", "media", "flight", "user") */
  entityType: varchar("entityType", { length: 50 }).notNull(),
  /** ID of the affected entity */
  entityId: int("entityId").notNull(),
  /** Human-readable name/label of the affected entity at time of action */
  entityName: varchar("entityName", { length: 255 }),
  /** User ID who performed the action */
  userId: int("userId").notNull(),
  /** User name at time of action (denormalized for history) */
  userName: varchar("userName", { length: 255 }),
  /** Additional details as JSON (e.g., old/new values, reason) */
  details: text("details"),
  /** IP address of the request (optional) */
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;


/**
 * Referrals table - tracks referral invitations sent by users.
 * Stores referee info, status, and links back to the referring user.
 */
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  /** User ID of the person sending the referral */
  referrerId: int("referrerId").notNull(),
  /** Name of the person being referred */
  refereeName: varchar("refereeName", { length: 255 }).notNull(),
  /** Email of the person being referred */
  refereeEmail: varchar("refereeEmail", { length: 255 }).notNull(),
  /** Status of the referral: pending, signed_up, converted (upgraded to paid) */
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  /** Whether the referral email was successfully sent */
  emailSent: boolean("emailSent").default(false).notNull(),
  /** User ID of the referee if they signed up (nullable until they do) */
  refereeUserId: int("refereeUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;
