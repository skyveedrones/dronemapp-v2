/**
 * Install as App Feature Page
 * PWA installation instructions for all platforms
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Smartphone,
  Monitor,
  Zap,
  WifiOff,
  Home,
  RefreshCw,
  Cloud,
  Layers,
  HardDrive,
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

const benefits = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Native app performance means instant loading and smooth interactions. No browser overhead—just pure speed.",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    icon: WifiOff,
    title: "Offline Access",
    description: "View projects and photos even without internet. Perfect for remote construction sites and field work.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Home,
    title: "Home Screen Icon",
    description: "One tap access from your home screen. No need to remember URLs or search through bookmarks.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
];

const installSteps = [
  {
    platform: "iPhone/iPad",
    icon: "📱",
    steps: [
      "Open this site in Safari",
      "Tap the Share button",
      "Select \"Add to Home Screen\"",
      "Tap \"Add\" to confirm",
    ],
  },
  {
    platform: "Android",
    icon: "🤖",
    steps: [
      "Open this site in Chrome",
      "Tap the menu (three dots)",
      "Select \"Add to Home screen\"",
      "Tap \"Add\" to install",
    ],
  },
  {
    platform: "Desktop",
    icon: "💻",
    steps: [
      "Open in Chrome or Edge",
      "Click the install icon in address bar",
      "Click \"Install\" in the popup",
      "Launch from your desktop",
    ],
  },
];

const pwaFeatures = [
  {
    icon: Cloud,
    title: "No App Store Required",
    description: "Install directly from your browser. No waiting for app store approvals, no large downloads, and always up to date automatically.",
  },
  {
    icon: Layers,
    title: "Cross-Platform",
    description: "Works on iPhone, Android, Windows, Mac, and Linux. One app, every device, seamless experience everywhere.",
  },
  {
    icon: HardDrive,
    title: "Minimal Storage",
    description: "Uses far less storage than traditional apps. Photos and data are stored in the cloud, not on your device.",
  },
  {
    icon: RefreshCw,
    title: "Always Updated",
    description: "Get new features and improvements automatically. No manual updates or version compatibility issues.",
  },
];

export default function InstallAsApp() {
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
                <Smartphone className="h-4 w-4" />
                Install as App
              </motion.div>
              
              <motion.h1
                variants={fadeInUp}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Access Anywhere, Anytime
              </motion.h1>
              
              <motion.p
                variants={fadeInUp}
                className="text-lg text-muted-foreground mb-8 max-w-xl"
              >
                Install our platform as a native app on your phone, tablet, or desktop. 
                Work offline in the field, sync when connected, and enjoy a fast, app-like 
                experience without app store downloads.
              </motion.p>
              
              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleSeeDemo}
                >
                  See Demo
                  <Download className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleGetStarted}
                >
                  Install App
                  <Download className="ml-2 h-5 w-5" />
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
                  src="/images/feature-install-app-dark.png"
                  alt="Install as App - Progressive Web App on all devices"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
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
              Why Install As An App?
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6"
          >
            {benefits.map((benefit) => (
              <motion.div key={benefit.title} variants={fadeInUp}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${benefit.bgColor} flex items-center justify-center mb-4`}>
                      <benefit.icon className={`h-6 w-6 ${benefit.color}`} />
                    </div>
                    <CardTitle>{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {benefit.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Installation Steps Section */}
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
              How to Install
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6"
          >
            {installSteps.map((platform) => (
              <motion.div key={platform.platform} variants={fadeInUp}>
                <Card className="h-full">
                  <CardHeader className="text-center">
                    <div className="text-4xl mb-4">{platform.icon}</div>
                    <CardTitle>On {platform.platform}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3">
                      {platform.steps.map((step, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-medium">
                            {index + 1}
                          </span>
                          <span className="text-muted-foreground">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* PWA Features Section */}
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
              Progressive Web App Benefits
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 gap-6"
          >
            {pwaFeatures.map((feature) => (
              <motion.div key={feature.title} variants={fadeInUp}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </div>
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
              Work From Anywhere
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground mb-8"
            >
              Install now for fast, offline-capable access to all your drone mapping projects.
            </motion.p>
            <motion.div variants={fadeInUp}>
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleGetStarted}
              >
                Get Started
                <Download className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
