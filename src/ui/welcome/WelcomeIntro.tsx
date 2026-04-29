import { useEffect } from "react";
import { motion } from "framer-motion";
import { Mark } from "@/ui/components/Mark";

export interface WelcomeIntroProps {
  onSkip: () => void;
  onComplete: () => void;
  durationMs?: number;
}

export function WelcomeIntro({
  onSkip,
  onComplete,
  durationMs = 4200,
}: WelcomeIntroProps) {
  useEffect(() => {
    const id = window.setTimeout(onComplete, durationMs);
    return () => window.clearTimeout(id);
  }, [onComplete, durationMs]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.28 } }}
      className="relative flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center"
    >
      <motion.button
        type="button"
        aria-label="Skip intro"
        onClick={onSkip}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.32 }}
        className="luster-btn-text absolute right-3 top-3"
      >
        Skip
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-4"
      >
        <Mark size={56} rounded={false} />
        <div className="luster-display text-[28px] leading-none">Luster</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="luster-display mt-6 text-[18px] leading-snug text-luster-ink-soft"
      >
        Welcome to excellence.
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 2.4, duration: 0.45 }}
        className="luster-eyebrow mt-8"
      >
        let's set you up
      </motion.div>
    </motion.div>
  );
}
