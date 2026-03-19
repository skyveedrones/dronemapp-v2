/**
 * Demo Project Page
 * Showcases MAPIT features with a read-only demonstration project
 * Accessible without authentication
 */

import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Eye, MapPin, FileText, Download, Zap } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trackEvent } from "@/lib/analytics";

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
    icon: MapPin,
    title: "Interactive Map",
    description: "View GPS-marked drone flight paths and locations on an interactive Mapbox",
  },
  {
    icon: Eye,
    title: "Media Gallery",
    description: "Browse all uploaded drone photos and videos with GPS metadata",
  },
  {
    icon: FileText,
    title: "Flight Details",
    description: "Examine detailed information about each drone flight",
  },
  {
    icon: Download,
    title: "Data Export",
    description: "See how data can be exported in multiple formats (KML, CSV, GeoJSON, GPX)",
  },
  {
    icon: Zap,
    title: "PDF Reports",
    description: "Generate professional PDF reports with maps and flight data",
  },
  {
    icon: Lock,
    title: "Read-Only Access",
    description: "This demo project is read-only to showcase the platform safely",
  },
];

export default function DemoProject() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Track demo page view
    trackEvent('demo_page_view');
    
    // Simulate loading the demo project
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleViewFullProject = () => {
    // Navigate directly to demo project - no login required
    trackEvent('demo_project_view');
    setLocation("/project/1");
  };



  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <div className="flex gap-2">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button variant="outline">Go to Dashboard</Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Demo Banner */}
      <div className="bg-primary/10 border-b border-primary/20 py-4">
        <div className="container flex items-center gap-3">
          <Eye className="h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Demo Project:</span> This is a read-only demonstration of MAPIT's capabilities. 
            {!isAuthenticated && (
              <>
                {" "}
                <button
                  onClick={() => {
                    trackEvent('demo_to_signup_click');
                    window.location.href = getLoginUrl();
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  Sign in
                </button>
                {" "}to create your own projects.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.h1
              variants={fadeInUp}
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Explore MAPIT
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg text-muted-foreground mb-8"
            >
              Take a guided tour of our demonstration project to see how MAPIT helps you organize, 
              visualize, and analyze your drone mapping data. No sign-up required.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleViewFullProject}
              >
                View Demo Project
                <MapPin className="ml-2 h-5 w-5" />
              </Button>
              {!isAuthenticated && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    trackEvent('demo_to_signup_click');
                    window.location.href = getLoginUrl();
                  }}
                >
                  <Zap className="mr-2 h-5 w-5" />
                  Sign Up
                </Button>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              What You'll See in the Demo
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground text-lg max-w-2xl mx-auto"
            >
              Explore all the key features that make MAPIT the leading drone mapping platform
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-primary/10 to-primary/5 border-t border-primary/20">
        <div className="container">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center max-w-2xl mx-auto"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold mb-6"
            >
              Ready to Map Your Projects?
            </motion.h2>

            <motion.p
              variants={fadeInUp}
              className="text-lg text-muted-foreground mb-8"
            >
              Start using MAPIT today to organize, visualize, and share your drone mapping data with your team.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  <Link href="/welcome">
                    <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                      Sign Up Today!
                      <Zap className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => {
                    trackEvent('demo_to_signup_click');
                    window.location.href = getLoginUrl();
                  }}
                  >
                    Start Free Trial
                    <Zap className="ml-2 h-5 w-5" />
                  </Button>
                  <Link href="/">
                    <Button size="lg" variant="outline">
                      Learn More
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
