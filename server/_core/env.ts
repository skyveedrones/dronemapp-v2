import dotenv from "dotenv";
dotenv.config();

function logEnvVar(name: string, value: any) {
  if (value === undefined || value === "") {
    console.error(`\n\u001b[31mERROR: MISSING VARIABLE: ${name}\u001b[0m`);
  } else {
    console.log(`[ENV] ${name}:`, value);
  }
}

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

// Log all ENV variables and warn if missing
logEnvVar("VITE_APP_ID", ENV.appId);
logEnvVar("JWT_SECRET", ENV.cookieSecret);
logEnvVar("DATABASE_URL", ENV.databaseUrl);
logEnvVar("OAUTH_SERVER_URL", ENV.oAuthServerUrl);
logEnvVar("OWNER_OPEN_ID", ENV.ownerOpenId);
logEnvVar("NODE_ENV", process.env.NODE_ENV);
logEnvVar("BUILT_IN_FORGE_API_URL", ENV.forgeApiUrl);
logEnvVar("BUILT_IN_FORGE_API_KEY", ENV.forgeApiKey);
logEnvVar("CLOUDINARY_CLOUD_NAME", ENV.cloudinaryCloudName);
logEnvVar("CLOUDINARY_API_KEY", ENV.cloudinaryApiKey);
logEnvVar("CLOUDINARY_API_SECRET", ENV.cloudinaryApiSecret);
logEnvVar("TEMP_BYPASS_ENABLED", process.env.TEMP_BYPASS_ENABLED);
logEnvVar("ADMIN_SECRET", ENV.adminSecret);
logEnvVar("ALLOWED_ADMIN_EMAILS", process.env.ALLOWED_ADMIN_EMAILS);
logEnvVar("TEMP_BYPASS_EXPIRES_AT", ENV.tempBypassExpiresAt);
