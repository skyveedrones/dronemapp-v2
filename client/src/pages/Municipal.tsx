/**
 * Municipal Solutions Landing Page
 * "Infrastructure Intelligence" — targeting City Managers and Municipal Leaders
 * Design: Institutional Blue + Slate Gray palette for stability and trust
 */

import { Button } from "@/components/ui/button";
import { MunicipalBriefingForm } from "@/components/MunicipalBriefingForm";
import Footer from "@/components/Footer";
import { GlobalHamburgerHeader } from "@/components/GlobalHamburgerHeader";
import { motion } from "framer-motion";
import {
  Building2,
  ChevronRight,
  Eye,
  FileCheck,
  Globe,
  Layers,
  Lock,
  Plane,
  Shield,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/municipal-hero-aerial_0ce36c3a.jpg";
const ENGINEERS_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/municipal-engineers-tablet_c89926cd.jpg";
const TRENCH_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/muni-card-subsurface-XheCyMcVLXCFkjdcG9yGnT.webp";
const DIGITAL_TWIN_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/muni-card-interdept-3mR7B9wUkt5ZFwjKKdLgCB.webp";
const GIS_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/muni-card-overlay-3nmwWrVxQ8Zqmu4hBtuZ8r.webp";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const pillars = [
  {
    icon: Eye,
    title: "Sub-Surface Verification",
    value:
      'Document "open trench" utility installations before they are buried. Create a permanent X-ray of city assets for future maintenance.',
    image: TRENCH_IMG,
  },
  {
    icon: Users,
    title: "Inter-Departmental Access",
    value:
      "Shared situational awareness for Public Works, Engineering, Fire, and Planning. One map, zero data silos.",
    image: DIGITAL_TWIN_IMG,
  },
  {
    icon: Layers,
    title: "Engineering-Grade Overlays",
    value:
      "Verify construction alignment against design plans with centimeter-level precision using our 2-point calibration engine.",
    image: GIS_IMG,
  },
  {
    icon: FileCheck,
    title: "Stakeholder Accountability",
    value:
      "Generate visual progress reports for City Council, public meetings, and project stakeholders — proving that infrastructure investments are on-time and on-budget.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/muni-card-accountability-QNNJ3wMUutMTCmeXaRCJqc.webp",
  },
];

const compliancePoints = [
  {
    icon: Globe,
    title: "Data Sovereignty",
    text: "All project data is archived in secure, US-based cloud storage for long-term historical reference.",
  },
  {
    icon: Layers,
    title: "GIS Integration",
    text: "Export high-resolution orthomosaics directly into your city's existing ArcGIS or AutoCAD workflows.",
  },
  {
    icon: Plane,
    title: "FAA Compliant",
    text: "All flights are conducted by Part 107 certified pilots with comprehensive liability insurance.",
  },
];

