"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export function LayoutTransition({ children, layoutKey }: { children: React.ReactNode; layoutKey: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={layoutKey}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: 18, scale: 0.992 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -12, scale: 0.996 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="min-w-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
