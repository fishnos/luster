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
  const activeIndex = Math.max(
    0,
    TABS.findIndex((tab) => tab.mode === active),
  );
  return (
    <div
      role="tablist"
      aria-label="Mode"
      className="relative grid grid-cols-3 gap-0 rounded-md border border-luster-border bg-luster-surface/70 p-1"
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 rounded bg-luster-card shadow-[0_1px_0_rgba(26,24,22,0.05),0_0_0_1px_rgba(26,24,22,0.06)]"
        style={{
          left: 4,
          width: "calc((100% - 8px) / 3)",
        }}
        animate={{ x: `${activeIndex * 100}%` }}
        transition={{
          type: "spring",
          stiffness: 520,
          damping: 38,
          mass: 0.55,
        }}
      />
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
            className="luster-press relative z-10 flex h-7 items-center justify-center gap-1.5"
          >
            <span
              className={cn(
                "flex items-center gap-1.5 text-[12px] font-medium transition-colors duration-150",
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