export default function Municipal() {
  const [, setLocation] = useLocation();
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b1120] text-white overflow-y-auto">
      {/* ─── Navigation ─── */}
      <GlobalHamburgerHeader />

      {/* ─── Section 1: Hero ─── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b1120]/80 via-[#0b1120]/60 to-[#0b1120]" />
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="relative z-10 max-w-4xl mx-auto px-6 text-center"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-1.5 mb-8">
            <Building2 className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300 tracking-wide">Municipal Infrastructure Intelligence</span>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The Digital Foundation of{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Your City's Future
            </span>
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Bridge the gap between City Hall and the Job Site. MAPIT provides municipal leaders with the visual
            transparency needed to manage infrastructure, mitigate risk, and protect taxpayer investment.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base font-semibold shadow-lg shadow-blue-600/20"
              onClick={() => setContactOpen(true)}
            >
              Request a Municipal Briefing
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-slate-500 text-slate-200 hover:bg-slate-800 px-8 py-6 text-base"
              onClick={() => document.getElementById("pillars")?.scrollIntoView({ behavior: "smooth" })}
            >
              View Service Capabilities
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Section 2: The Municipal Challenge ─── */}
      <section className="py-24 px-6 bg-[#0d1526]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 gap-16 items-center"
          >
            <motion.div variants={fadeInUp}>
              <h2
                className="text-3xl sm:text-4xl font-bold mb-6 leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Infrastructure shouldn't be a{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                  "Best Guess."
                </span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                Most municipalities rely on fragmented data and aging paper plans. This leads to utility strikes, budget
                overruns, and a lack of historical records.
              </p>
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-6">
                <h3 className="text-blue-300 font-semibold text-lg mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  The MAPIT Answer
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  We provide a <strong className="text-white">Single Source of Truth</strong>. By combining
                  high-resolution drone imagery with precision design overlays, we create a{" "}
                  <strong className="text-white">"Digital Twin"</strong> of your city's progress.
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/20 border border-slate-700/50">
                <img src={DIGITAL_TWIN_IMG} alt="Digital Twin visualization" className="w-full h-auto" />
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-600/10 rounded-full blur-2xl" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Section 3: Key Pillars of Municipal Success ─── */}
      <section id="pillars" className="py-24 px-6 bg-[#0b1120]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <h2
                className="text-3xl sm:text-4xl font-bold mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Key Pillars of{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  Municipal Success
                </span>
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                From underground utilities to City Council presentations, MAPIT covers every stage of infrastructure
                oversight.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {pillars.map((pillar, i) => (
                <motion.div
                  key={pillar.title}
                  variants={fadeInUp}
                  className="group relative bg-[#111b2e] border border-slate-700/50 rounded-2xl overflow-hidden hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 cursor-pointer"
                  onClick={() => setContactOpen(true)}
                >
                  {/* Image strip with blueprint-swipe reveal on hover */}
                  <div className="h-52 overflow-hidden relative">
                    {/* Base image */}
                    <img
                      src={pillar.image}
                      alt={pillar.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* Blueprint overlay that slides in from left on hover */}
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-blue-800/70 to-transparent
                        translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out
                        flex items-center justify-start pl-6"
                    >
                      <div className="text-blue-300 opacity-30 select-none pointer-events-none">
                        <svg width="180" height="120" viewBox="0 0 180 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="10" y="10" width="160" height="100" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 2" />
                          <line x1="10" y1="40" x2="170" y2="40" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="10" y1="70" x2="170" y2="70" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="50" y1="10" x2="50" y2="110" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="100" y1="10" x2="100" y2="110" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="140" y1="10" x2="140" y2="110" stroke="currentColor" strokeWidth="0.5" />
                          <circle cx="50" cy="40" r="4" stroke="currentColor" strokeWidth="1" fill="none" />
                          <circle cx="140" cy="70" r="4" stroke="currentColor" strokeWidth="1" fill="none" />
                          <line x1="50" y1="40" x2="140" y2="70" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
                        </svg>
                      </div>
                      <div className="absolute top-3 right-3 bg-blue-600/80 text-white text-xs font-semibold px-2 py-1 rounded">
                        Click to Request Briefing
                      </div>
                    </div>
                    <div className="absolute inset-0 h-52 bg-gradient-to-t from-[#111b2e] via-transparent to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="p-6 -mt-8 relative z-10">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 mb-4 group-hover:bg-blue-600/40 transition-colors duration-300">
                      <pillar.icon className="h-6 w-6 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors duration-300">{pillar.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{pillar.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Section 4: Security & Compliance ─── */}
      <section id="compliance" className="py-24 px-6 bg-[#0d1526]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-slate-700/30 border border-slate-600/40 rounded-full px-4 py-1.5 mb-6">
                <Lock className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-400 tracking-wide">Enterprise Security</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl font-bold mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Built for{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400">
                  Local Government Standards
                </span>
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {compliancePoints.map((point) => (
                <motion.div
                  key={point.title}
                  variants={fadeInUp}
                  className="bg-[#111b2e] border border-slate-700/50 rounded-2xl p-8 text-center hover:border-slate-600/60 transition-colors"
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-700/30 border border-slate-600/40 mb-6">
                    <point.icon className="h-7 w-7 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">{point.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">{point.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Section 5: Pilot Program CTA ─── */}
      <section className="py-24 px-6 bg-[#0b1120] relative overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-cyan-900/10" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl font-bold mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Smart Data for the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Modern Municipality
            </span>
          </motion.h2>

          <motion.p variants={fadeInUp} className="text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Interested in modernizing your project oversight? We offer a{" "}
            <strong className="text-white">Municipal Pilot Program</strong> designed to demonstrate the MAPIT impact on
            your most complex active job site.
          </motion.p>

          <motion.div variants={fadeInUp}>
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-6 text-base font-semibold shadow-lg shadow-blue-600/20"
              onClick={() => setContactOpen(true)}
            >
              Apply for the Pilot Program
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>

          <motion.p variants={fadeInUp} className="mt-6 text-sm text-slate-500">
            No commitment required. We'll schedule a 30-minute discovery call to assess fit.
          </motion.p>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <Footer onContactClick={() => setContactOpen(true)} />

      {/* ─── Contact Modal ─── */}
      <MunicipalBriefingForm open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
