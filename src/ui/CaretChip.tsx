import { useEffect, useState } from "react";
import type { CriticIssue } from "@/core/types";
import { SeverityBadge } from "@/ui/components/SeverityBadge";

export interface CaretChipProps {
  caretRect: DOMRect | null;
  issue: CriticIssue | null;
  offsetY?: number;
}

export function CaretChip({ caretRect, issue, offsetY = 18 }: CaretChipProps) {
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

  const chipWidth = 280;
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
      className="luster-root luster-card luster-mount px-2.5 py-2 text-[12px]"
    >
      <div className="flex items-center gap-2 mb-1">
        <SeverityBadge severity={issue.severity} />
        <span className="text-luster-ink truncate">{issue.label}</span>
      </div>
      {issue.suggestion && (
        <div className="luster-serif text-luster-muted leading-snug">
          → {issue.suggestion}
        </div>
      )}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}
