/**
 * GPS Data Export Feature Page
 * Allows users to export GPS data from their projects in multiple formats
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
  Globe,
  FileSpreadsheet,
  MapPin,
  Navigation,
  Share2,
  Database,
  BarChart3,
  Compass,
  FileText,
  Layers,
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

const exportFormats = [
  {
    icon: Globe,
    title: "KML",
    description: "For Google Earth with embedded images and descriptions",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: FileSpreadsheet,
    title: "CSV",
    description: "Spreadsheet format for Excel and data analysis",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Database,
    title: "GeoJSON",
    description: "For GIS software like QGIS and ArcGIS",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Navigation,
    title: "GPX",
    description: "For GPS devices and navigation software",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
];

const useCases = [
  {
    icon: Share2,
    title: "Share With Clients",
    description: "Provide clients with KML files they can open in Google Earth to explore the site and view photos in context.",
  },
  {
    icon: Layers,
    title: "GIS Integration",
    description: "Import GeoJSON into QGIS, ArcGIS, or other GIS platforms for advanced spatial analysis and mapping.",
  },
  {
    icon: BarChart3,
    title: "Data Analysis",
    description: "Open CSV files in Excel or Google Sheets to analyze coordinates, timestamps, and photo metadata.",
  },
  {
    icon: Compass,
    title: "GPS Navigation",
    description: "Load GPX files into GPS devices or apps to navigate back to specific photo locations in the field.",
  },
];

const features = [
  {
    icon: FileText,
    title: "Complete Metadata",
    description: "Exports include GPS coordinates, altitude, timestamps, photo filenames, and custom descriptions you've added.",
  },
  {
    icon: Download,
    title: "Batch Export",
    description: "Export all photos from a project at once. No need to download coordinates one by one—get everything in seconds.",
  },
  {
    icon: CheckCircle2,
    title: "Format Selection",
    description: "Choose the right format for your workflow. Switch between formats anytime without re-uploading photos.",
  },
];

export default function GpsDataExport() {
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
                <Download className="h-4 w-4" />
                GPS Data Export
              </motion.div>
              
              <motion.h1
                variants={fadeInUp}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Export GPS Data in Any Format
              </motion.h1>
              
              <motion.p
                variants={fadeInUp}
                className="text-lg text-muted-foreground mb-8 max-w-xl"
              >
                Download your photo GPS coordinates in multiple industry-standard formats. 
                Seamlessly integrate with Google Earth, GIS software, surveying tools, and 
                GPS devices for maximum compatibility.
              </motion.p>
              
              <motion.div variants={fadeInUp}>
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleSeeDemo}
                >
                  See Demo
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
                  src="/images/feature-export-new.png"
                  alt="GPS Data Export - Multiple export formats"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Export Formats Section */}
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
              Supported Export Formats
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {exportFormats.map((format) => (
              <motion.div key={format.title} variants={fadeInUp}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${format.bgColor} flex items-center justify-center mb-4`}>
                      <format.icon className={`h-6 w-6 ${format.color}`} />
                    </div>
                    <CardTitle>{format.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {format.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Use Cases Section */}
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
              What You Can Do With Exported Data
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
              Export Features
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={fadeInUp}>
                <Card className="h-full text-center">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
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
              Take Your Data Anywhere
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground mb-8"
            >
              Export GPS coordinates in the format that works best for your tools and workflow.
            </motion.p>
            <motion.div variants={fadeInUp}>
              <Link href="/pricing">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Get Started
                  <Download className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
