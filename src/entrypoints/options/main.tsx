import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import "@/ui/theme.css";
import { Mark } from "@/ui/components/Mark";
import { AmbientBackdrop } from "@/ui/components/AmbientBackdrop";
import { InlineSettings } from "@/ui/InlineSettings";
import { blurFadeIn, staggerContainer } from "@/ui/motion/staggered";

function Options() {
  return (
    <div className="luster-root relative min-h-screen overflow-hidden bg-luster-ink0">
      <AmbientBackdrop />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-10 px-6 py-20">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.header
            variants={blurFadeIn}
            className="mb-10 flex items-center gap-3"
          >
            <Mark size={28} />
            <h1 className="luster-display text-[22px] leading-none">Luster</h1>
          </motion.header>

          <motion.div variants={blurFadeIn}>
            <InlineSettings
              onBack={() => window.close()}
              onConnectionChange={() => {}}
              onAutoLaunchChange={() => {}}
              onDefaultModeChange={() => {}}
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Options />);
