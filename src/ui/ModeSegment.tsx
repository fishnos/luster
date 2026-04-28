import { motion } from "framer-motion";
import type { ModeName } from "@/core/types";
import type { ModeOverlayInfo } from "@/ui/state";
import { cn } from "@/ui/cn";

const TABS: { mode: ModeName; label: string; key: string }[] = [
  { mode: "reading", label: "Reading", key: "R" },
  { mode: "interrogation", label: "Interrogation", key: "I" },
  { mode: "critic", label: "Critic", key: "C" },
];

export interface ModeSegmentProps {
  active: ModeName;
  modes: Record<ModeName, ModeOverlayInfo>;
  onSelect: (mode: ModeName) => void;
}

export function ModeSegment({ active, modes, onSelect }: ModeSegmentProps) {
  return (
    <div
      role="tablist"
      aria-label="Mode"
      className="grid grid-cols-3 gap-1 rounded-md border border-luster-border bg-luster-surface p-1"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.mode;
        const status = modes[tab.mode].status;
        return (
          <button
            key={tab.mode}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`luster-panel-${tab.mode}`}
            onClick={() => onSelect(tab.mode)}
            className="relative flex h-7 items-center justify-center"
          >
            {isActive && (
              <motion.span
                layoutId="luster-mode-pill"
                aria-hidden
                className="absolute inset-0 rounded bg-luster-card shadow-[0_1px_0_rgba(26,24,22,0.05),0_0_0_1px_rgba(26,24,22,0.06)]"
                transition={{
                  type: "spring",
                  stiffness: 520,
                  damping: 38,
                  mass: 0.6,
                }}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex items-center gap-1.5 text-[12px] font-medium transition-colors duration-150",
                isActive ? "text-luster-ink" : "text-luster-muted",
              )}
            >
              <span
                className={cn(
                  "luster-mono text-[10px] leading-none rounded px-1 py-0.5 tracking-wider transition-colors duration-150",
                  isActive
                    ? "bg-luster-accent-soft text-luster-accent"
                    : "bg-luster-subtle text-luster-faint",
                )}
              >
                {tab.key}
              </span>
              {tab.label}
            </span>
            {status === "pending" && (
              <span className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-luster-accent luster-pulse" />
            )}
            {status === "error" && (
              <span className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-luster-err" />
            )}
            {status === "rate-limited" && (
              <span className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-luster-warn" />
            )}
          </button>
        );
      })}
    </div>
  );
}
