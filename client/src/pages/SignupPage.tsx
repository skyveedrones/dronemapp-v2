/**
 * Signup Page
 * Welcome page for new users signing up to Mapit
 * Captures referral code from URL parameter
 */

import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useEffect, useState } from "react";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const [refCode, setRefCode] = useState<string | null>(null);

  // Extract ref parameter from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setRefCode(ref);
    }
  }, []);

  const handleSignup = () => {
    // Build login URL with ref parameter if available
    let loginUrl = getLoginUrl();
    if (refCode) {
      const separator = loginUrl.includes("?") ? "&" : "?";
      loginUrl += `${separator}ref=${encodeURIComponent(refCode)}`;
    }
    window.location.href = loginUrl;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Welcome to Mapit</h1>
          <p className="text-lg text-muted-foreground">
            Precise drone mapping and geospatial data for your projects
          </p>
        </div>

        {/* Referral Info */}
        {refCode && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Signing up with referral code: <span className="font-semibold text-foreground">{refCode}</span>
            </p>
          </div>
        )}

        {/* Features List */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">✓</span>
            </div>
            <p className="text-sm text-muted-foreground">Interactive maps with GPS-tagged photos and videos</p>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">✓</span>
            </div>
            <p className="text-sm text-muted-foreground">Flight path tracking and visualization</p>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">✓</span>
            </div>
            <p className="text-sm text-muted-foreground">PDF overlay calibration and alignment tools</p>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">✓</span>
            </div>
            <p className="text-sm text-muted-foreground">Export data in multiple formats (KML, GeoJSON, GPX)</p>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleSignup}
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          Get Started
        </Button>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
