"use client";

import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { formatNumber } from "@/lib/format";

const SMOOTH_EASE = [0.22, 1, 0.36, 1] as const;

type RevealProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  id?: string;
  as?: "div" | "section" | "header" | "footer" | "ol" | "ul" | "dl";
};

/**
 * Smooth on-mount reveal. We deliberately avoid `whileInView` and
 * opacity-from-0 initials because both leave content invisible in SSR
 * snapshots and Playwright fullPage screenshots (the IntersectionObserver
 * or animation hasn't fired by capture time). Animating only the transform
 * + a soft opacity ramp from 0.4 keeps the cascade feel for users while
 * keeping every element legible to static renderers.
 */
export function Reveal({ children, delay = 0, y = 24, className, id, as = "div" }: RevealProps) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as] as typeof motion.div;
  if (reduceMotion) {
    return (
      <Component id={id} className={className}>
        {children}
      </Component>
    );
  }
  return (
    <Component
      id={id}
      initial={{ opacity: 0.4, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: SMOOTH_EASE }}
      className={className}
    >
      {children}
    </Component>
  );
}

export function Stagger({
  children,
  className,
  gap = 0.07,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: gap, delayChildren: delay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  y = 16,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0.4, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: SMOOTH_EASE },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Transitions.dev-inspired surface motion: subtle lift, shared layout, no noisy theatrics. */
export function MotionSurface({
  children,
  className,
  intensity = "lift",
}: {
  children: ReactNode;
  className?: string;
  intensity?: "lift" | "press" | "steady";
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion || intensity === "steady") {
    return (
      <motion.div layout className={className}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      className={className}
      whileHover={intensity === "press" ? { scale: 0.995 } : { y: -3, scale: 1.004 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
    >
      {children}
    </motion.div>
  );
}

/** Animated number that counts up to `value` once it enters view. */
export function Counter({
  value,
  suffix = "",
  prefix = "",
  duration = 1.4,
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "0px 0px 200px 0px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: duration * 1000, bounce: 0 });
  const rounded = useTransform(spring, (v) => {
    if (value >= 1000) return formatNumber(Math.round(v));
    if (value % 1 === 0) return Math.round(v).toString();
    return formatNumber(v, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  });

  useEffect(() => {
    if (reduceMotion) {
      mv.set(value);
      return;
    }
    if (inView) mv.set(value);
  }, [inView, mv, reduceMotion, value]);

  if (reduceMotion) {
    return (
      <span ref={ref} className={className}>
        {prefix}
        {formatNumber(value, {
          maximumFractionDigits: value % 1 === 0 ? 0 : 1,
          minimumFractionDigits: value % 1 === 0 ? 0 : 1,
        })}
        {suffix}
      </span>
    );
  }

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
