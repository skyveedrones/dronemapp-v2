/**
 * Interactive Maps Feature Page
 * Highlights the Google Maps visualization features
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Map,
  MapPin,
  Layers,
  MousePointer,
  Eye,
  Satellite,
  Mountain,
  Navigation,
  ZoomIn,
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
    icon: MapPin,
    title: "Photo Markers",
    description: "Each photo appears as a marker on the map at its exact GPS location.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: MousePointer,
    title: "Interactive Popups",
    description: "Click any marker to see photo thumbnails, timestamps, and metadata.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Satellite,
    title: "Satellite View",
    description: "Toggle between map, satellite, and terrain views for context.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: ZoomIn,
    title: "Zoom & Pan",
    description: "Smoothly navigate your project area with intuitive controls.",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
];

const mapViews = [
  {
    icon: Map,
    title: "Road Map",
    description: "Standard map view with streets, labels, and points of interest.",
  },
  {
    icon: Satellite,
    title: "Satellite",
    description: "High-resolution satellite imagery for aerial context.",
  },
  {
    icon: Mountain,
    title: "Terrain",
    description: "Topographic view showing elevation and terrain features.",
  },
  {
    icon: Layers,
    title: "Hybrid",
    description: "Satellite imagery with road labels and boundaries overlaid.",
  },
];

const capabilities = [
  {
    icon: Eye,
    title: "Full-Screen Mode",
    description: "Expand the map to full screen for detailed exploration and presentations.",
  },
  {
    icon: Navigation,
    title: "Auto-Center",
    description: "Map automatically centers on your project area with optimal zoom level.",
  },
  {
    icon: Layers,
    title: "Layer Control",
    description: "Toggle photo markers, flight paths, and overlays independently.",
  },
];

export default function InteractiveMaps() {
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
                <Map className="h-4 w-4" />
                Interactive Maps
              </motion.div>
              
              <motion.h1
                variants={fadeInUp}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Visualize Your Flights
              </motion.h1>
              
              <motion.p
                variants={fadeInUp}
                className="text-lg text-muted-foreground mb-8 max-w-xl"
              >
                See all your drone photos on an interactive Google Map with markers, popups, 
                and detailed metadata. Explore your project area with satellite imagery and 
                terrain views.
              </motion.p>
              
              <motion.div variants={fadeInUp}>
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleSeeDemo}
                >
                  See Demo
                  <Map className="ml-2 h-5 w-5" />
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
                  src="/images/feature-maps-new.jpg"
                  alt="Interactive Maps - Drone mapping visualization"
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
              Map Features
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

      {/* Map Views Section */}
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
              Multiple Map Views
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground max-w-2xl mx-auto"
            >
              Switch between different map styles to get the context you need
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {mapViews.map((view) => (
              <motion.div key={view.title} variants={fadeInUp}>
                <Card className="h-full text-center">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <view.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{view.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {view.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Capabilities Section */}
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
              Additional Capabilities
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6"
          >
            {capabilities.map((capability) => (
              <motion.div key={capability.title} variants={fadeInUp}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <capability.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{capability.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {capability.description}
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
              See Your Projects on the Map
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground mb-8"
            >
              Start visualizing your drone footage on interactive maps today.
            </motion.p>
            <motion.div variants={fadeInUp}>
              <Link href="/pricing">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Get Started
                  <Map className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
