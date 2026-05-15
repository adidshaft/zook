"use client";

import { motion, AnimatePresence } from "framer-motion";

export function LayoutTransition({ children, layoutKey }: { children: React.ReactNode; layoutKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={layoutKey}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="min-w-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
