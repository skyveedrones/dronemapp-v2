export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Validates and normalises the VITE_OAUTH_PORTAL_URL environment variable.
 *
 * - Warns when the variable is missing or empty.
 * - Automatically prepends `https://` when the value has no scheme, so a
 *   bare hostname like `auth.example.com` still produces a valid URL.
 * - Throws a descriptive error (instead of the opaque `TypeError: Invalid URL`)
 *   when the value cannot be turned into a valid URL even after normalisation.
 *
 * @returns A fully-qualified, trailing-slash-free origin string, e.g.
 *          `https://auth.example.com`
 */
const getOauthPortalUrl = (): string => {
  let raw: string = import.meta.env.VITE_OAUTH_PORTAL_URL ?? "";

  if (!raw) {
    console.warn(
      "[const] VITE_OAUTH_PORTAL_URL is not set. " +
        "OAuth login URLs cannot be constructed. " +
        "Set this variable in your Railway environment and redeploy."
    );
    throw new Error(
      "Missing environment variable: VITE_OAUTH_PORTAL_URL is required for authentication."
    );
  }

  // Prepend https:// if the value has no scheme so `new URL()` doesn't throw
  // for bare hostnames like `auth.example.com`.
  if (!/^https?:\/\//i.test(raw)) {
    console.warn(
      `[const] VITE_OAUTH_PORTAL_URL ("${raw}") is missing the https:// prefix. ` +
        "Prepending https:// automatically — update the variable to silence this warning."
    );
    raw = `https://${raw}`;
  }

  try {
    // Validate the final value is a well-formed URL.
    const parsed = new URL(raw);
    // Return just the origin (scheme + host + port) without any trailing path.
    return parsed.origin;
  } catch {
    throw new Error(
      `Invalid VITE_OAUTH_PORTAL_URL: "${raw}" could not be parsed as a URL. ` +
        "Ensure the value is a fully-qualified URL (e.g. https://auth.example.com)."
    );
  }
};

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = getOauthPortalUrl();
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

/**
 * Login URL for client portal users.
 * After OAuth callback, the server reads the `dest` field from the state
 * payload and redirects client-role users to /portal.
 */
export const getPortalLoginUrl = () => {
  const oauthPortalUrl = getOauthPortalUrl();
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  // Encode dest so the OAuth callback can redirect portal users correctly
  const state = btoa(JSON.stringify({ redirectUri, dest: '/portal' }));

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

/**
 * Generate branded login URL with email pre-fill and dashboard redirect.
 * @param email - Email address to pre-fill in OAuth form (login_hint)
 */
export const getBrandedLoginUrl = (email?: string) => {
  const oauthPortalUrl = getOauthPortalUrl();
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  // Encode state with dashboard redirect destination
  const state = btoa(JSON.stringify({ redirectUri, dest: '/dashboard' }));

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  // Add email hint if provided
  if (email && email.trim()) {
    url.searchParams.set("login_hint", email);
  }

  return url.toString();
};
