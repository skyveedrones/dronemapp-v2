import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  tempBypassEnabled: (process.env.TEMP_BYPASS_ENABLED ?? "false").toLowerCase() === "true",
  adminSecret: process.env.ADMIN_SECRET ?? "",
  allowedAdminEmails: (process.env.ALLOWED_ADMIN_EMAILS ?? "")
    .split(",")
    .map(v => v.trim().toLowerCase())
    .filter(Boolean),
  tempBypassExpiresAt: process.env.TEMP_BYPASS_EXPIRES_AT ?? "",
};
