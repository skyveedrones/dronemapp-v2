import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { sql } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

async function resolveUserByEmail(email: string): Promise<{ openId: string; name: string } | null> {
  const dbConn = await db.getDb();
  if (!dbConn) return null;

  const rs = await dbConn.execute(sql`
    SELECT openId, name, role
    FROM users
    WHERE LOWER(email) = LOWER(${email})
    ORDER BY
      CASE role
        WHEN 'webmaster' THEN 0
        WHEN 'admin' THEN 1
        ELSE 2
      END,
      id ASC
    LIMIT 1
  `) as unknown as [Array<{ openId?: string | null; name?: string | null }>, unknown];

  const row = rs?.[0]?.[0];
  if (!row?.openId) return null;
  return {
    openId: row.openId,
    name: row.name || email.split("@")[0],
  };
}

export function registerOAuthRoutes(app: Express) {
  // ─── Local development bypass ────────────────────────────────────────────
  // This endpoint is ONLY registered when NODE_ENV !== "production".
  // It creates a session directly from an email address without going through
  // Manus OAuth, so local development doesn't require network access to auth.manus.im.
  if (!ENV.isProduction) {
    app.post("/api/auth/dev-login", async (req: Request, res: Response) => {
      const email =
        typeof req.body?.email === "string" ? req.body.email.trim() : "";
      try {
        let openId = "dev-owner-local";
        let name = email ? email.split("@")[0] : "Dev User";

        // Prefer the real user row when email is available so local login reflects
        // correct name/role/subscription in Account and dashboard.
        if (email) {
          const dbConn = await db.getDb();
          if (dbConn) {
            const rs = await dbConn.execute(sql`
              SELECT openId, name, role
              FROM users
              WHERE email = ${email}
              ORDER BY
                CASE role
                  WHEN 'webmaster' THEN 0
                  WHEN 'admin' THEN 1
                  ELSE 2
                END,
                id ASC
              LIMIT 1
            `) as unknown as [Array<{ openId?: string | null; name?: string | null; role?: string | null }>, unknown];
            const row = rs?.[0]?.[0];
            if (row?.openId) {
              openId = row.openId;
              name = row.name || name;
            }
          }
        }

        const sessionToken = await sdk.createSessionToken(openId, {
          name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });
        res.json({ ok: true, redirect: "/dashboard" });
      } catch (error) {
        console.error("[DevLogin] Failed", error);
        res.status(500).json({ error: "Dev login failed" });
      }
    });
  }

  // Production emergency bypass: explicitly enabled only via env.
  // Requires both a shared secret and email allowlist membership.
  if (ENV.tempBypassEnabled) {
    app.post("/api/auth/temp-login", async (req: Request, res: Response) => {
      const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
      const providedSecret = typeof req.body?.secret === "string" ? req.body.secret : "";

      if (ENV.tempBypassExpiresAt) {
        const expiresAt = new Date(ENV.tempBypassExpiresAt);
        if (Number.isNaN(expiresAt.getTime())) {
          return res.status(500).json({ error: "TEMP_BYPASS_EXPIRES_AT is invalid" });
        }
        if (Date.now() > expiresAt.getTime()) {
          return res.status(403).json({ error: "Temporary bypass has expired" });
        }
      }

      if (!email || !providedSecret) {
        return res.status(400).json({ error: "email and secret are required" });
      }

      if (!ENV.adminSecret || providedSecret !== ENV.adminSecret) {
        return res.status(401).json({ error: "Invalid access code" });
      }

      if (ENV.allowedAdminEmails.length > 0 && !ENV.allowedAdminEmails.includes(email.toLowerCase())) {
        return res.status(403).json({ error: "Email not allowlisted for temporary bypass" });
      }

      try {
        const resolved = await resolveUserByEmail(email);
        if (!resolved) {
          return res.status(404).json({ error: "User account not found for email" });
        }

        const sessionToken = await sdk.createSessionToken(resolved.openId, {
          name: resolved.name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return res.json({ ok: true, redirect: "/dashboard" });
      } catch (error) {
        console.error("[TempBypass] Failed", error);
        return res.status(500).json({ error: "Temporary bypass login failed" });
      }
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // Fetch the user record to determine role for redirect
      const dbUser = await db.getUserByOpenId(userInfo.openId);

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Parse optional dest field from state payload (set by getPortalLoginUrl)
      let destFromState: string | null = null;
      try {
        const decoded = Buffer.from(state, 'base64').toString('utf8');
        const parsed = JSON.parse(decoded);
        if (parsed && typeof parsed.dest === 'string' && parsed.dest.startsWith('/')) {
          destFromState = parsed.dest;
        }
      } catch {
        // state is a plain base64 string (legacy getLoginUrl) — ignore
      }
      // Priority: explicit dest in state > role-based default
      const redirectTo = destFromState ?? (dbUser?.role === 'client' ? '/portal' : '/');
      res.redirect(302, redirectTo);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
