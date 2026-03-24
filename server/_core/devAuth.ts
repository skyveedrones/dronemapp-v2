/**
 * Dev-only auth bypass routes.
 * Registered in development mode only — no-op in production.
 * Provides:
 *   GET  /app-auth         → redirect to /login (bypasses the OAuth portal page)
 *   POST /api/dev-login    → create a session cookie for the dev owner and return { success, redirect }
 */
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { sql } from "drizzle-orm";
import * as db from "../db";
import { sdk } from "./sdk";
import { getSessionCookieOptions } from "./cookies";

export function registerDevAuthRoutes(app: Express) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  // Redirect the OAuth portal page back to the standard login UI
  app.get("/app-auth", (_req: Request, res: Response) => {
    res.redirect(302, "/login");
  });

  // Prefer resolving to an existing user by email for accurate local account identity.
  app.post("/api/dev-login", async (req: Request, res: Response) => {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
      let resolvedOpenId = "dev-owner-local";
      let resolvedName = email ? email.split("@")[0] : "Dev Owner";

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
            resolvedOpenId = row.openId;
            resolvedName = row.name || resolvedName;
          }
        }
      }

      const sessionToken = await sdk.createSessionToken(resolvedOpenId, {
        name: resolvedName,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, redirect: "/dashboard", openId: resolvedOpenId });
    } catch (error) {
      console.error("[DevAuth] Failed to create dev session", error);
      res.status(500).json({ success: false, error: "Failed to create dev session" });
    }
  });
}
