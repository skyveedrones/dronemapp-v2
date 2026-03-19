import { Button } from "@/components/ui/button";
import { FileText, Clock, Copy, Zap, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trackEvent } from "@/lib/analytics";
import { motion } from "framer-motion";

export default function ProjectTemplates() {
  const { isAuthenticated } = useAuth();

  const handleSeeDemo = () => {
    trackEvent('demo_button_click_feature_page');
    window.location.href = "/demo";
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = getLoginUrl();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-950 to-cyan-950 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="container relative py-24 md:py-32">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 ring-1 ring-emerald-500/20 mb-6">
                <FileText className="h-4 w-4" />
                Project Templates
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6">
                Create Projects in Seconds
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Save your project configurations as reusable templates. Pre-fill client names, settings, and preferences to eliminate repetitive data entry and speed up your workflow.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSeeDemo}
                >
                  See Demo
                </Button>
                <Link href="/pricing">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-emerald-500/30 text-white hover:bg-emerald-500/10"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663204719166/SxjCbukJOAezRSZP.png"
                alt="Project Templates Dashboard"
                className="rounded-lg shadow-2xl ring-1 ring-white/10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Why Use Templates?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Save time and ensure consistency across similar projects with reusable configurations.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Save Time</h3>
              <p className="text-muted-foreground">
                Create new projects in 90 seconds instead of 5-10 minutes by pre-filling common fields.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Copy className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Ensure Consistency</h3>
              <p className="text-muted-foreground">
                Use the same settings, export formats, and configurations across similar projects.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Quick Setup</h3>
              <p className="text-muted-foreground">
                Pre-built templates for water line mapping, road construction, and utility infrastructure.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Custom Templates</h3>
              <p className="text-muted-foreground">
                Create your own templates from existing projects or build from scratch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to streamline your project creation workflow.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Create or Choose Template</h3>
              <p className="text-muted-foreground">
                Use a pre-built template or save an existing project as a template with all your preferred settings.
              </p>
            </div>

            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Customize Details</h3>
              <p className="text-muted-foreground">
                Enter the project name, location, and flight date. All other fields are pre-filled from the template.
              </p>
            </div>

            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Start Working</h3>
              <p className="text-muted-foreground">
                Your project is created with all settings configured. Upload media and start mapping immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-emerald-950 via-teal-950 to-cyan-950 text-white">
        <div className="container text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Ready to Speed Up Your Workflow?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Start using project templates today and save hours every week on project setup.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
              Try Templates Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
