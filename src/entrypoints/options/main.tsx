import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import "@/ui/theme.css";
import { Mark } from "@/ui/components/Mark";
import { GlassCard } from "@/ui/components/GlassCard";
import { AmbientBackdrop } from "@/ui/components/AmbientBackdrop";
import { InlineSettings } from "@/ui/InlineSettings";
import { blurFadeIn, staggerContainer } from "@/ui/motion/staggered";

function Options() {
  return (
    <div className="luster-root relative min-h-screen overflow-hidden bg-luster-ink0">
      <AmbientBackdrop />
      <div className="relative z-10 flex justify-center px-4 py-16">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex w-full max-w-lg flex-col gap-6"
        >
          <motion.header
            variants={blurFadeIn}
            className="flex items-center gap-3"
          >
            <Mark size={36} />
            <div className="flex flex-col gap-1">
              <h1 className="luster-display text-[26px] leading-none text-luster-ink">
                Luster
              </h1>
              <p className="text-[12px] text-luster-muted">
                Settings · same controls as inside the writing panel.
              </p>
            </div>
          </motion.header>

          <motion.div variants={blurFadeIn}>
            <GlassCard className="p-5">
              <InlineSettings
                onBack={() => window.close()}
                onConnectionChange={() => {}}
                onAutoLaunchChange={() => {}}
                onDefaultModeChange={() => {}}
              />
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Options />);
