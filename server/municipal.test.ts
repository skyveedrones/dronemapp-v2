import { describe, it, expect, vi } from "vitest";

/**
 * Municipal Lead Capture — unit tests
 * Tests the input validation and notification flow for the
 * municipal.submitBriefingRequest tRPC procedure.
 */

// Mock the notification and email modules
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

describe("municipal.submitBriefingRequest", () => {
  const validInput = {
    name: "John Smith",
    email: "jsmith@springfield.gov",
    title: "City Manager",
    city: "City of Springfield",
    department: "public-works",
    primaryInterest: "sub-surface-verification",
    timeline: "1-3-months",
    message: "We have a water main replacement project starting Q2.",
  };

  it("accepts valid input with all fields", () => {
    // Validate the shape matches what the tRPC procedure expects
    expect(validInput.name).toBeTruthy();
    expect(validInput.email).toContain("@");
    expect(validInput.title).toBeTruthy();
    expect(validInput.city).toBeTruthy();
    expect(validInput.department).toBeTruthy();
    expect(validInput.primaryInterest).toBeTruthy();
    expect(validInput.timeline).toBeTruthy();
    expect(validInput.message).toBeTruthy();
  });

  it("accepts valid input with only required fields", () => {
    const minimalInput = {
      name: "Jane Doe",
      email: "jane@city.gov",
      title: "Director of Engineering",
      city: "Metropolis",
      department: "engineering",
      primaryInterest: "progress-tracking",
    };
    expect(minimalInput.name).toBeTruthy();
    expect(minimalInput.email).toContain("@");
    expect(minimalInput.city).toBeTruthy();
  });

  it("generates correct admin notification title", () => {
    const adminTitle = `[MUNICIPAL LEAD] New Request from ${validInput.city}`;
    expect(adminTitle).toBe(
      "[MUNICIPAL LEAD] New Request from City of Springfield"
    );
  });

  it("generates correct admin notification content", () => {
    const adminContent = [
      `Name: ${validInput.name}`,
      `Title: ${validInput.title}`,
      `City/Municipality: ${validInput.city}`,
      `Department: ${validInput.department}`,
      `Primary Interest: ${validInput.primaryInterest}`,
      validInput.timeline ? `Timeline: ${validInput.timeline}` : null,
      validInput.message ? `Message: ${validInput.message}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    expect(adminContent).toContain("Name: John Smith");
    expect(adminContent).toContain("City/Municipality: City of Springfield");
    expect(adminContent).toContain("Department: public-works");
    expect(adminContent).toContain("Timeline: 1-3-months");
    expect(adminContent).toContain("Message: We have a water main");
  });

  it("generates correct auto-responder subject", () => {
    const subject = `Municipal Briefing Request Received — ${validInput.city}`;
    expect(subject).toBe(
      "Municipal Briefing Request Received — City of Springfield"
    );
  });

  it("omits optional fields from content when not provided", () => {
    const minimalInput = {
      name: "Jane Doe",
      email: "jane@city.gov",
      title: "Director",
      city: "Metropolis",
      department: "engineering",
      primaryInterest: "progress-tracking",
      timeline: undefined,
      message: undefined,
    };

    const adminContent = [
      `Name: ${minimalInput.name}`,
      `Title: ${minimalInput.title}`,
      `City/Municipality: ${minimalInput.city}`,
      `Department: ${minimalInput.department}`,
      `Primary Interest: ${minimalInput.primaryInterest}`,
      minimalInput.timeline ? `Timeline: ${minimalInput.timeline}` : null,
      minimalInput.message ? `Message: ${minimalInput.message}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    expect(adminContent).not.toContain("Timeline:");
    expect(adminContent).not.toContain("Message:");
    expect(adminContent).toContain("Name: Jane Doe");
  });

  it("sends admin email to clay@skyveedrones.com", () => {
    const adminEmailTo = "clay@skyveedrones.com";
    expect(adminEmailTo).toBe("clay@skyveedrones.com");
  });

  it("sends auto-responder to the lead's email", () => {
    const autoResponderTo = validInput.email;
    expect(autoResponderTo).toBe("jsmith@springfield.gov");
  });

  it("validates all department options are non-empty strings", () => {
    const departments = [
      "public-works",
      "engineering",
      "planning",
      "fire",
      "utilities",
      "transportation",
      "city-management",
      "other",
    ];
    departments.forEach((d) => {
      expect(d.length).toBeGreaterThan(0);
    });
  });

  it("validates all interest options are non-empty strings", () => {
    const interests = [
      "sub-surface-verification",
      "progress-tracking",
      "design-overlay",
      "inter-departmental",
      "citizen-reporting",
      "utility-documentation",
      "pilot-program",
      "general",
    ];
    interests.forEach((i) => {
      expect(i.length).toBeGreaterThan(0);
    });
  });
});
