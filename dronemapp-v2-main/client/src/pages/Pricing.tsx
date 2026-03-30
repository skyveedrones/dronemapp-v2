import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { PLAN_LIMITS, PLAN_FEATURES } from "../../../shared/planLimits";

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("annual");

  const handleGetStarted = (planName: string) => {
    if (planName === "Enterprise") {
      alert("Contact sales functionality coming soon!");
    } else if (planName === "Free") {
      window.location.href = getLoginUrl();
    } else {
      setLocation(`/payment?plan=${planName.toLowerCase()}&billing=${billingPeriod}`);
    }
  };

  // Build feature list for each tier
  const buildFeatures = (tier: string) => {
    // const limits = PLAN_FEATURES[tier as keyof typeof PLAN_FEATURES];
    const limits = {};
    return [
      { 
        text: limits.maxStoragePerProjectGB === -1 
          ? "Unlimited storage per project" 
          : `${limits.maxStoragePerProjectGB} GB storage per project`,
        included: true 
      },
      { 
        text: limits.maxStorageTotalGB === -1 
          ? "Unlimited total storage" 
          : `${limits.maxStorageTotalGB} GB total storage`,
        included: true 
      },
      { 
        text: limits.maxProjects === -1 
          ? "Unlimited projects" 
          : `Up to ${limits.maxProjects} projects`,
        included: true 
      },
      { 
        text: limits.maxTeamMembers === -1 
          ? "Unlimited team members" 
          : limits.maxTeamMembers === 1 
          ? "Solo use only" 
          : `Up to ${limits.maxTeamMembers} team members`,
        included: true 
      },
      { 
        text: limits.dataRequestsPerHour === -1 
          ? "Unlimited data requests" 
          : `${limits.dataRequestsPerHour} data requests/hour`,
        included: true 
      },
      { 
        text: limits.fileUploadsPerDay === -1 
          ? "Unlimited daily uploads" 
          : `${limits.fileUploadsPerDay} uploads/day`,
        included: true 
      },
      { 
        text: limits.pdfExportsPerDay === -1 
          ? "Unlimited PDF exports" 
          : `${limits.pdfExportsPerDay} PDF exports/day`,
        included: true 
      },
      { text: "GPS tagging and flight paths", included: limits.features.gpsTagging },
      { text: "Basic PDF reports", included: limits.features.basicReports },
      { text: "Advanced map controls", included: limits.features.advancedMapControls },
      { text: "Marker clustering", included: limits.features.markerClustering },
      { text: "All export formats (KML, CSV, GeoJSON, GPX)", included: limits.features.allExportFormats },
      { text: "White-labeling & custom branding", included: limits.features.whiteLabeling },
      { text: "Client sharing links", included: limits.features.clientSharing },
      { text: "Priority support", included: limits.features.prioritySupport },
      { text: "API access", included: limits.features.apiAccess },
      { text: "Custom report templates", included: limits.features.customReports },
      { text: "Role-based access control", included: limits.features.roleBasedAccess },
      { text: "Dedicated support", included: limits.features.dedicatedSupport },
      { text: "Custom integrations", included: limits.features.customIntegrations },
      { text: "SSO & advanced security", included: limits.features.sso },
      { text: "On-premise deployment", included: limits.features.onPremise },
    ];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm">
        <div className="container flex items-center justify-between h-16">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img
              src="/images/mapit-logo-new.png"
              alt="Mapit"
              className="h-8"
            />
          </button>
          <Button
            onClick={() => setLocation("/dashboard")}
            variant="outline"
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          >
            Go to Dashboard
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            Choose the perfect plan for your drone mapping needs. All plans include a 14-day free trial.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1 bg-slate-800/50 rounded-lg border border-slate-700">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingPeriod === "monthly"
                  ? "bg-emerald-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingPeriod === "annual"
                  ? "bg-emerald-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Annual
              <span className="ml-2 text-xs bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const features = buildFeatures(plan.id);
            const isPopular = plan.id === "professional";
            
            return (
              <Card
                key={plan.name}
                className={`relative p-6 bg-slate-900/50 border-slate-800 hover:border-emerald-500/50 transition-all ${
                  isPopular ? "ring-2 ring-emerald-500/50 scale-105" : ""
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-sm text-slate-400 mb-4">{plan.description}</p>

                  {plan.id === "enterprise" ? (
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-white">Custom</span>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-white">
                        ${billingPeriod === "monthly" ? plan.monthlyPrice : plan.annualPrice}
                      </span>
                      <span className="text-slate-400 ml-2">
                        {billingPeriod === "monthly" ? "/month" : "/year"}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handleGetStarted(plan.name)}
                  className={`w-full mb-6 ${
                    isPopular
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-white"
                  }`}
                >
                  {plan.id === "enterprise" ? "Contact Sales" : "Start Free Trial"}
                </Button>

                <ul className="space-y-3 max-h-96 overflow-y-auto">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                      )}
                      <span
                        className={`text-sm ${
                          feature.included ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container py-16 border-t border-slate-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Can I try Mapit before subscribing?
              </h3>
              <p className="text-slate-400">
                Yes! All plans include a 14-day free trial with full access to features. No credit card required to start.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Can I change or cancel my subscription?
              </h3>
              <p className="text-slate-400">
                You can upgrade, downgrade, or cancel your subscription at any time from your account settings. Changes take effect at the end of your current billing cycle.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-slate-400">
                We accept all major credit cards (Visa, MasterCard, American Express) and wire transfers for annual Enterprise plans.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                What happens to my data if I cancel?
              </h3>
              <p className="text-slate-400">
                You can export all your project data (photos, videos, GPS data, reports) before canceling. We retain your data for 30 days after cancellation in case you want to reactivate.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                What are the data request limits?
              </h3>
              <p className="text-slate-400">
                Data request limits vary by plan. Free tier: 100 requests/hour, Starter: 500 requests/hour, Professional: 2,000 requests/hour, Business: 10,000 requests/hour, Enterprise: Unlimited.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                How much storage do I get?
              </h3>
              <p className="text-slate-400">
                Storage varies by plan. Free: 1 GB total, Starter: 10 GB total, Professional: 100 GB total, Business: 500 GB total, Enterprise: Unlimited storage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-16 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to elevate your drone mapping?
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Start your 14-day free trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => handleGetStarted("Professional")}
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-lg px-8"
            >
              Start Free Trial
            </Button>
            <Button
              onClick={() => handleGetStarted("Enterprise")}
              size="lg"
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-lg px-8"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="container text-center text-slate-500 text-sm">
          <p>&copy; 2026 Mapit. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
