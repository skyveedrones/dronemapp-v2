/**
 * Easy Upload Feature Page
 * Highlights the drag-and-drop upload with GPS extraction
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  MapPin,
  Image,
  Video,
  Zap,
  FolderOpen,
  FileCheck,
  Clock,
  Mountain,
  Camera,
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
    icon: Upload,
    title: "Drag & Drop",
    description: "Simply drag your drone photos and videos into the upload area. No complicated steps required.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: MapPin,
    title: "Auto GPS Extraction",
    description: "GPS coordinates are automatically extracted from your photos' EXIF metadata.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Image,
    title: "Photo Support",
    description: "Upload JPG, PNG, and other common image formats from any drone or camera.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Video,
    title: "Video Support",
    description: "Upload MP4 and other video formats to include aerial footage in your projects.",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
];

const metadata = [
  {
    icon: MapPin,
    title: "GPS Coordinates",
    description: "Latitude and longitude automatically extracted from photo EXIF data.",
  },
  {
    icon: Mountain,
    title: "Altitude",
    description: "Flight altitude captured from drone telemetry embedded in photos.",
  },
  {
    icon: Clock,
    title: "Timestamp",
    description: "Date and time of capture for chronological organization.",
  },
  {
    icon: Camera,
    title: "Camera Info",
    description: "Camera model, settings, and drone information when available.",
  },
];

const benefits = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Bulk upload hundreds of photos at once with parallel processing for maximum speed.",
  },
  {
    icon: FolderOpen,
    title: "Organized Storage",
    description: "Files are automatically organized by project and stored securely in the cloud.",
  },
  {
    icon: FileCheck,
    title: "Format Validation",
    description: "Automatic validation ensures only supported file types are uploaded.",
  },
];

export default function EasyUpload() {
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
                <Upload className="h-4 w-4" />
                Easy Upload
              </motion.div>
              
              <motion.h1
                variants={fadeInUp}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Upload Made Simple
              </motion.h1>
              
              <motion.p
                variants={fadeInUp}
                className="text-lg text-muted-foreground mb-8 max-w-xl"
              >
                Drag and drop your drone photos and videos with automatic GPS metadata extraction. 
                No manual data entry—just upload and let the system do the work.
              </motion.p>
              
              <motion.div variants={fadeInUp}>
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleSeeDemo}
                >
                  See Demo
                  <Upload className="ml-2 h-5 w-5" />
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
                  src="/images/feature-upload-new.jpg"
                  alt="Easy Upload - Drone photo upload interface"
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
              Upload Features
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

      {/* Metadata Section */}
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
              Automatic Metadata Extraction
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground max-w-2xl mx-auto"
            >
              We automatically extract valuable information from your drone photos
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {metadata.map((item) => (
              <motion.div key={item.title} variants={fadeInUp}>
                <Card className="h-full text-center">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="h-6 w-6 text-primary" />
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
              Why Use Our Upload System
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
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <benefit.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{benefit.title}</CardTitle>
                    </div>
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
              Ready to Upload?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground mb-8"
            >
              Start uploading your drone footage and let us handle the rest.
            </motion.p>
            <motion.div variants={fadeInUp}>
              <Link href="/pricing">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Get Started
                  <Upload className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
