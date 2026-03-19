import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { GlobalHamburgerHeader } from "@/components/GlobalHamburgerHeader";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Plan {
  name: string;
  price: string;
  period: string;
  desc: string;
  buttonText: string;
  features: string[];
  isFeatured: boolean;
  isCustom?: boolean;
  isFree?: boolean;
  // Maps to the Stripe tier ID in products.ts
  tierId?: "starter" | "professional" | "business";
}

// Stripe price IDs from products.ts
const PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
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

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [isAnnual, setIsAnnual] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Get referral ID from URL param first, then localStorage as fallback
  const referralId = typeof window !== "undefined"
    ? (new URLSearchParams(window.location.search).get("ref") ?? localStorage.getItem("mapit_ref_code") ?? undefined)
    : undefined;

  const createCheckout = trpc.payment.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      setLoadingPlan(null);
      toast.info("Redirecting to checkout...");
      window.open(data.checkoutUrl, "_blank");
    },
    onError: (err) => {
      setLoadingPlan(null);
      // If not authenticated, redirect to login
      if (err.message.includes("login") || err.data?.code === "UNAUTHORIZED") {
        window.location.href = getLoginUrl();
      } else {
        toast.error("Failed to start checkout. Please try again.");
      }
    },
  });

  const plans: Plan[] = [
    {
      name: "PILOT",
      price: isAnnual ? "41.65" : "49",
      period: "/month",
      desc: "Perfect for individual drone operators.",
      buttonText: "Get Started",
      features: [
        "100 GB Storage",
        "10 Projects",
        "CAD Overlay Basics",
        "Email Support",
      ],
      isFeatured: false,
      tierId: "starter",
    },
    {
      name: "MUNICIPAL",
      price: isAnnual ? "126.65" : "149",
      period: "/month",
      desc: "Precision mapping for town & city departments.",
      buttonText: "Start Free Trial",
      features: [
        "500 GB Storage",
        "Unlimited Projects",
        "Up to 5 Stakeholder Seats",
        "Sub-Surface Verification Docs",
      ],
      isFeatured: true,
      tierId: "professional",
    },
    {
      name: "AGENCY",
      price: isAnnual ? "296.65" : "349",
      period: "/month",
      desc: "Engineered for high-volume engineering firms.",
      buttonText: "Start Free Trial",
      features: [
        "1.5 TB Storage",
        "Unlimited Stakeholder Viewing",
        "API Access",
        "Priority Processing",
      ],
      isFeatured: false,
      tierId: "business",
    },
    {
      name: "METROPOLITAN",
      price: "Custom",
      period: "",
      desc: "Solutions for large-scale urban infrastructure.",
      buttonText: "Contact Sales",
      features: [
        "White-label City Portals",
        "On-site Training",
        "SLA Guarantee",
        "Dedicated Success Manager",
      ],
      isFeatured: false,
      isCustom: true,
    },
  ];

  const handleGetStarted = (plan: Plan) => {
    if (plan.isCustom) {
      alert("Contact sales functionality coming soon!");
      return;
    }
    if (plan.isFree) {
      window.location.href = getLoginUrl();
      return;
    }
    if (!plan.tierId) return;

    const priceId = isAnnual
      ? PRICE_IDS[plan.tierId].annual
      : PRICE_IDS[plan.tierId].monthly;

    setLoadingPlan(plan.name);
    createCheckout.mutate({
      priceId,
      planId: plan.tierId,
      planName: plan.name,
      referralId,
      trialDays: 14,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <GlobalHamburgerHeader />

      {/* Hero Section */}
      <section className="container pt-36 pb-16 md:pt-40 md:pb-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent"
            style={{ fontFamily: "var(--font-display)" }}>
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            Choose the plan that fits your operation. Scale from solo pilot to full agency.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1 bg-slate-800/50 rounded-lg border border-slate-700">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                !isAnnual ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                isAnnual ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Annual
              <span className="ml-2 text-xs bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full">
                Save 15%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-start">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative p-6 border transition-all flex flex-col ${
                plan.isFeatured
                  ? "bg-slate-900 border-emerald-500/60 ring-2 ring-emerald-500/40 scale-105 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                  : "bg-slate-900/50 border-slate-800 hover:border-emerald-500/40"
              }`}
            >
              {plan.isFeatured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-sm font-bold px-4 py-1 rounded-full whitespace-nowrap">
                  Most Popular
                </div>
              )}

              {/* Plan Name */}
              <h3
                className={`text-xl font-bold mb-1 tracking-wide ${
                  plan.isFeatured ? "text-emerald-400" : "text-white"
                }`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {plan.name}
              </h3>

              {/* Description */}
              <p className="text-slate-400 text-sm mb-4 leading-snug">{plan.desc}</p>

              {/* Price */}
              <div className="mb-5">
                {plan.isCustom ? (
                  <span className="text-3xl font-bold text-white">Custom</span>
                ) : plan.isFree ? (
                  <>
                    <span className="text-4xl font-bold text-white">$0</span>
                    <span className="text-slate-400 ml-1 text-sm">/14 days</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-white">${plan.price}</span>
                    <span className="text-slate-400 ml-1 text-sm">{plan.period}</span>
                    {isAnnual && (
                      <p className="text-xs text-emerald-400 mt-1">
                        Billed ${(parseFloat(plan.price) * 12).toFixed(2)}/yr · 15% off
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => handleGetStarted(plan)}
                disabled={loadingPlan === plan.name}
                className={`w-full mb-6 rounded-full font-semibold transition-all ${
                  plan.isFeatured
                    ? "bg-[#10b981] hover:bg-[#0da673] text-slate-950 hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                    : plan.isFree
                    ? "bg-slate-700 hover:bg-slate-600 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-white hover:border-emerald-500/40"
                }`}
              >
                {loadingPlan === plan.name ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin inline" />Processing...</>
                ) : (
                  plan.buttonText
                )}
              </Button>

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container py-16 border-t border-slate-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12"
            style={{ fontFamily: "var(--font-display)" }}>
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Can I try MAPIT before subscribing?
              </h3>
              <p className="text-slate-400">
                Yes — contact us to arrange a guided demo or evaluation period. Use the Contact Sales option on the METROPOLITAN plan.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Can I change or cancel my subscription?
              </h3>
              <p className="text-slate-400">
                You can upgrade, downgrade, or cancel at any time from your account settings. Changes take effect at the end of your current billing cycle.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-slate-400">
                We accept all major credit cards (Visa, MasterCard, American Express) and wire transfers for annual METROPOLITAN plans.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                What happens to my data if I cancel?
              </h3>
              <p className="text-slate-400">
                You can export all project data (photos, videos, GPS data, reports) before canceling. We retain your data for 30 days after cancellation.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                How much storage do I get?
              </h3>
              <p className="text-slate-400">
                Storage scales with your plan: PILOT 100 GB, MUNICIPAL 500 GB, AGENCY 1.5 TB, METROPOLITAN unlimited.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-16 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6"
            style={{ fontFamily: "var(--font-display)" }}>
            Ready to elevate your drone mapping?
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Get started with MAPIT today and take your drone operations to the next level.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => window.location.href = getLoginUrl()}
              size="lg"
              className="bg-[#10b981] hover:bg-[#0da673] text-slate-950 font-bold text-lg px-8 rounded-full hover:drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            >
              Get Started
            </Button>
            <Button
              onClick={() => alert("Contact sales functionality coming soon!")}
              size="lg"
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-lg px-8 rounded-full"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
