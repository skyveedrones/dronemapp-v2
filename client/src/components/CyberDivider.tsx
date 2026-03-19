import { motion } from "framer-motion";

/**
 * CyberDivider — Framer Motion "charge-up" horizontal rule.
 * Scales from center outward when it enters the viewport.
 * Uses bg-slate-950 backing so it visually separates sections
 * without inheriting border colours from adjacent sections.
 */
export const CyberDivider = () => {
  return (
    <div className="relative z-10 w-full flex justify-center py-4 bg-slate-950">
      <motion.div
        className="h-[1px] w-full max-w-[90%]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #10b981 50%, transparent 100%)",
          opacity: 0.5,
          boxShadow: "0 0 8px rgba(16, 185, 129, 0.3)",
        }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </div>
  );
};

export default CyberDivider;
