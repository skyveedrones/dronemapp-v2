import { describe, expect, it } from "vitest";
import { validateResendApiKey } from "./email";

describe("email.resend", () => {
  it("validates the Resend API key is configured correctly", async () => {
    // Skip test if API key is not set
    if (!process.env.RESEND_API_KEY) {
      console.log("Skipping Resend API test - RESEND_API_KEY not set");
      return;
    }
    
    const result = await validateResendApiKey();
    
    if (!result.valid) {
      console.error("Resend API key validation failed:", result.error);
    }
    expect(result.valid).toBe(true);
  });
});
