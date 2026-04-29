import type { Variants, Transition } from "framer-motion";

export const easeOutSoft: Transition["ease"] = [0.22, 1, 0.36, 1];
export const easeOutStrong: Transition["ease"] = [0.16, 1, 0.3, 1];

export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

export const blurFadeIn: Variants = {
  hidden: { opacity: 0, filter: "blur(10px)", y: 6 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: { duration: 0.52, ease: easeOutSoft },
  },
};

export const blurFadeInSubtle: Variants = {
  hidden: { opacity: 0, filter: "blur(6px)", y: 4 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: { duration: 0.36, ease: easeOutSoft },
  },
};

export const blurScaleIn: Variants = {
  hidden: { opacity: 0, filter: "blur(14px)", scale: 0.96 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    scale: 1,
    transition: { duration: 0.72, ease: easeOutSoft },
  },
};

export const fadeOutBlur: Variants = {
  visible: { opacity: 1, filter: "blur(0px)", y: 0 },
  hidden: {
    opacity: 0,
    filter: "blur(8px)",
    y: -8,
    transition: { duration: 0.36, ease: easeOutSoft },
  },
};
