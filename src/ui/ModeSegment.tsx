import type { ModeName } from "@/core/types";
import type { ModeOverlayInfo } from "@/ui/state";
import { cn } from "@/ui/cn";

interface TabSpec {
  mode: ModeName;
  label: string;
  fullName: string;
  numeral: string;
}

const TABS: TabSpec[] = [
  { mode: "reading", label: "read", fullName: "reading", numeral: "i" },
  {
    mode: "interrogation",
    label: "ask",
    fullName: "interrogation",
    numeral: "ii",
  },
  { mode: "critic", label: "crit", fullName: "critic", numeral: "iii" },
  { mode: "echo", label: "echo", fullName: "echo", numeral: "iv" },
];

export interface ModeSegmentProps {
  active: ModeName;
  modes: Record<ModeName, ModeOverlayInfo>;
  onSelect: (mode: ModeName) => void;
}

export function ModeSegment({ active, onSelect }: ModeSegmentProps) {
  return (
    <div role="tablist" aria-label="Mode" className="flex items-stretch">
      {TABS.map(({ mode, label, fullName, numeral }) => {
        const isActive = active === mode;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={fullName}
            aria-controls={`luster-panel-${mode}`}
            onClick={() => onSelect(mode)}
            className={cn(
              "luster-press flex flex-1 flex-col items-center gap-1 py-1 font-mono text-[10px] uppercase leading-none tracking-[0.16em] transition-colors",
              isActive
                ? "text-luster-ink"
                : "text-luster-faint hover:text-luster-muted",
            )}
          >
            <span className="text-[9px] tracking-[0.34em] opacity-60">
              {numeral}
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
