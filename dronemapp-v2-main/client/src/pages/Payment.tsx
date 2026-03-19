import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SUBSCRIPTION_PLANS } from "../../../server/products";

/**
 * Payment Page - Handles Stripe checkout for plan upgrades
 * Accessed from Pricing page after selecting a plan
 */
export default function Payment() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get plan from URL query params
  const params = new URLSearchParams(window.location.search);
  const planId = params.get("plan");
  const billingPeriod = (params.get("billing") as "monthly" | "annual") || "annual";

  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
  const createCheckoutSession = trpc.payment.createCheckoutSession.useMutation();
  const { data: user } = trpc.auth.me.useQuery();

  // Redirect if no plan selected or invalid plan
  useEffect(() => {
    if (!plan || plan.id === "free" || plan.id === "enterprise") {
      setLocation("/pricing");
    }
  }, [plan, setLocation]);

  const handleCheckout = async () => {
    if (!plan || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const priceId = billingPeriod === "monthly" ? plan.monthlyPriceId : plan.annualPriceId;

      if (!priceId) {
        throw new Error("Price not available for this plan");
      }

      const session = await createCheckoutSession.mutateAsync({
        priceId,
        planId: plan.id,
      });

      if (session.checkoutUrl) {
        // Open checkout in new tab
        window.open(session.checkoutUrl, "_blank");
        toast.success("Redirecting to payment...");
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start checkout";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-center mt-4 text-muted-foreground">Loading payment details...</p>
        </Card>
      </div>
    );
  }

  const price = billingPeriod === "monthly" ? plan.monthlyPrice : plan.annualPrice;
  const displayPrice = price; // Price is already in dollars, no division needed

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img
              src="/images/mapit-logo.webp"
              alt="MAPit"
              className="h-8 w-auto"
            />
          </div>
          <Button
            variant="ghost"
            onClick={() => setLocation("/pricing")}
          >
            Back to Pricing
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container py-12">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-8">
            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">Complete Your Purchase</h1>
              <p className="text-lg text-muted-foreground">
                Upgrade to {plan.name} and unlock powerful drone mapping features
              </p>
            </div>

            {/* Order Summary */}
            <Card className="p-6 space-y-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">{plan.name} Plan</h2>
                <p className="text-muted-foreground">{plan.description}</p>
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-border pt-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Plan Price ({billingPeriod})</span>
                  <span className="font-semibold">${displayPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold border-t border-border pt-3">
                  <span>Total</span>
                  <span className="text-primary">${displayPrice.toFixed(2)}</span>
                </div>
                {billingPeriod === "annual" && (
                  <p className="text-sm text-green-500 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Save 20% with annual billing
                  </p>
                )}
              </div>

              {/* Features Preview */}
              <div className="border-t border-border pt-6 space-y-3">
                <h3 className="font-semibold">What's Included:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>
                      {plan.limits.maxProjects === -1
                        ? "Unlimited projects"
                        : `Up to ${plan.limits.maxProjects} projects`}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>
                      {plan.limits.maxStorageTotalGB === -1
                        ? "Unlimited storage"
                        : `${plan.limits.maxStorageTotalGB} GB total storage`}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>
                      {plan.limits.maxTeamMembers === -1
                        ? "Unlimited team members"
                        : `Up to ${plan.limits.maxTeamMembers} team members`}
                    </span>
                  </li>
                  {plan.limits.features.prioritySupport && (
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>Priority support</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-destructive/10 border border-destructive rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-destructive">Payment Error</p>
                    <p className="text-sm text-destructive/80">{error}</p>
                  </div>
                </div>
              )}

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                disabled={isLoading}
                size="lg"
                className="w-full text-lg h-12"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Proceed to Payment
                  </>
                )}
              </Button>

              {/* Security Note */}
              <p className="text-xs text-muted-foreground text-center">
                🔒 Secure payment powered by Stripe. Your payment information is encrypted and secure.
              </p>
            </Card>

            {/* FAQ */}
            <Card className="p-6 bg-muted/50">
              <h3 className="font-semibold mb-4">Frequently Asked Questions</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium mb-1">Can I cancel anytime?</p>
                  <p className="text-muted-foreground">Yes, you can cancel your subscription at any time from your account settings.</p>
                </div>
                <div>
                  <p className="font-medium mb-1">What payment methods do you accept?</p>
                  <p className="text-muted-foreground">We accept all major credit cards, Apple Pay, and Google Pay through Stripe.</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Is there a free trial?</p>
                  <p className="text-muted-foreground">Start with our Free plan to explore MAPit, then upgrade whenever you're ready.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
