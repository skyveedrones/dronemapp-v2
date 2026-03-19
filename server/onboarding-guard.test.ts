/**
 * Onboarding Guard Logic Tests
 *
 * Tests the business rules for when users should be redirected to /onboarding/pilot.
 * The guard lives in App.tsx (ProtectedRoute component) but the logic can be unit-tested
 * as pure functions here.
 */

import { describe, it, expect } from "vitest";

/**
 * Pure function extracted from the ProtectedRoute onboarding guard logic.
 * Returns true if the user should be redirected to onboarding.
 */
function shouldRedirectToOnboarding(user: {
  organizationId: number | null | undefined;
  role: string | null | undefined;
} | null, currentPath: string): boolean {
  if (!user) return false;
  // Client-role users (portal users) are exempt from onboarding
  if (user.role === "client") return false;
  // Already on onboarding page
  if (currentPath === "/onboarding/pilot") return false;
  // Redirect if no org linked
  return !user.organizationId;
}

describe("Onboarding Guard", () => {
  it("redirects a new pilot (no org) away from /dashboard", () => {
    const user = { organizationId: null, role: "user" };
    expect(shouldRedirectToOnboarding(user, "/dashboard")).toBe(true);
  });

  it("redirects a new pilot (no org) away from /settings", () => {
    const user = { organizationId: null, role: "user" };
    expect(shouldRedirectToOnboarding(user, "/settings")).toBe(true);
  });

  it("does NOT redirect a pilot who already has an org", () => {
    const user = { organizationId: 42, role: "user" };
    expect(shouldRedirectToOnboarding(user, "/dashboard")).toBe(false);
  });

  it("does NOT redirect a client-role user (portal user) without org", () => {
    const user = { organizationId: null, role: "client" };
    expect(shouldRedirectToOnboarding(user, "/portal")).toBe(false);
  });

  it("does NOT redirect when already on /onboarding/pilot", () => {
    const user = { organizationId: null, role: "user" };
    expect(shouldRedirectToOnboarding(user, "/onboarding/pilot")).toBe(false);
  });

  it("does NOT redirect when user is null (unauthenticated)", () => {
    expect(shouldRedirectToOnboarding(null, "/dashboard")).toBe(false);
  });

  it("does NOT redirect an admin with an org", () => {
    const user = { organizationId: 1, role: "admin" };
    expect(shouldRedirectToOnboarding(user, "/dashboard")).toBe(false);
  });

  it("redirects an admin without an org (admins also need onboarding)", () => {
    const user = { organizationId: null, role: "admin" };
    expect(shouldRedirectToOnboarding(user, "/dashboard")).toBe(true);
  });
});
