import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import "dotenv/config";

type Row = Record<string, any>;

const SOURCE_USERS: Row[] = [
  { id: "1", openId: "dev-owner-local", name: "Clay Bechtol", email: "clay@skyveedrones.com", loginMethod: null, role: "webmaster", createdAt: "2026-03-20 03:44:15", updatedAt: "2026-03-22 00:22:57", lastSignedIn: "2026-03-20 03:44:15", logoUrl: null, logoKey: null, watermarkUrl: null, watermarkKey: null, defaultDronePilot: null, defaultFaaLicenseNumber: null, defaultLaancAuthNumber: null, stripeCustomerId: null, stripeSubscriptionId: null, subscriptionTier: "enterprise", subscriptionStatus: "active", billingPeriod: "annual", currentPeriodStart: "2026-03-22 00:22:57", currentPeriodEnd: "2027-03-22 00:22:57", cancelAtPeriodEnd: "no", organization: "SkyVee Drones", passwordHash: null, companyName: "SKyVee", department: null, phone: null, organizationId: "100", orgRole: "ORG_ADMIN" },
  { id: "1560095", openId: "1560095", name: "Clay", email: "claybechtol@gmail.com", loginMethod: "recovery", role: "webmaster", createdAt: "2026-03-21 03:24:48", updatedAt: "2026-03-21 03:24:48", lastSignedIn: "2026-03-21 03:24:48", logoUrl: null, logoKey: null, watermarkUrl: null, watermarkKey: null, defaultDronePilot: null, defaultFaaLicenseNumber: null, defaultLaancAuthNumber: null, stripeCustomerId: null, stripeSubscriptionId: null, subscriptionTier: "enterprise", subscriptionStatus: null, billingPeriod: null, currentPeriodStart: null, currentPeriodEnd: null, cancelAtPeriodEnd: "no", organization: null, passwordHash: null, companyName: null, department: null, phone: null, organizationId: null, orgRole: "ORG_ADMIN" },
  { id: "4560004", openId: "4560004", name: "Tracey Bechtol", email: "TBechtol@forneytx.gov", loginMethod: "recovery", role: "admin", createdAt: "2026-03-21 03:24:48", updatedAt: "2026-03-21 03:24:48", lastSignedIn: "2026-03-21 03:24:48", logoUrl: null, logoKey: null, watermarkUrl: null, watermarkKey: null, defaultDronePilot: null, defaultFaaLicenseNumber: null, defaultLaancAuthNumber: null, stripeCustomerId: null, stripeSubscriptionId: null, subscriptionTier: "free", subscriptionStatus: null, billingPeriod: null, currentPeriodStart: null, currentPeriodEnd: null, cancelAtPeriodEnd: "no", organization: null, passwordHash: null, companyName: null, department: null, phone: null, organizationId: null, orgRole: "ORG_USER" },
  { id: "7920012", openId: "7920012", name: "cmcquiston", email: "cmcquiston@forneytx.gov", loginMethod: "recovery", role: "user", createdAt: "2026-03-21 03:24:48", updatedAt: "2026-03-21 03:24:48", lastSignedIn: "2026-03-21 03:24:48", logoUrl: null, logoKey: null, watermarkUrl: null, watermarkKey: null, defaultDronePilot: null, defaultFaaLicenseNumber: null, defaultLaancAuthNumber: null, stripeCustomerId: null, stripeSubscriptionId: null, subscriptionTier: "free", subscriptionStatus: null, billingPeriod: null, currentPeriodStart: null, currentPeriodEnd: null, cancelAtPeriodEnd: "no", organization: null, passwordHash: null, companyName: null, department: null, phone: null, organizationId: null, orgRole: "ORG_USER" },
  { id: "16050001", openId: "16050001", name: "Mike Rozelle", email: "mrozelle@garlandtx.gov", loginMethod: "recovery", role: "user", createdAt: "2026-03-21 03:32:10", updatedAt: "2026-03-21 03:32:10", lastSignedIn: "2026-03-21 03:32:10", logoUrl: null, logoKey: null, watermarkUrl: null, watermarkKey: null, defaultDronePilot: null, defaultFaaLicenseNumber: null, defaultLaancAuthNumber: null, stripeCustomerId: null, stripeSubscriptionId: null, subscriptionTier: "free", subscriptionStatus: null, billingPeriod: null, currentPeriodStart: null, currentPeriodEnd: null, cancelAtPeriodEnd: "no", organization: null, passwordHash: null, companyName: null, department: null, phone: null, organizationId: null, orgRole: "ORG_USER" },
  { id: "16140001", openId: "16140001", name: "eluna", email: "eluna@forneytx.gov", loginMethod: "recovery", role: "user", createdAt: "2026-03-21 03:24:48", updatedAt: "2026-03-21 03:24:48", lastSignedIn: "2026-03-21 03:24:48", logoUrl: null, logoKey: null, watermarkUrl: null, watermarkKey: null, defaultDronePilot: null, defaultFaaLicenseNumber: null, defaultLaancAuthNumber: null, stripeCustomerId: null, stripeSubscriptionId: null, subscriptionTier: "free", subscriptionStatus: null, billingPeriod: null, currentPeriodStart: null, currentPeriodEnd: null, cancelAtPeriodEnd: "no", organization: null, passwordHash: null, companyName: null, department: null, phone: null, organizationId: null, orgRole: "ORG_USER" },
  { id: "19680001", openId: "Xr6YqEAkBXyf8T3pdNzrMW", name: "Clay Bechtol", email: "clay@skyveedrones.com", loginMethod: "google", role: "webmaster", createdAt: "2026-03-22 00:08:07", updatedAt: "2026-03-22 18:09:31", lastSignedIn: "2026-03-22 18:09:32", logoUrl: null, logoKey: null, watermarkUrl: null, watermarkKey: null, defaultDronePilot: null, defaultFaaLicenseNumber: null, defaultLaancAuthNumber: null, stripeCustomerId: null, stripeSubscriptionId: null, subscriptionTier: "enterprise", subscriptionStatus: "active", billingPeriod: "annual", currentPeriodStart: "2026-03-22 00:22:57", currentPeriodEnd: "2027-03-22 00:22:57", cancelAtPeriodEnd: "no", organization: null, passwordHash: null, companyName: null, department: null, phone: null, organizationId: "100", orgRole: "ORG_ADMIN" },
];

