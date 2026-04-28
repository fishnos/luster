import type { CriticIssue } from "@/core/types";
import { cn } from "@/ui/cn";

const SEVERITY_STYLES: Record<CriticIssue["severity"], string> = {
  structural: "bg-luster-err/20 text-luster-err border-luster-err/40",
  clarity: "bg-luster-warn/20 text-luster-warn border-luster-warn/40",
  rhythm: "bg-luster-accent/15 text-luster-accent border-luster-accent/40",
  nit: "bg-luster-panel2 text-luster-muted border-luster-border",
};

const SEVERITY_LABEL: Record<CriticIssue["severity"], string> = {
  structural: "structural",
  clarity: "clarity",
  rhythm: "rhythm",
  nit: "nit",
};

export interface SeverityBadgeProps {
  severity: CriticIssue["severity"];
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
        SEVERITY_STYLES[severity],
      )}
      data-severity={severity}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
