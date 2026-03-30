import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowLeft, Calendar, CreditCard, Download, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

import { PLAN_FEATURES } from "../../../shared/planLimits";
  free: {
    name: "Free",
    price: "$0",
    features: [
      "Up to 5 projects",
      "Up to 100 media files",
      "Basic GPS export (KML, CSV)",
      "Community support",
    ],
  },
  starter: {
    name: "Starter",
    price: "$49",
    period: "/month",
    features: [
      "Up to 25 projects",
      "Up to 1,000 media files",
      "Advanced GPS export (KML, CSV, GeoJSON, GPX)",
      "Project Map Overlay",
      "Email support",
    ],
  },
  professional: {
    name: "Professional",
    price: "$149",
    period: "/month",
    features: [
      "Unlimited projects",
      "Up to 10,000 media files",
      "All Starter features",
      "Team collaboration (up to 5 members)",
      "Priority email support",
      "Custom watermarks",
    ],
  },
  business: {
    name: "Business",
    price: "$349",
    period: "/month",
    features: [
      "Unlimited everything",
      "Team collaboration (unlimited members)",
      "Dedicated support",
      "API access",
      "Custom integrations",
      "Advanced analytics",
    ],
  },
};

export default function Billing() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [isUpgrading, setIsUpgrading] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-spin">
          <Zap className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  const currentPlan = user.subscriptionTier || "free";
  // const currentPlanData = PLAN_FEATURES[currentPlan as keyof typeof PLAN_FEATURES];
  // const safeCurrentPlanData = currentPlanData ?? PLAN_FEATURES.free;
  const safeCurrentPlanData = {};
  const billingPeriod = user.billingPeriod || "month";
  const nextBillingDate = user.currentPeriodEnd ? new Date(user.currentPeriodEnd) : null;

  const createCheckoutMutation = trpc.payment.createCheckoutSession.useMutation();
  const handleUpgrade = async (plan: string) => {
    setIsUpgrading(true);
    try {
      const period = billingPeriod === "annual" ? "annual" : "monthly";
      const priceId = getPriceId(plan, period);
      
      if (!priceId) {
        toast.error("Plan not available");
        return;
      }

      const result = await createCheckoutMutation.mutateAsync({
        priceId,
        planId: plan,
      });

      if (result.checkoutUrl) {
        window.open(result.checkoutUrl, "_blank");
        toast.success("Redirecting to checkout...");
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const getPriceId = (plan: string, period: string): string | null => {
    const priceMap: Record<string, Record<string, string>> = {
      starter: {
        monthly: "price_1T6Xu3GEMT6mikKwPibBZGCg",
        annual: "price_1T6Xu4GEMT6mikKwqmc0MCVL",
      },
      professional: {
        monthly: "price_1T6Xu4GEMT6mikKwINYKHcuI",
        annual: "price_1T6Xu4GEMT6mikKwqgE63wB7",
      },
      business: {
        monthly: "price_1T6Xu5GEMT6mikKwaxgTw2dy",
        annual: "price_1T6Xu5GEMT6mikKwCUBCrmlB",
      },
    };
    return priceMap[plan]?.[period] || null;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container py-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and billing information
          </p>
        </div>
      </div>

      <div className="container py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Current Plan Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold">{safeCurrentPlanData.name}</h3>
                    {currentPlan !== "free" && (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentPlan === "free"
                      ? "Free tier"
                      : `${safeCurrentPlanData.price}${(safeCurrentPlanData as any).period || ""}`}
                  </p>
                </div>

                {currentPlan !== "free" && nextBillingDate && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Next billing date:</span>
                    </div>
                    <p className="font-medium">
                      {format(nextBillingDate, "MMMM d, yyyy")}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Included features:</h4>
                  <ul className="space-y-2">
                    {safeCurrentPlanData.features.map((feature, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {currentPlan !== "free" && (
                  <Button variant="outline" className="w-full">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Payment Method
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Plans Grid */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Upgrade Your Plan</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {/* {Object.entries(PLAN_FEATURES) */}
                  .filter(([key]) => key !== "free")
                  .map(([key, plan]) => (
                    <Card
                      key={key}
                      className={`relative ${
                        currentPlan === key ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      {currentPlan === key && (
                        <div className="absolute top-4 right-4">
                          <Badge>Current Plan</Badge>
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle>{plan.name}</CardTitle>
                        <CardDescription>
                          <span className="text-2xl font-bold text-foreground">
                            {plan.price}
                          </span>
                          <span className="text-muted-foreground">{(plan as any).period || ""}</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <ul className="space-y-2">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-0.5">✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="w-full"
                          disabled={currentPlan === key || isUpgrading}
                          onClick={() => handleUpgrade(key)}
                        >
                          {currentPlan === key ? "Current Plan" : "Upgrade"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>

            {/* Billing History */}
            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>
                  Your recent invoices and payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentPlan === "free" ? (
                    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No billing history for free tier
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                      <Download className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Latest Invoice</p>
                        <p className="text-xs text-muted-foreground">
                          {nextBillingDate && format(nextBillingDate, "MMMM d, yyyy")}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        Download
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Have questions about your subscription? Check out our <a href="#" className="text-primary hover:underline">FAQ</a> or <a href="#" className="text-primary hover:underline">contact support</a>.
                </p>
                <p>
                  You can cancel your subscription anytime from your account settings. No questions asked.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