const SOURCE_CLIENTS: Row[] = [
  { id: "330001", ownerId: "1", name: "City of Garland Texas", contactEmail: "MRozelle@garlandtx.gov", contactName: "Mike Rozelle", phone: "972-205-2174", address: "800 Main Street\nGarland, TX 75040", logoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/clients/330001/logo-eHuKTdWLLQn9bWhySltvX.PNG", logoKey: "clients/330001/logo-eHuKTdWLLQn9bWhySltvX.PNG", projectCount: "1", createdAt: "2026-02-28 09:47:09", updatedAt: "2026-03-20 23:24:48", deletedAt: null, deletedBy: null },
  { id: "4560004", ownerId: "1", name: "Forney TX Municipal", contactEmail: "tbechtol@forneytx.gov", contactName: "Tracey Bechtol", phone: "9725526579", address: null, logoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/clients/4560004/logo-fQde4RB-UzAgnvneQ7BMS.png", logoKey: "clients/4560004/logo-fQde4RB-UzAgnvneQ7BMS.png", projectCount: "6", createdAt: "2026-03-11 20:13:23", updatedAt: "2026-03-20 23:24:48", deletedAt: null, deletedBy: null },
  { id: "4590005", ownerId: "1", name: "SkyVee Aerial Drone Services", contactEmail: null, contactName: "Demo Projects", phone: null, address: null, logoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/clients/4590005/logo-gsqVKqMbg_E0JWUfOJ9Rb.png", logoKey: "clients/4590005/logo-gsqVKqMbg_E0JWUfOJ9Rb.png", projectCount: "2", createdAt: "2026-03-14 04:10:10", updatedAt: "2026-03-20 23:24:48", deletedAt: null, deletedBy: null },
];

const SOURCE_PROJECTS: Row[] = [
  { id: "1", userId: "1", name: "Project 1", description: null, location: null, clientName: null, status: "active", flightDate: null, coverImage: null, mediaCount: "14", createdAt: "2026-03-20 23:05:18", updatedAt: "2026-03-20 23:24:47", warrantyStartDate: null, warrantyEndDate: null, logoUrl: null, logoKey: null, clientId: null, dronePilot: null, faaLicenseNumber: null, laancAuthNumber: null, organizationId: null, deletedAt: null, deletedBy: null, isPinned: "0" },
  { id: "30001", userId: "1", name: "30001", description: null, location: null, clientName: null, status: "active", flightDate: null, coverImage: null, mediaCount: "32", createdAt: "2026-03-20 23:05:18", updatedAt: "2026-03-20 23:24:47", warrantyStartDate: null, warrantyEndDate: null, logoUrl: null, logoKey: null, clientId: null, dronePilot: null, faaLicenseNumber: null, laancAuthNumber: null, organizationId: null, deletedAt: null, deletedBy: null, isPinned: "0" },
  { id: "30002", userId: "1", name: "Gail Wilson", description: null, location: null, clientName: null, status: "active", flightDate: null, coverImage: null, mediaCount: "19", createdAt: "2026-03-20 23:03:32", updatedAt: "2026-03-20 23:24:47", warrantyStartDate: null, warrantyEndDate: null, logoUrl: null, logoKey: null, clientId: null, dronePilot: null, faaLicenseNumber: null, laancAuthNumber: null, organizationId: null, deletedAt: null, deletedBy: null, isPinned: "0" },
  { id: "30003", userId: "1", name: "30003", description: null, location: null, clientName: null, status: "active", flightDate: null, coverImage: null, mediaCount: "13", createdAt: "2026-03-20 23:05:18", updatedAt: "2026-03-20 23:24:47", warrantyStartDate: null, warrantyEndDate: null, logoUrl: null, logoKey: null, clientId: null, dronePilot: null, faaLicenseNumber: null, laancAuthNumber: null, organizationId: null, deletedAt: null, deletedBy: null, isPinned: "0" },
  { id: "60001", userId: "1", name: "60001", description: null, location: null, clientName: null, status: "active", flightDate: null, coverImage: null, mediaCount: "4", createdAt: "2026-03-20 23:05:18", updatedAt: "2026-03-20 23:24:47", warrantyStartDate: null, warrantyEndDate: null, logoUrl: null, logoKey: null, clientId: null, dronePilot: null, faaLicenseNumber: null, laancAuthNumber: null, organizationId: null, deletedAt: null, deletedBy: null, isPinned: "0" },
  { id: "90004", userId: "1", name: "90004", description: null, location: null, clientName: null, status: "active", flightDate: null, coverImage: null, mediaCount: "12", createdAt: "2026-03-20 23:05:18", updatedAt: "2026-03-20 23:24:47", warrantyStartDate: null, warrantyEndDate: null, logoUrl: null, logoKey: null, clientId: null, dronePilot: null, faaLicenseNumber: null, laancAuthNumber: null, organizationId: null, deletedAt: null, deletedBy: null, isPinned: "0" },
  { id: "420001", userId: "1", name: "420001", description: null, location: null, clientName: null, status: "active", flightDate: null, coverImage: null, mediaCount: "34", createdAt: "2026-03-20 23:05:18", updatedAt: "2026-03-20 23:24:47", warrantyStartDate: null, warrantyEndDate: null, logoUrl: null, logoKey: null, clientId: null, dronePilot: null, faaLicenseNumber: null, laancAuthNumber: null, organizationId: null, deletedAt: null, deletedBy: null, isPinned: "0" },
  { id: "540001", userId: "1", name: "540001", description: null, location: null, clientName: null, status: "active", flightDate: null, coverImage: null, mediaCount: "99", createdAt: "2026-03-20 23:05:18", updatedAt: "2026-03-20 23:24:47", warrantyStartDate: null, warrantyEndDate: null, logoUrl: null, logoKey: null, clientId: null, dronePilot: null, faaLicenseNumber: null, laancAuthNumber: null, organizationId: null, deletedAt: null, deletedBy: null, isPinned: "0" },
  { id: "750001", userId: "1", name: "750001", description: null, location: null, clientName: null, status: "active", flightDate: null, coverImage: null, mediaCount: "260", createdAt: "2026-03-20 23:05:18", updatedAt: "2026-03-20 23:24:47", warrantyStartDate: null, warrantyEndDate: null, logoUrl: null, logoKey: null, clientId: null, dronePilot: null, faaLicenseNumber: null, laancAuthNumber: null, organizationId: null, deletedAt: null, deletedBy: null, isPinned: "0" },
  { id: "1020001", userId: "1", name: "Holford Road Project", description: null, location: null, clientName: null, status: "active", flightDate: null, coverImage: null, mediaCount: "98", createdAt: "2026-03-20 03:44:19", updatedAt: "2026-03-21 03:32:10", warrantyStartDate: null, warrantyEndDate: null, logoUrl: null, logoKey: null, clientId: "330001", dronePilot: null, faaLicenseNumber: null, laancAuthNumber: null, organizationId: "100", deletedAt: null, deletedBy: null, isPinned: "0" },
];

const SOURCE_FLIGHTS: Row[] = [
  { id: "150001", projectId: "30001", userId: "1", name: "Re map", description: "Remap assets", flightDate: "2026-02-02 00:00:00", mediaCount: "1", createdAt: "2026-02-02 14:23:27", updatedAt: "2026-02-02 14:23:57", dronePilot: "Edward Clay Bechtol", faaLicenseNumber: "5205636", laancAuthNumber: "LAANC-2025-001", deletedAt: null, deletedBy: null },
  { id: "180001", projectId: "1", userId: "1", name: "Downtown Survey Flight", description: "High-altitude survey of downtown area", flightDate: "2026-02-01 00:00:00", mediaCount: "4", createdAt: "2026-02-06 19:14:04", updatedAt: "2026-02-07 04:29:01", dronePilot: "Joe Pilot", faaLicenseNumber: "111111", laancAuthNumber: "LAANC 111", deletedAt: null, deletedBy: null },
];

const SOURCE_CLIENT_USERS: Row[] = [
  { id: "330010", clientId: "4560004", userId: "4560004", role: "admin", createdAt: "2026-03-11 21:24:49" },
  { id: "390001", clientId: "1", userId: "1560095", role: "admin", createdAt: "2026-03-15 21:33:31" },
  { id: "390002", clientId: "30001", userId: "1560095", role: "admin", createdAt: "2026-03-15 21:33:31" },
  { id: "390003", clientId: "4560004", userId: "16140001", role: "user", createdAt: "2026-03-15 22:18:56" },
  { id: "420002", clientId: "4560004", userId: "7920012", role: "user", createdAt: "2026-03-16 01:01:17" },
  { id: "450001", clientId: "330001", userId: "16050001", role: "admin", createdAt: "2026-03-21 03:32:10" },
];

function normalize(v: any): any {
  if (v === undefined || v === null) return null;
  if (typeof v === "string") {
    if (v === "NULL") return null;
    return v;
  }
  return v;
}

function toInt(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function boolInt(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n ? 1 : 0;
}

function mapUserRole(v: any): "user" | "admin" {
  const role = String(v ?? "").toLowerCase();
  if (role === "admin" || role === "webmaster") return "admin";
  return "user";
}

function optionalFk(v: any): number | null {
  const n = toInt(v);
  if (n === null || n <= 0) return null;
  return n;
}

async function parseMediaRaw(filePath: string): Promise<Row[]> {
  const raw = await fs.readFile(filePath, "utf8");
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("Could not locate JSON array in media raw export");
  }
  const json = raw.slice(start, end + 1);
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("Media payload is not an array");
  return parsed;
}

async function getCount(conn: mysql.Connection, table: string): Promise<number> {
  const [rows] = await conn.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
  return Number((rows as any[])[0]?.c ?? 0);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const mediaRawPath = path.join(process.cwd(), ".tmp-source-media-raw.txt");
  const mediaRows = await parseMediaRaw(mediaRawPath);

  const conn = await mysql.createConnection({
    uri: databaseUrl,
    ssl: { rejectUnauthorized: false },
    multipleStatements: false,
  });

  const report: any = {
    startedAt: new Date().toISOString(),
    imported: {
      users: 0,
      clients: 0,
      projects: 0,
      flights: 0,
      media: 0,
      client_users: 0,
    },
    skippedClientUsers: 0,
    countsBefore: {},
    countsAfter: {},
    finishedAt: null,
  };

  for (const t of ["users", "clients", "projects", "flights", "media", "client_users"]) {
    report.countsBefore[t] = await getCount(conn, t);
  }

  await conn.beginTransaction();
  try {
    await conn.query(
      `INSERT INTO organizations (id, name, subscriptionTier, type)
       VALUES (100, 'SkyVee', 'professional', 'drone_service_provider')
       ON DUPLICATE KEY UPDATE
         name = COALESCE(VALUES(name), name),
         subscriptionTier = COALESCE(VALUES(subscriptionTier), subscriptionTier),
         type = COALESCE(VALUES(type), type)`
    );

    for (const u of SOURCE_USERS) {
      await conn.query(
        `INSERT INTO users
          (id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn, logoUrl, logoKey, watermarkUrl, watermarkKey, defaultDronePilot, defaultFaaLicenseNumber, defaultLaancAuthNumber, stripeCustomerId, stripeSubscriptionId, subscriptionTier, subscriptionStatus, billingPeriod, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, organization, passwordHash, companyName, department, phone, organizationId, orgRole)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           openId = COALESCE(VALUES(openId), openId),
           name = COALESCE(VALUES(name), name),
           email = COALESCE(VALUES(email), email),
           loginMethod = COALESCE(VALUES(loginMethod), loginMethod),
           role = COALESCE(VALUES(role), role),
           updatedAt = COALESCE(VALUES(updatedAt), updatedAt),
           lastSignedIn = COALESCE(VALUES(lastSignedIn), lastSignedIn),
           logoUrl = COALESCE(VALUES(logoUrl), logoUrl),
           logoKey = COALESCE(VALUES(logoKey), logoKey),
           watermarkUrl = COALESCE(VALUES(watermarkUrl), watermarkUrl),
           watermarkKey = COALESCE(VALUES(watermarkKey), watermarkKey),
           defaultDronePilot = COALESCE(VALUES(defaultDronePilot), defaultDronePilot),
           defaultFaaLicenseNumber = COALESCE(VALUES(defaultFaaLicenseNumber), defaultFaaLicenseNumber),
           defaultLaancAuthNumber = COALESCE(VALUES(defaultLaancAuthNumber), defaultLaancAuthNumber),
           stripeCustomerId = COALESCE(VALUES(stripeCustomerId), stripeCustomerId),
           stripeSubscriptionId = COALESCE(VALUES(stripeSubscriptionId), stripeSubscriptionId),
           subscriptionTier = COALESCE(VALUES(subscriptionTier), subscriptionTier),
           subscriptionStatus = COALESCE(VALUES(subscriptionStatus), subscriptionStatus),
           billingPeriod = COALESCE(VALUES(billingPeriod), billingPeriod),
           currentPeriodStart = COALESCE(VALUES(currentPeriodStart), currentPeriodStart),
           currentPeriodEnd = COALESCE(VALUES(currentPeriodEnd), currentPeriodEnd),
           cancelAtPeriodEnd = COALESCE(VALUES(cancelAtPeriodEnd), cancelAtPeriodEnd),
           organization = COALESCE(VALUES(organization), organization),
           passwordHash = COALESCE(VALUES(passwordHash), passwordHash),
           companyName = COALESCE(VALUES(companyName), companyName),
           department = COALESCE(VALUES(department), department),
           phone = COALESCE(VALUES(phone), phone),
           organizationId = COALESCE(VALUES(organizationId), organizationId),
           orgRole = COALESCE(VALUES(orgRole), orgRole)`,
        [
          toInt(u.id), normalize(u.openId), normalize(u.name), normalize(u.email), normalize(u.loginMethod), mapUserRole(u.role),
          normalize(u.createdAt), normalize(u.updatedAt), normalize(u.lastSignedIn), normalize(u.logoUrl), normalize(u.logoKey),
          normalize(u.watermarkUrl), normalize(u.watermarkKey), normalize(u.defaultDronePilot), normalize(u.defaultFaaLicenseNumber),
          normalize(u.defaultLaancAuthNumber), normalize(u.stripeCustomerId), normalize(u.stripeSubscriptionId), normalize(u.subscriptionTier),
          normalize(u.subscriptionStatus), normalize(u.billingPeriod), normalize(u.currentPeriodStart), normalize(u.currentPeriodEnd),
          normalize(u.cancelAtPeriodEnd), normalize(u.organization), normalize(u.passwordHash), normalize(u.companyName), normalize(u.department),
          normalize(u.phone), toInt(u.organizationId), normalize(u.orgRole),
        ]
      );
      report.imported.users++;
    }

    for (const c of SOURCE_CLIENTS) {
      await conn.query(
        `INSERT INTO clients
          (id, ownerId, name, contactEmail, contactName, phone, address, logoUrl, logoKey, projectCount, createdAt, updatedAt, deletedAt, deletedBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           ownerId = COALESCE(VALUES(ownerId), ownerId),
           name = COALESCE(VALUES(name), name),
           contactEmail = COALESCE(VALUES(contactEmail), contactEmail),
           contactName = COALESCE(VALUES(contactName), contactName),
           phone = COALESCE(VALUES(phone), phone),
           address = COALESCE(VALUES(address), address),
           logoUrl = COALESCE(VALUES(logoUrl), logoUrl),
           logoKey = COALESCE(VALUES(logoKey), logoKey),
           projectCount = COALESCE(VALUES(projectCount), projectCount),
           updatedAt = COALESCE(VALUES(updatedAt), updatedAt),
           deletedAt = COALESCE(VALUES(deletedAt), deletedAt),
           deletedBy = COALESCE(VALUES(deletedBy), deletedBy)`,
        [
          toInt(c.id), toInt(c.ownerId), normalize(c.name), normalize(c.contactEmail), normalize(c.contactName), normalize(c.phone),
          normalize(c.address), normalize(c.logoUrl), normalize(c.logoKey), toInt(c.projectCount), normalize(c.createdAt),
          normalize(c.updatedAt), normalize(c.deletedAt), toInt(c.deletedBy),
        ]
      );
      report.imported.clients++;
    }

    for (const p of SOURCE_PROJECTS) {
      await conn.query(
        `INSERT INTO projects
          (id, userId, name, description, location, clientName, status, flightDate, coverImage, mediaCount, createdAt, updatedAt, warrantyStartDate, warrantyEndDate, logoUrl, logoKey, clientId, dronePilot, faaLicenseNumber, laancAuthNumber, organizationId, isPinned, deletedAt, deletedBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           userId = COALESCE(VALUES(userId), userId),
           name = COALESCE(VALUES(name), name),
           description = COALESCE(VALUES(description), description),
           location = COALESCE(VALUES(location), location),
           clientName = COALESCE(VALUES(clientName), clientName),
           status = COALESCE(VALUES(status), status),
           flightDate = COALESCE(VALUES(flightDate), flightDate),
           coverImage = COALESCE(VALUES(coverImage), coverImage),
           mediaCount = COALESCE(VALUES(mediaCount), mediaCount),
           updatedAt = COALESCE(VALUES(updatedAt), updatedAt),
           warrantyStartDate = COALESCE(VALUES(warrantyStartDate), warrantyStartDate),
           warrantyEndDate = COALESCE(VALUES(warrantyEndDate), warrantyEndDate),
           logoUrl = COALESCE(VALUES(logoUrl), logoUrl),
           logoKey = COALESCE(VALUES(logoKey), logoKey),
           clientId = COALESCE(VALUES(clientId), NULLIF(clientId, 0)),
           dronePilot = COALESCE(VALUES(dronePilot), dronePilot),
           faaLicenseNumber = COALESCE(VALUES(faaLicenseNumber), faaLicenseNumber),
           laancAuthNumber = COALESCE(VALUES(laancAuthNumber), laancAuthNumber),
           organizationId = COALESCE(VALUES(organizationId), organizationId),
           isPinned = COALESCE(VALUES(isPinned), isPinned),
           deletedAt = COALESCE(VALUES(deletedAt), deletedAt),
           deletedBy = COALESCE(VALUES(deletedBy), deletedBy)`,
        [
          toInt(p.id), toInt(p.userId), normalize(p.name), normalize(p.description), normalize(p.location), normalize(p.clientName),
          normalize(p.status), normalize(p.flightDate), normalize(p.coverImage), toInt(p.mediaCount), normalize(p.createdAt),
          normalize(p.updatedAt), normalize(p.warrantyStartDate), normalize(p.warrantyEndDate), normalize(p.logoUrl), normalize(p.logoKey),
          optionalFk(p.clientId), normalize(p.dronePilot), normalize(p.faaLicenseNumber), normalize(p.laancAuthNumber), toInt(p.organizationId),
          boolInt(p.isPinned), normalize(p.deletedAt), toInt(p.deletedBy),
        ]
      );
      report.imported.projects++;
    }

    for (const f of SOURCE_FLIGHTS) {
      await conn.query(
        `INSERT INTO flights
          (id, projectId, userId, name, description, flightDate, mediaCount, createdAt, updatedAt, dronePilot, faaLicenseNumber, laancAuthNumber, deletedAt, deletedBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           projectId = COALESCE(VALUES(projectId), projectId),
           userId = COALESCE(VALUES(userId), userId),
           name = COALESCE(VALUES(name), name),
           description = COALESCE(VALUES(description), description),
           flightDate = COALESCE(VALUES(flightDate), flightDate),
           mediaCount = COALESCE(VALUES(mediaCount), mediaCount),
           updatedAt = COALESCE(VALUES(updatedAt), updatedAt),
           dronePilot = COALESCE(VALUES(dronePilot), dronePilot),
           faaLicenseNumber = COALESCE(VALUES(faaLicenseNumber), faaLicenseNumber),
           laancAuthNumber = COALESCE(VALUES(laancAuthNumber), laancAuthNumber),
           deletedAt = COALESCE(VALUES(deletedAt), deletedAt),
           deletedBy = COALESCE(VALUES(deletedBy), deletedBy)`,
        [
          toInt(f.id), toInt(f.projectId), toInt(f.userId), normalize(f.name), normalize(f.description), normalize(f.flightDate),
          toInt(f.mediaCount), normalize(f.createdAt), normalize(f.updatedAt), normalize(f.dronePilot), normalize(f.faaLicenseNumber),
          normalize(f.laancAuthNumber), normalize(f.deletedAt), toInt(f.deletedBy),
        ]
      );
      report.imported.flights++;
    }

    for (const m of mediaRows) {
      await conn.query(
        `INSERT INTO media
          (id, projectId, userId, filename, fileKey, url, mimeType, fileSize, mediaType, latitude, longitude, altitude, capturedAt, cameraMake, cameraModel, thumbnailUrl, createdAt, updatedAt, flightId, notes, priority, thumbnailKey, originalWidth, originalHeight, thumbnailWidth, thumbnailHeight, isHighResolution, highResUrl, highResKey, highResFileSize, duration, resolution, frameRate, telemetryPath, uploadSessionId, processingStatus, processingError, transcodedUrl, transcodedKey, transcodeStatus, transcodeError, videoCodec, deletedAt, deletedBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           projectId = COALESCE(VALUES(projectId), projectId),
           userId = COALESCE(VALUES(userId), userId),
           filename = COALESCE(VALUES(filename), filename),
           fileKey = COALESCE(VALUES(fileKey), fileKey),
           url = COALESCE(VALUES(url), url),
           mimeType = COALESCE(VALUES(mimeType), mimeType),
           fileSize = COALESCE(VALUES(fileSize), fileSize),
           mediaType = COALESCE(VALUES(mediaType), mediaType),
           latitude = COALESCE(VALUES(latitude), latitude),
           longitude = COALESCE(VALUES(longitude), longitude),
           altitude = COALESCE(VALUES(altitude), altitude),
           capturedAt = COALESCE(VALUES(capturedAt), capturedAt),
           cameraMake = COALESCE(VALUES(cameraMake), cameraMake),
           cameraModel = COALESCE(VALUES(cameraModel), cameraModel),
           thumbnailUrl = COALESCE(VALUES(thumbnailUrl), thumbnailUrl),
           updatedAt = COALESCE(VALUES(updatedAt), updatedAt),
           flightId = COALESCE(VALUES(flightId), NULLIF(flightId, 0)),
           notes = COALESCE(VALUES(notes), notes),
           priority = COALESCE(VALUES(priority), priority),
           thumbnailKey = COALESCE(VALUES(thumbnailKey), thumbnailKey),
           originalWidth = COALESCE(VALUES(originalWidth), originalWidth),
           originalHeight = COALESCE(VALUES(originalHeight), originalHeight),
           thumbnailWidth = COALESCE(VALUES(thumbnailWidth), thumbnailWidth),
           thumbnailHeight = COALESCE(VALUES(thumbnailHeight), thumbnailHeight),
           isHighResolution = COALESCE(VALUES(isHighResolution), isHighResolution),
           highResUrl = COALESCE(VALUES(highResUrl), highResUrl),
           highResKey = COALESCE(VALUES(highResKey), highResKey),
           highResFileSize = COALESCE(VALUES(highResFileSize), highResFileSize),
           duration = COALESCE(VALUES(duration), duration),
           resolution = COALESCE(VALUES(resolution), resolution),
           frameRate = COALESCE(VALUES(frameRate), frameRate),
           telemetryPath = COALESCE(VALUES(telemetryPath), telemetryPath),
           uploadSessionId = COALESCE(VALUES(uploadSessionId), uploadSessionId),
           processingStatus = COALESCE(VALUES(processingStatus), processingStatus),
           processingError = COALESCE(VALUES(processingError), processingError),
           transcodedUrl = COALESCE(VALUES(transcodedUrl), transcodedUrl),
           transcodedKey = COALESCE(VALUES(transcodedKey), transcodedKey),
           transcodeStatus = COALESCE(VALUES(transcodeStatus), transcodeStatus),
           transcodeError = COALESCE(VALUES(transcodeError), transcodeError),
           videoCodec = COALESCE(VALUES(videoCodec), videoCodec),
           deletedAt = COALESCE(VALUES(deletedAt), deletedAt),
           deletedBy = COALESCE(VALUES(deletedBy), deletedBy)`,
        [
          toInt(m.id), toInt(m.projectId), toInt(m.userId), normalize(m.filename), normalize(m.fileKey), normalize(m.url), normalize(m.mimeType),
          toInt(m.fileSize), normalize(m.mediaType), normalize(m.latitude), normalize(m.longitude), normalize(m.altitude), normalize(m.capturedAt),
          normalize(m.cameraMake), normalize(m.cameraModel), normalize(m.thumbnailUrl), normalize(m.createdAt), normalize(m.updatedAt),
          optionalFk(m.flightId), normalize(m.notes), normalize(m.priority), normalize(m.thumbnailKey), toInt(m.originalWidth), toInt(m.originalHeight),
          toInt(m.thumbnailWidth), toInt(m.thumbnailHeight), boolInt(m.isHighResolution), normalize(m.highResUrl), normalize(m.highResKey),
          toInt(m.highResFileSize), normalize(m.duration), normalize(m.resolution), normalize(m.frameRate), normalize(m.telemetryPath),
          normalize(m.uploadSessionId), normalize(m.processingStatus), normalize(m.processingError), normalize(m.transcodedUrl),
          normalize(m.transcodedKey), normalize(m.transcodeStatus), normalize(m.transcodeError), normalize(m.videoCodec), normalize(m.deletedAt), toInt(m.deletedBy),
        ]
      );
      report.imported.media++;
    }

    const [usersRows] = await conn.query("SELECT id FROM users");
    const [clientsRows] = await conn.query("SELECT id FROM clients");
    const userSet = new Set((usersRows as any[]).map((r) => Number(r.id)));
    const clientSet = new Set((clientsRows as any[]).map((r) => Number(r.id)));

    for (const cu of SOURCE_CLIENT_USERS) {
      const uid = toInt(cu.userId);
      const cid = toInt(cu.clientId);
      if (!uid || !cid || !userSet.has(uid) || !clientSet.has(cid)) {
        report.skippedClientUsers++;
        continue;
      }

      await conn.query(
        `INSERT INTO client_users (id, clientId, userId, role, createdAt)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           role = COALESCE(VALUES(role), role),
           createdAt = COALESCE(VALUES(createdAt), createdAt)`,
        [toInt(cu.id), cid, uid, normalize(cu.role), normalize(cu.createdAt)]
      );
      report.imported.client_users++;
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  }

  for (const t of ["users", "clients", "projects", "flights", "media", "client_users"]) {
    report.countsAfter[t] = await getCount(conn, t);
  }

  await conn.end();

  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(process.cwd(), ".tmp-merge-import-report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log("WROTE .tmp-merge-import-report.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
