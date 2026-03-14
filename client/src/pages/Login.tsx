/**
 * Login/Signup Landing Page
 * Professional authentication page matching MAPit branding
 * Dark theme with emerald accents
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl, getPortalLoginUrl } from "@/const";
import { CheckCircle2, Shield, Zap, Map, Upload, FileText, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  const handlePortalLogin = () => {
    window.location.href = getPortalLoginUrl();
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img
              src="/images/mapit-logo.webp"
              alt="MAPit"
              className="h-8 w-auto"
            />
          </div>
          <Button 
            onClick={handleLogin} 
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Information */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="space-y-8"
            >
              <motion.div variants={fadeInUp} className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Welcome to <span className="text-primary">MAPit</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Professional drone mapping solutions that empower smarter project planning, monitoring, and decision-making.
                </p>
              </motion.div>

              {/* Features */}
              <motion.div variants={fadeInUp} className="space-y-4">
                <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>What You Can Do</h2>
                <div className="space-y-4">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      variants={fadeInUp}
                      className="flex gap-4 p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-colors group"
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <feature.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Benefits */}
              <motion.div variants={fadeInUp} className="space-y-3">
                <h3 className="font-semibold text-foreground">Why Choose MAPit?</h3>
                <div className="space-y-2">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      variants={fadeInUp}
                      className="flex items-center gap-3 text-muted-foreground"
                    >
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>{benefit}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Login Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:sticky lg:top-24"
            >
              <Card className="p-8 space-y-6 bg-card/50 backdrop-blur-sm border border-primary/30 shadow-xl">
                <div className="space-y-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Get Started</h2>
                  <p className="text-muted-foreground">
                    Sign in or create your account to start mapping
                  </p>
                </div>

                <div className="space-y-4">
                  <Button
                    onClick={handleLogin}
                    size="lg"
                    className="w-full text-lg h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Continue to Login
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>

                  <Button
                    onClick={handlePortalLogin}
                    size="lg"
                    variant="outline"
                    className="w-full text-lg h-12 border-primary/40 text-primary hover:bg-primary/10 font-semibold"
                  >
                    <Map className="w-5 h-5 mr-2" />
                    Client Portal Login
                  </Button>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/30"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground font-medium">
                        How it works
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    {[
                      "Click the button above to open the secure authentication portal",
                      "Sign in with your existing account or create a new one",
                      "You'll be automatically redirected back and ready to go"
                    ].map((step, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                          {index + 1}
                        </div>
                        <p className="text-muted-foreground pt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border/30" />

                {/* Additional Info */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    New user?{" "}
                    <button
                      onClick={handleLogin}
                      className="text-primary hover:text-primary/80 font-semibold transition-colors"
                    >
                      Create a free account
                    </button>
                  </p>
                </div>
              </Card>

              {/* Trust Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6 text-center text-xs text-muted-foreground"
              >
                <p>🔒 Your data is secure and encrypted</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground">
                © 2026 MAPit by SkyVee Drones. All rights reserved.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
