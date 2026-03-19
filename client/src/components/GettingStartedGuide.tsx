import { motion } from "framer-motion";
import {
  Upload,
  Cpu,
  Layers,
  Share2,
  Zap,
  CheckCircle2,
} from "lucide-react";

const steps = [
  {
    id: "STEP 01",
    title: "THE DROP",
    subtitle: "Upload",
    icon: (
      <div className="relative w-14 h-14 flex items-center justify-center">
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]" />
        <Upload className="w-6 h-6 text-[#10b981] relative z-10" />
        {/* Ghosted file folder dots */}
        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#10b981]/40 animate-pulse" />
      </div>
    ),
    description: 'Create a new project, name it (e.g., "Bridge Retrofit Phase I"), and drag your drone .JPG or .MP4 files into the upload zone.',
    tip: "Ensure your drone's GPS is active for centimeter-level telemetry extraction.",
    tipIcon: <Zap className="w-3 h-3" />,
  },
  {
    id: "STEP 02",
    title: "AI SYNC",
    subtitle: "Process",
    icon: (
      <div className="relative w-14 h-14 flex items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]" />
        <Cpu className="w-6 h-6 text-[#10b981] relative z-10" />
        {/* Progress bar hint */}
        <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full w-3/4 bg-gradient-to-r from-[#10b981] to-emerald-300 rounded-full animate-pulse" />
        </div>
      </div>
    ),
    description:
      "Sit back. Our Auto-Telemetry engine extracts GPS coordinates and flight paths to stitch your digital twin in the cloud.",
    status: "AI is currently aligning 142 data points...",
    tip: "Processing typically completes in under 3 minutes for projects under 500 files.",
    tipIcon: <CheckCircle2 className="w-3 h-3" />,
  },
  {
    id: "STEP 03",
    title: "DESIGN OVERLAY",
    subtitle: "Visualize",
    icon: (
      <div className="relative w-14 h-14 flex items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]" />
        <Layers className="w-6 h-6 text-[#10b981] relative z-10" />
        {/* Split-screen hint */}
        <div className="absolute top-1 right-1 w-2 h-2 rounded-sm bg-[#10b981]/50" />
        <div className="absolute bottom-1 left-1 w-2 h-2 rounded-sm bg-slate-600/70" />
      </div>
    ),
    description:
      "Go to the 'Layers' tab. Upload your PDF, DXF, or DWG design files. Use the 2-point alignment tool to snap blueprints onto real-world terrain.",
    tip: "Verify utility locations before a single shovel hits the ground.",
    tipIcon: <Zap className="w-3 h-3" />,
  },
  {
    id: "STEP 04",
    title: "THE HANDOFF",
    subtitle: "Share",
    icon: (
      <div className="relative w-14 h-14 flex items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]" />
        <Share2 className="w-6 h-6 text-[#10b981] relative z-10" />
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-2xl border border-[#10b981]/20 animate-ping opacity-30" />
      </div>
    ),
    description: 'Click the "Stakeholder" icon. Generate a secure, read-only link. Email it to your City Manager or Project Lead - one click, no software install required.',
    tip: "No software install required for stakeholders - just one click to see the future of the city.",
    tipIcon: <CheckCircle2 className="w-3 h-3" />,
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export function GettingStartedGuide() {
  return (
    <section className="mt-20 border-t border-white/5 pt-12 pb-20">
      {/* Demo Project Banner — always first */}
      <div className="mb-12 p-8 bg-gradient-to-br from-[#10b981]/20 to-slate-900 border border-[#10b981]/30 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-left">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-[#10b981] animate-ping" />
            <span className="text-[#10b981] text-xs font-bold uppercase tracking-widest">Live Sandbox</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Explore a Sample Municipal Project</h3>
          <p className="text-slate-400 max-w-lg">
            Not ready to upload? Step into the <b className="text-white">City Park Redevelopment</b> project.
            Practice aligning PDF blueprints and sharing stakeholder links in real-time.
          </p>
        </div>
        <a
          href="/project/1"
          className="px-8 py-4 bg-[#10b981] text-slate-950 font-extrabold rounded-2xl hover:scale-105 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all whitespace-nowrap no-underline"
        >
          Launch Demo Project
        </a>
      </div>

      {/* Header — below Demo box */}
      <div className="mt-16 flex items-center gap-3 mb-2">
        <span className="text-[#10b981] text-xl leading-none">●</span>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Master the MAPIT Workflow
        </h2>
      </div>
      <p className="text-slate-500 text-sm mb-10 ml-7">
        Four steps from raw drone footage to a stakeholder-ready digital twin.
      </p>

      {/* Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, i) => (
          <motion.div
            key={step.id}
            custom={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={cardVariants}
          >
            <div className="relative bg-slate-900/40 border border-white/10 p-6 rounded-3xl hover:border-[#10b981]/40 transition-all group h-full flex flex-col">
              {/* Step number connector line (hidden on last) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-[3.5rem] -right-3 w-6 h-[1px] bg-gradient-to-r from-[#10b981]/30 to-transparent z-10" />
              )}

              {/* Icon */}
              <div className="mb-5">{step.icon}</div>

              {/* Step ID */}
              <div className="text-[#10b981] text-xs font-mono tracking-widest mb-1">
                {step.id}
              </div>

              {/* Title */}
              <h4 className="text-white font-bold text-base mb-0.5 group-hover:text-[#10b981] transition-colors">
                {step.title}
              </h4>
              <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">
                {step.subtitle}
              </div>

              {/* Description */}
              <p className="text-slate-400 text-xs leading-relaxed flex-1">
                {step.description}
              </p>

              {/* Status badge (step 02 only) */}
              {"status" in step && step.status && (
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#10b981] font-mono bg-[#10b981]/5 border border-[#10b981]/20 rounded-lg px-2.5 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse flex-shrink-0" />
                  {step.status}
                </div>
              )}

              {/* Pro tip */}
              <div className="mt-4 flex items-start gap-1.5 text-[10px] text-slate-500 border-t border-white/5 pt-3">
                <span className="text-[#10b981] mt-0.5 flex-shrink-0">{step.tipIcon}</span>
                <span>
                  <span className="text-[#10b981] font-semibold">Pro Tip: </span>
                  {step.tip}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
