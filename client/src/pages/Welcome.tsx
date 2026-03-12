import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation, Link } from "wouter";
import { ArrowRight, ArrowLeft, CheckCircle, Upload, Map, FileText, Shield, Zap, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

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
    title: "Easy Upload",
    description: "Upload drone photos and videos with automatic GPS extraction",
  },
  {
    icon: Map,
    title: "Interactive Maps",
    description: "Visualize flights on Google Maps with markers and flight paths",
  },
  {
    icon: FileText,
    title: "Professional Reports",
    description: "Generate branded PDF reports with maps and media galleries",
  },
];

const benefits = [
  "Secure authentication",
  "Free tier available",
  "No credit card required to start",
  "Instant access after signup",
];

export default function Welcome() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border py-4">
        <div className="container flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Homepage</span>
          </Link>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => window.location.href = getLoginUrl()}
          >
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/10" />
        <div className="container relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.h1
              variants={fadeInUp}
              className="text-5xl md:text-6xl font-bold mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Welcome to MAPIT
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-muted-foreground mb-8"
            >
              Professional drone mapping solutions that empower smarter project planning, monitoring, and decision-making.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6"
                onClick={() => setLocation("/pricing")}
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 text-lg px-8 py-6"
                onClick={() => setLocation("/demo")}
              >
                View Demo Project
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* What You Can Do Section */}
      <section className="py-20 relative">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="max-w-4xl mx-auto"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-4xl font-bold mb-12 text-center"
              style={{ fontFamily: "var(--font-display)" }}
            >
              What You Can Do
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    className="p-6 rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <Icon className="h-8 w-8 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-primary/5 relative">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="max-w-2xl mx-auto"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-4xl font-bold mb-12 text-center"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Why Choose MAPIT?
            </motion.h2>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border/50"
                >
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                  <span className="text-lg">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />
        <div className="container relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="max-w-2xl mx-auto text-center"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-4xl font-bold mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to Get Started?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-muted-foreground mb-8"
            >
              Join thousands of professionals using MAPIT to streamline their drone mapping workflows.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6"
                onClick={() => setLocation("/pricing")}
              >
                Create Free Account
                <Zap className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 text-lg px-8 py-6"
                onClick={() => setLocation("/")}
              >
                Back to Home
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/images/mapit-logo-new.png"
                alt="Mapit"
                className="h-12 w-auto opacity-60"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Mapit. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
