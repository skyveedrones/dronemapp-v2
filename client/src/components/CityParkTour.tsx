/**
 * CityParkTour — Guided 4-step DemoOnboarding overlay for the City Park Redevelopment project.
 *
 * Matches the DemoOnboarding spec exactly:
 * - w-96 card, bottom-center, z-[999], bg-slate-900/90, border-[#10b981]
 * - "WALKTHROUGH: STEP 0X" mono label
 * - Full-width action button
 * - Step 4 fires onLaunchFlyby then closes
 * - ✕ dismiss button at top-right
 */

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";

// ── Tour step data (exact copy from spec) ─────────────────────────────────────

const STEPS = [
  {
    title: "Step 01: The Data Drop",
    text: "This project started with 142 raw drone photos. MAPIT's AI stitched them into this centimeter-accurate base map.",
    btn: "Next: Check Overlays",
  },
  {
    title: "Step 02: PDF & CAD Alignment",
    text: "Open the 'Layers' tab. We've overlaid a Utility PDF. See how the sewer lines match the physical manholes on the map?",
    btn: "Next: Verify Measurements",
  },
  {
    title: "Step 03: Precision Metrics",
    text: "Look at the playground area. That 4,500 sq ft measurement was generated in two clicks. No tape measure required.",
    btn: "Final: Launch Flyby",
  },
  {
    title: "The Stakeholder 'Wow' Moment",
    text: "This is the Cinematic Flyby. It's how you present your work to the City Manager. Ready for takeoff?",
    btn: "START FLYBY",
  },
] as const;

// ── Props ──────────────────────────────────────────────────────────────────────

export interface CityParkTourProps {
  /** Called when the user hits START FLYBY on step 4 */
  onLaunchFlyby?: () => void;
  /** Called when the tour is dismissed (✕ or after flyby launch) */
  onClose?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CityParkTour({ onLaunchFlyby, onClose }: CityParkTourProps) {
  const [step, setStep] = useState(1);
  const [visible, setVisible] = useState(true);

  const current = STEPS[step - 1];

  const handleAction = () => {
    if (step < 4) {
      setStep((s) => s + 1);
    } else {
      // Step 4 — fire flyby then close
      onLaunchFlyby?.();
      dismiss();
    }
  };

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onClose?.(), 350);
  };

  const isFinalStep = step === 4;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="demo-onboarding"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="fixed bottom-12 left-1/2 -translate-x-1/2 w-96 max-w-[calc(100vw-2rem)] bg-slate-900/90 border-2 border-[#10b981] p-6 rounded-3xl shadow-2xl z-[999] backdrop-blur-md"
        >
          {/* Dismiss button */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            aria-label="Close walkthrough"
          >
            <X size={15} />
          </button>

          {/* Step label */}
          <h4 className="text-[#10b981] font-mono text-xs mb-2 tracking-widest uppercase">
            Walkthrough: Step 0{step}
          </h4>

          {/* Step content — crossfade between steps */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              <h3 className="text-white font-bold text-lg mb-2">{current.title}</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">{current.text}</p>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  i < step ? "bg-[#10b981]" : "bg-slate-700"
                }`}
              />
            ))}
          </div>

          {/* Full-width action button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleAction}
            className={`w-full py-3 font-black rounded-xl transition-all text-slate-900 ${
              isFinalStep
                ? "bg-[#10b981] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] text-base tracking-widest uppercase"
                : "bg-[#10b981] hover:bg-[#0da673]"
            }`}
          >
            {current.btn}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
