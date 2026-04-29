import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { ProviderId } from "@/core/types";
import { WelcomeIntro } from "@/ui/welcome/WelcomeIntro";
import { WelcomeSetup } from "@/ui/welcome/WelcomeSetup";

type Phase = "intro" | "setup";

export interface WelcomeFlowProps {
  onComplete: (provider: ProviderId) => void;
}

export function WelcomeFlow({ onComplete }: WelcomeFlowProps) {
  const [phase, setPhase] = useState<Phase>("intro");

  return (
    <AnimatePresence mode="wait">
      {phase === "intro" ? (
        <WelcomeIntro
          key="intro"
          onSkip={() => setPhase("setup")}
          onComplete={() => setPhase("setup")}
        />
      ) : (
        <WelcomeSetup key="setup" onComplete={onComplete} />
      )}
    </AnimatePresence>
  );
}
