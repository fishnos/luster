import { useEffect } from "react";
import { motion } from "framer-motion";
import { Mark } from "@/ui/components/Mark";
import { SplitText } from "@/ui/motion/SplitText";
import { blurFadeIn, blurScaleIn, easeOutSoft } from "@/ui/motion/staggered";

export interface WelcomeIntroProps {
  onSkip: () => void;
  onComplete: () => void;
  durationMs?: number;
}

export function WelcomeIntro({
  onSkip,
  onComplete,
  durationMs = 5400,
}: WelcomeIntroProps) {
  useEffect(() => {
    const id = window.setTimeout(onComplete, durationMs);
    return () => window.clearTimeout(id);
  }, [onComplete, durationMs]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(8px)", transition: { duration: 0.36 } }}
      className="relative flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center"
    >
      <motion.button
        type="button"
        aria-label="Skip intro"
        onClick={onSkip}
        variants={blurFadeIn}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.4, duration: 0.36, ease: easeOutSoft }}
        className="luster-press absolute right-3 top-3 text-[10px] uppercase tracking-[0.18em] text-luster-faint hover:text-luster-ink-soft transition-colors"
      >
        Skip
      </motion.button>

      <motion.div
        variants={blurScaleIn}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2, duration: 0.72, ease: easeOutSoft }}
        className="flex flex-col items-center gap-4"
      >
        <Mark size={56} />
        <div className="luster-display text-[28px] leading-none text-luster-ink">
          Luster
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.05, duration: 0.6 }}
        className="mt-6"
      >
        <SplitText
          text="Welcome to excellence."
          by="word"
          delay={1.1}
          stagger={0.1}
          className="luster-display text-[18px] leading-snug text-luster-ink-soft"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 2.6, duration: 0.5 }}
        className="luster-eyebrow mt-8"
      >
        let's set you up
      </motion.div>
    </motion.div>
  );
}
