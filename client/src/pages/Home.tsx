/**
 * Mapit - Home Page
 * Design: Aurora Borealis Theme
 * - Dark forest green interface with lime/neon green accents
 * - Colors: Spearmint #117660, Forest Green #09323B, Lime Green #04B16F, Neon Green #14E114
 * - Orbitron display font, Inter body font
 * - Glowing card effects on hover
 * - Grid/topographic patterns
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { AppDownloadDialog } from "@/components/AppDownloadDialog";
import { trackEvent } from "@/lib/analytics";
import { motion } from "framer-motion";
import Features from "@/components/Features";
import Footer from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import {
  Upload,
  Map,
  Route,
  Download,
  Layers,
  FileText,
  ChevronRight,
  Menu,
  X,
  LogOut,
  User,
  Moon,
  Sun,
  Eye,
  Zap,
  Cpu,
  LayoutDashboard,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";

const features = [
  {
    icon: Upload,
    title: "Easy Upload",
    description:
      "Upload drone photos and videos with automatic GPS metadata extraction",
    image: "/images/feature-upload-new.jpg",
    link: "/features/easy-upload",
  },
  {
    icon: Map,
    title: "Interactive Maps",
    description:
      "Visualize your flights on Google Maps with markers, popups, and key data",
    image: "/images/feature-maps-new.jpg",
    link: "/features/interactive-maps",
  },
  {
    icon: Route,
    title: "Flight Path Tracking",
    description:
      "Automatic flight path visualization connecting sequential GPS points",
    image: "/images/feature-flightpath-new.jpg",
    link: "/features/flight-path-tracking",
  },
  {
    icon: Download,
    title: "GPS Data Export",
    description:
      "Export in KML, CSV, GeoJSON, and GPX formats for any mapping software",
    image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663204719166/gkNBTHRsPHDBWczp.png",
    link: "/features/gps-data-export",
  },
  {
    icon: Layers,
    title: "Project Map Overlay",
    description:
      "Overlay construction plans on your maps with precise corner positioning.",
    image: "/images/feature-overlay-new.jpg",
    link: "/features/pdf-map-overlay",
  },

  {
    icon: FileText,
    title: "Project Templates",
    description:
      "Save project configurations as templates and create new projects in seconds",
    image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663204719166/SxjCbukJOAezRSZP.png",
    link: "/features/project-templates",
  },
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

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [, setLocation] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogin = () => {
    setLocation("/login");
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
  };

  return (
    <div className="min-h-screen text-foreground">
      {/* Minimalist Navigation - Scroll-triggered transition */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        scrolled
          ? 'bg-black/60 backdrop-blur-md border-b border-white/10'
          : 'bg-black/20 backdrop-blur-md border-b border-white/10'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Minimalist Logo Group with Hover Glow */}
          <div className="flex items-center gap-3 group cursor-pointer hover:opacity-90 transition-opacity">
            <div className="relative">
              {/* Subtle glow behind logo on hover */}
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <img
                src="/images/mapit-logo-new.png"
                alt="MAPIT"
                className="h-12 md:h-14 w-auto relative z-10 transition-transform group-hover:scale-105"
              />
            </div>
          </div>

          {/* Navigation - Clean and Minimal */}
          <div className="flex items-center gap-6">
            {/* Desktop Navigation Links */}
            <div className="hidden sm:flex items-center gap-6">
              <button
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Services
              </button>
              <button
                onClick={() => setLocation("/pricing")}
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Projects
              </button>
            </div>

            {/* Theme Toggle with Tooltip */}
            <div className="group relative">
              <button 
                onClick={toggleTheme} 
                className="p-2 text-gray-300 hover:text-white transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <div className="absolute top-full right-0 mt-2 scale-0 group-hover:scale-100 transition-all origin-top-right bg-black border border-white/10 px-2 py-1 rounded text-[10px] text-primary font-bold tracking-widest uppercase z-[200] whitespace-nowrap">
                Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
              </div>
            </div>

            {/* CTA Button or Auth Buttons */}
            {isAuthenticated && user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white"
                  onClick={() => setLocation("/dashboard")}
                >
                  Dashboard
                </Button>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  className="px-5 py-2 border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-all font-bold"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Sign In"}
                </Button>
              </>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden text-gray-300 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden border-t border-white/10 bg-black/40 backdrop-blur-md"
          >
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-3">
              <button
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  setMobileMenuOpen(false);
                }}
                className="text-left text-sm font-medium text-gray-300 hover:text-white transition-colors py-2"
              >
                Services
              </button>
              <button
                onClick={() => {
                  setLocation("/pricing");
                  setMobileMenuOpen(false);
                }}
                className="text-left text-sm font-medium text-gray-300 hover:text-white transition-colors py-2"
              >
                Projects
              </button>
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-300 py-2">
                    <User className="h-4 w-4" />
                    <span>{user.name || user.email || "User"}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-primary/50 text-primary"
                    onClick={() => {
                      setLocation("/dashboard");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-gray-300"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="w-full border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white rounded-full font-bold mt-2 hover:bg-slate-100 dark:hover:bg-white/5"
                  onClick={() => {
                    handleLogin();
                    setMobileMenuOpen(false);
                  }}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Sign In"}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </nav>

      {/* Top Gradient Overlay for Readability */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-start pt-0">
        <div className="relative z-10 text-center pt-2 md:pt-3 lg:pt-4 w-full">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-4xl mx-auto"
          >




          </motion.div>
        </div>

        {/* Video Section with CTA Buttons */}
        <section className="relative w-full pt-20 lg:pt-24 h-[70vh] min-h-[500px] overflow-hidden bg-black pb-0">
          {/* 1. THE VIDEO: Forced to cover every pixel */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/VideoProject_e838c8e5.mp4" type="video/mp4" />
          </video>
          {/* 2. THE BASE OVERLAY: Subtle and clean */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white/10" />
          {/* 3. THE TOP GRADIENT: Fades from black to clear for the Nav */}
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black via-black/60 to-transparent z-10" />
          {/* 4. THE CONTENT: Centered perfectly over the video */}
          <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-6">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white text-4xl md:text-6xl font-extrabold tracking-tighter mb-4 drop-shadow-lg"
              style={{ textShadow: '0 4px 12px rgba(0, 0, 0, 0.8)' }}
            >
              ELEVATE YOUR <span className="text-primary">VISION</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-200 text-lg md:text-xl max-w-2xl leading-relaxed"
            >
              Precise drone mapping and geospatial data for smarter project planning.
            </motion.p>
          </div>

        </section>

        {/* --- BUTTON BRIDGE --- */}
        <div className="bg-white dark:bg-black pt-20 pb-10 flex flex-col md:flex-row justify-center items-center gap-6 relative z-50 transition-colors duration-300">
          {/* The Get Started Button navigates to Welcome page */}
          <Link href="/welcome">
            <button
              className="px-10 py-4 bg-primary text-primary-foreground font-extrabold rounded-full hover:scale-105 transition-all shadow-[0_0_20px_rgba(20,225,20,0.3)] tracking-wide uppercase text-sm"
            >
              Get Started
            </button>
          </Link>

          {/* The Learn More Button scrolls to Features */}
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-10 py-4 border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white font-bold rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-all tracking-wide uppercase text-sm"
          >
            Learn More
          </button>
        </div>

        {/* SECTION 2: STEPPER CARDS */}
        <section className="relative bg-white dark:bg-black pt-16 pb-12 md:pb-16 px-6 z-40 transition-colors duration-300">
          {/* Branded Background "Wing" Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-24">
              <h2 className="text-3xl md:text-5xl font-bold font-semibold tracking-tight text-slate-900 dark:text-white mb-6">
                From Flight to <span className="text-primary">Data</span> in Minutes
              </h2>
              <p className="text-slate-600 dark:text-gray-400 max-w-2xl mx-auto text-lg">
                The streamlined workflow designed for drone professionals and project managers.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-50">
              {[
                {
                  title: "Upload",
                  impact: "Drag, Drop, Done.",
                  desc: "Instant cloud sync for high-res drone media.",
                  icon: Upload,
                },
                {
                  title: "Process",
                  impact: "Auto-Telemetry.",
                  desc: "AI-driven extraction of GPS and flight paths.",
                  icon: Cpu,
                },
                {
                  title: "Visualize",
                  impact: "Map Your Success.",
                  desc: "Interactive 3D maps and pro-grade exports.",
                  icon: LayoutDashboard,
                },
              ].map((step, index) => {
                const IconComponent = step.icon;
                return (
                  <div 
                    key={index} 
                    className="group p-8 rounded-2xl bg-slate-100/50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 hover:border-[#22c55e] dark:hover:border-[#22c55e] hover:-translate-y-1 shadow-sm dark:shadow-none hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start gap-5">
                      {/* Icon with Mapit Glow */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(20,225,20,0.1)] group-hover:shadow-[0_0_25px_rgba(20,225,20,0.3)] transition-all">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                      
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold mb-1 block">
                          Step 0{index + 1}
                        </span>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 transition-colors duration-300">{step.title}</h3>
                        <p className="text-slate-900 dark:text-white font-medium mb-1 transition-colors duration-300">{step.impact}</p>
                        <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed transition-colors duration-300">{step.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      </section>

      {/* SECTION 3: UNIVERSAL COMPATIBILITY */}
      <section className="relative bg-slate-50 dark:bg-black pt-12 pb-12 md:pb-16 border-y border-slate-100 dark:border-white/5 z-20 transition-colors duration-300">
        {/* Radial Glow for depth */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold tracking-[0.3em] text-primary uppercase mb-4">
              Universal Integration
            </h2>
            <h3 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white transition-colors duration-300">
              Compatible with <span className="text-slate-900 dark:text-white">All Major Drone Manufacturers</span>
            </h3>
            <p className="text-slate-600 dark:text-gray-400 mt-6 max-w-2xl mx-auto text-lg transition-colors duration-300">
              If your aircraft records GPS metadata, our system can process it.
              Zero proprietary hardware locks.
            </p>
          </div>

          {/* Brand Grid: Clean, minimalist logos */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-12 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-12 items-center justify-items-center opacity-60 dark:opacity-60">
            <div className="flex flex-col items-center group">
              <span className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">DJI</span>
              <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-gray-500 mt-1">Enterprise</span>
            </div>
            <div className="flex flex-col items-center group">
              <span className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">AUTEL</span>
              <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-gray-500 mt-1">Robotics</span>
            </div>
            <div className="flex flex-col items-center group">
              <span className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">PARROT</span>
              <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-gray-500 mt-1">Anafi Series</span>
            </div>
            <div className="flex flex-col items-center group">
              <span className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">SKYDIO</span>
              <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-gray-500 mt-1">Autonomous</span>
            </div>
            <div className="flex flex-col items-center group">
              <span className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">MAVLINK</span>
              <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-gray-500 mt-1">Open Source</span>
            </div>
            <div className="flex flex-col items-center group">
              <span className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">FIXED WING</span>
              <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-gray-500 mt-1">VTOL / Professional</span>
            </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="px-6 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full flex items-center gap-3 transition-colors duration-300">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-slate-600 dark:text-gray-400 text-sm font-medium transition-colors duration-300">Supporting 99.9% of commercial metadata formats (KML, CSV, GeoJSON)</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: FEATURES */}
      <section id="features" className="relative bg-white dark:bg-black pt-12 md:pt-16 pb-12 md:pb-16 px-6 z-10 border-t border-slate-100 dark:border-white/5 transition-colors duration-300">
        <Features />
      </section>

      {/* SECTION 5: HIRE A PILOT SERVICE */}
      <section className="relative bg-white dark:bg-slate-900 py-16 md:py-24 px-6 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none transition-colors duration-300 rounded-lg mx-6 my-8">
        <div className="container max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 transition-colors duration-300"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Need a Professional Pilot?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-slate-700 dark:text-gray-300 text-lg mb-8 max-w-2xl mx-auto leading-relaxed transition-colors duration-300"
            >
              Don't have a drone or a Part 107 pilot? SkyVee Drones provides full-service aerial data collection and infrastructure inspections nationwide.
            </motion.p>
            <motion.div variants={fadeInUp}>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-black font-bold"
                onClick={() => window.open('https://www.skyveedrones.com', '_blank')}
              >
                Visit SkyVee Drones
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Old Features Section - Removed */}
      <section className="hidden py-16 relative">
        <div className="absolute inset-0 topo-pattern" />
        <div className="container relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Powerful Drone Mapping Features
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground max-w-2xl mx-auto"
            >
              Everything you need to manage, visualize, and share your aerial
              mapping projects
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <Link key={feature.title} href={feature.link}>
                <motion.div
                  variants={fadeInUp}
                  className="glow-card overflow-hidden cursor-pointer group h-full transition-transform duration-300 hover:-translate-y-2"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    e.currentTarget.style.setProperty("--mouse-x", `${x}%`);
                    e.currentTarget.style.setProperty("--mouse-y", `${y}%`);
                  }}
                >
                  {/* Feature Image */}
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  {/* Feature Content */}
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3
                          className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="pt-12 md:pt-16 pb-12 relative overflow-hidden bg-white dark:bg-black transition-colors duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 dark:from-primary/10 dark:via-transparent dark:to-primary/10" />
        <div className="absolute inset-0 grid-pattern dark:opacity-20" />

        <div className="container relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 transition-colors duration-300"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to Map Your Projects?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-slate-600 dark:text-gray-400 mb-8 transition-colors duration-300"
            >
              Start organizing and visualizing your drone footage today
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 text-lg px-8 py-6 rounded-lg"
                onClick={() => {
                  setShowContactModal(true);
                }}
              >
                <Zap className="mr-2 h-5 w-5" />
                Request a Briefing
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 text-lg px-8 py-6 rounded-lg"
                onClick={() => {
                  trackEvent('demo_to_trial_click');
                  setLocation('/welcome');
                }}
              >
                <Zap className="mr-2 h-5 w-5" />
                Start New Trial
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer - Using new component */}
      <Footer onContactClick={() => setShowContactModal(true)} />

      {/* Download Dialog */}
      {showDownloadDialog && (
        <AppDownloadDialog
          open={showDownloadDialog}
          onOpenChange={setShowDownloadDialog}
        />
      )}
      
      {/* Contact Modal */}
      <ContactModal
        open={showContactModal}
        onOpenChange={setShowContactModal}
      />
    </div>
  );
}
