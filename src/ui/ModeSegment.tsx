import { Eye, HelpCircle, Target } from "lucide-react";
import type { ComponentType } from "react";
import type { ModeName } from "@/core/types";
import type { ModeOverlayInfo } from "@/ui/state";
import { cn } from "@/ui/cn";

interface TabSpec {
  mode: ModeName;
  label: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
}

const TABS: TabSpec[] = [
  { mode: "reading", label: "Reading", Icon: Eye },
  { mode: "interrogation", label: "Interrogation", Icon: HelpCircle },
  { mode: "critic", label: "Critic", Icon: Target },
];

export interface ModeSegmentProps {
  active: ModeName;
  modes: Record<ModeName, ModeOverlayInfo>;
  onSelect: (mode: ModeName) => void;
}

export function ModeSegment({ active, onSelect }: ModeSegmentProps) {
  return (
    <div role="tablist" aria-label="Mode" className="flex items-center gap-1">
      {TABS.map(({ mode, label, Icon }) => {
        const isActive = active === mode;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`luster-panel-${mode}`}
            onClick={() => onSelect(mode)}
            className={cn(
              "luster-press relative flex h-8 items-center gap-1.5 px-2 text-[12px] font-medium transition-colors",
              isActive
                ? "text-luster-ink"
                : "text-luster-faint hover:text-luster-muted",
            )}
          >
            <Icon size={13} className="opacity-90" />
            {label}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-2 -bottom-0.5 h-px transition-colors",
                isActive ? "bg-luster-ink" : "bg-transparent",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
