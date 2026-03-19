import { useAuth } from "@/_core/hooks/useAuth";
import { GlobalHamburgerHeader } from "@/components/GlobalHamburgerHeader";
import { ReferralWidget } from "@/components/ReferralWidget";
import { getLoginUrl } from "@/const";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Referral() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalHamburgerHeader />
      <main className="pt-24 pb-16 px-4 max-w-2xl mx-auto">
        <ReferralWidget />
      </main>
    </div>
  );
}
