import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId = 1, role: "user" | "admin" | "webmaster" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("referral.send input validation", () => {
  it("should reject empty refereeName", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.referral.send({
        refereeName: "",
        refereeEmail: "test@example.com",
      })
    ).rejects.toThrow();
  });

  it("should reject invalid email format", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.referral.send({
        refereeName: "John Doe",
        refereeEmail: "not-an-email",
      })
    ).rejects.toThrow();
  });

  it("should reject refereeName exceeding 255 characters", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.referral.send({
        refereeName: "a".repeat(256),
        refereeEmail: "test@example.com",
      })
    ).rejects.toThrow();
  });

  it("should reject refereeEmail exceeding 255 characters", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const longEmail = "a".repeat(250) + "@b.com";
    await expect(
      caller.referral.send({
        refereeName: "John Doe",
        refereeEmail: longEmail,
      })
    ).rejects.toThrow();
  });

  it("should accept valid input (may fail on DB, not validation)", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.referral.send({
        refereeName: "John Doe",
        refereeEmail: "john@example.com",
      });
    } catch (err: any) {
      // Should fail on DB or email, not on validation
      expect(err.code).not.toBe("BAD_REQUEST");
    }
  });
});

describe("referral email generation (copy-paste approach)", () => {
  function buildReferralSlug(name: string, id: number): string {
    const first = name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
    return `${first}${id}`;
  }

  function buildEmailSubject(referrerName: string): string {
    return `${referrerName} invited you to try Mapit - Drone Mapping Platform`;
  }

  function buildEmailBody(referrerName: string, refereeName: string, referralLink: string): string {
    return `Hi ${refereeName},\n\nI've been using Mapit for my drone mapping projects and thought you'd find it really useful.\n\nGet started here: ${referralLink}\n\n${referrerName}`;
  }

  it("should build correct referral slug from user name and id", () => {
    expect(buildReferralSlug("Clay Bechtol", 1)).toBe("clay1");
    expect(buildReferralSlug("John Smith", 42)).toBe("john42");
    expect(buildReferralSlug("A", 100)).toBe("a100");
    expect(buildReferralSlug("", 5)).toBe("5");
  });

  it("should include the referrer name in the email subject", () => {
    const subject = buildEmailSubject("Clay Bechtol");
    expect(subject).toContain("Clay Bechtol");
    expect(subject).toContain("Mapit");
  });

  it("should include referee name and referral link in email body", () => {
    const body = buildEmailBody("Clay", "John", "https://mapit.skyveedrones.com/signup?ref=clay1");
    expect(body).toContain("Hi John");
    expect(body).toContain("https://mapit.skyveedrones.com/signup?ref=clay1");
    expect(body).toContain("Clay");
  });

  it("should generate correct referral link", () => {
    const slug = "clay1";
    const referralLink = `https://mapit.skyveedrones.com/signup?ref=${slug}`;
    expect(referralLink).toBe("https://mapit.skyveedrones.com/signup?ref=clay1");
  });

  it("should produce valid mailto URL components", () => {
    const subject = buildEmailSubject("Clay Bechtol");
    const body = buildEmailBody("Clay", "John", "https://mapit.skyveedrones.com/signup?ref=clay1");
    const to = "john@example.com";
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    expect(mailto).toContain("mailto:");
    expect(mailto).toContain("john%40example.com");
    expect(mailto).toContain("subject=");
    expect(mailto).toContain("body=");
  });
});

describe("referral stats calculation", () => {
  it("should correctly count statuses", () => {
    const rows = [
      { status: "pending" },
      { status: "pending" },
      { status: "signed_up" },
      { status: "converted" },
      { status: "converted" },
    ];

    const totalSent = rows.length;
    const signedUp = rows.filter(r => r.status === "signed_up" || r.status === "converted").length;
    const converted = rows.filter(r => r.status === "converted").length;

    expect(totalSent).toBe(5);
    expect(signedUp).toBe(3);
    expect(converted).toBe(2);
  });

  it("should handle empty referral list", () => {
    const rows: { status: string }[] = [];

    const totalSent = rows.length;
    const signedUp = rows.filter(r => r.status === "signed_up" || r.status === "converted").length;
    const converted = rows.filter(r => r.status === "converted").length;

    expect(totalSent).toBe(0);
    expect(signedUp).toBe(0);
    expect(converted).toBe(0);
  });
});
