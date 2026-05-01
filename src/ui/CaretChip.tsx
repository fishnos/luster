import { useEffect, useState } from "react";
import type { CriticIssue } from "@/core/types";

const SEVERITY_TONE: Record<CriticIssue["severity"], string> = {
  structural: "text-luster-err",
  clarity: "text-luster-ink",
  rhythm: "text-luster-warn",
  nit: "text-luster-faint",
};

export interface CaretIssueChipProps {
  caretRect: DOMRect | null;
  issue: CriticIssue | null;
  offsetY?: number;
}

export function CaretIssueChip({
  caretRect,
  issue,
  offsetY = 20,
}: CaretIssueChipProps) {
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 720,
  }));

  useEffect(() => {
    function handleResize(): void {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!caretRect || !issue) return null;

  const chipWidth = 300;
  const left = clamp(caretRect.left, 8, windowSize.width - chipWidth - 8);
  const top = clamp(caretRect.bottom + offsetY, 8, windowSize.height - 80);

  return (
    <div
      role="tooltip"
      style={{
        position: "fixed",
        left,
        top,
        width: chipWidth,
        zIndex: 2147483646,
      }}
      className="luster-root luster-card luster-mount border border-luster-border/50 px-3 py-2.5 shadow-lg"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className={`luster-eyebrow ${SEVERITY_TONE[issue.severity]}`}>
          {issue.severity}
        </span>
        <span className="text-[12px] font-medium text-luster-ink">
          {issue.label}
        </span>
      </div>
      {issue.suggestion && (
        <div className="luster-display text-[14px] leading-snug text-luster-muted">
          {issue.suggestion}
        </div>
      )}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}
