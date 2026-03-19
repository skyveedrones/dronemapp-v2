/**
 * Project Map Overlay Feature Page
 * Allows users to overlay construction plans on maps
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Layers,
  MapPin,
  Move,
  RotateCw,
  ZoomIn,
  Eye,
  Target,
  Ruler,
  Building2,
  Compass,
  CheckCircle2,
} from "lucide-react";
import { Link } from "wouter";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const features = [
  {
    icon: FileText,
    title: "PDF Upload",
    description: "Upload construction plans, blueprints, and site drawings in PDF format for overlay on your maps.",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    icon: Target,
    title: "Corner Positioning",
    description: "Precisely position your overlay by setting GPS coordinates for each corner of the document.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Eye,
    title: "Transparency Control",
    description: "Adjust overlay opacity to see both the plan and aerial imagery simultaneously.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Layers,
    title: "Layer Management",
    description: "Toggle overlays on and off, manage multiple plans per project, and organize by phase.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
];

const useCases = [
  {
    icon: Building2,
    title: "Construction Progress",
    description: "Compare as-built conditions to original plans by overlaying blueprints on current drone imagery.",
  },
  {
    icon: Ruler,
    title: "Site Planning",
    description: "Visualize proposed developments on actual terrain to identify potential issues before breaking ground.",
  },
  {
    icon: Compass,
    title: "Survey Verification",
    description: "Overlay survey plats to verify boundary locations and easements against aerial photography.",
  },
  {
    icon: MapPin,
    title: "Utility Mapping",
    description: "Superimpose utility plans to locate underground infrastructure relative to surface features.",
  },
];

const howItWorks = [
  {
    step: 1,
    title: "Upload Your Plan",
    description: "Upload a PDF of your construction plan, blueprint, or site drawing to your project.",
  },
  {
    step: 2,
    title: "Set Corner Points",
    description: "Click on the map to set GPS coordinates for each corner of your document.",
  },
  {
    step: 3,
    title: "Adjust & Refine",
    description: "Fine-tune position, rotation, and scale to perfectly align with your aerial imagery.",
  },
  {
    step: 4,
    title: "Compare & Analyze",
    description: "Toggle transparency and switch between layers to compare plans with reality.",
  },
];

export default function PdfMapOverlay() {
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container py-4">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
                <Layers className="h-4 w-4" />
                Project Map Overlay
              </motion.div>
              
              <motion.h1
                variants={fadeInUp}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Overlay Plans on Reality
              </motion.h1>
              
              <motion.p
                variants={fadeInUp}
                className="text-lg text-muted-foreground mb-8 max-w-xl"
              >
                Superimpose construction plans, blueprints, and site drawings directly on your 
                aerial drone imagery. Compare design intent with as-built conditions using 
                precise GPS positioning.
              </motion.p>
              
              <motion.div variants={fadeInUp}>
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleSeeDemo}
                >
                  See Demo
                  <Layers className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-video rounded-xl overflow-hidden shadow-2xl">
                <img
                  src="/images/feature-overlay-new.jpg"
                  alt="Project Map Overlay - Blueprint overlay on aerial imagery"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Overlay Features
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={fadeInUp}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}>
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How It Works
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {howItWorks.map((item) => (
              <motion.div key={item.step} variants={fadeInUp}>
                <Card className="h-full text-center">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                      {item.step}
                    </div>
                    <CardTitle>{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {item.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Use Cases
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 gap-6"
          >
            {useCases.map((useCase) => (
              <motion.div key={useCase.title} variants={fadeInUp}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <useCase.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{useCase.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {useCase.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center max-w-2xl mx-auto"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Compare Plans to Reality
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground mb-8"
            >
              Start overlaying your construction plans on aerial imagery today.
            </motion.p>
            <motion.div variants={fadeInUp}>
              <Link href="/pricing">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Get Started
                  <Layers className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
