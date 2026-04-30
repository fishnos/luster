import type { ModeName } from "@/core/types";
import type { ModeOverlayInfo } from "@/ui/state";

interface TabSpec {
  mode: ModeName;
  label: string;
  numeral: string;
}

const TABS: TabSpec[] = [
  { mode: "reading", label: "reading", numeral: "i" },
  { mode: "interrogation", label: "interrogation", numeral: "ii" },
  { mode: "critic", label: "critic", numeral: "iii" },
  { mode: "echo", label: "echo", numeral: "iv" },
];

export interface ModeSegmentProps {
  active: ModeName;
  modes: Record<ModeName, ModeOverlayInfo>;
  onSelect: (mode: ModeName) => void;
}

export function ModeSegment({ active, onSelect }: ModeSegmentProps) {
  return (
    <div
      role="tablist"
      aria-label="Mode"
      className="flex items-center justify-between"
    >
      {TABS.map(({ mode, label, numeral }) => {
        const isActive = active === mode;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`luster-panel-${mode}`}
            data-active={isActive}
            onClick={() => onSelect(mode)}
            className="luster-mode-tab luster-press flex flex-1 flex-col items-center gap-0.5"
          >
            <span className="text-[8px] tracking-[0.34em] opacity-60">
              {numeral}
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
