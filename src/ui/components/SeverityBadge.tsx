import type { CriticIssue } from "@/core/types";
import { cn } from "@/ui/cn";

const SEVERITY_STYLES: Record<CriticIssue["severity"], string> = {
  structural: "bg-[#fbe9e6] text-luster-err border-[#f3c4bd]",
  clarity: "bg-[#fdeed4] text-luster-warn border-[#f3d9a8]",
  rhythm: "bg-luster-accent-soft text-luster-accent border-[#ebd9b3]",
  nit: "bg-luster-subtle text-luster-muted border-luster-border",
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
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em]",
        SEVERITY_STYLES[severity],
      )}
      data-severity={severity}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
