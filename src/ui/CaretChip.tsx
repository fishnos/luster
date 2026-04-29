import { useEffect, useState } from "react";
import type { CaretPopupData } from "@/core/types";
import { Badge } from "@/ui/components/ui/badge";

export interface CaretPopupProps {
  caretRect: DOMRect | null;
  data: CaretPopupData | null;
  offsetY?: number;
}

export function CaretPopup({ caretRect, data, offsetY = 20 }: CaretPopupProps) {
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

  if (!caretRect || !data) return null;

  const chipWidth = 300;
  const left = clamp(caretRect.left, 8, windowSize.width - chipWidth - 8);
  const top = clamp(caretRect.bottom + offsetY, 8, windowSize.height - 80);

  const variant =
    data.type === "critic"
      ? data.severity === "structural" || data.severity === "clarity"
        ? "destructive"
        : data.severity === "nit"
          ? "secondary"
          : "default"
      : "outline";

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
      className="luster-root luster-card luster-mount px-3 py-2.5 shadow-lg border border-luster-border/50"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Badge
          variant={variant as any}
          className="h-4 px-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
        >
          {data.label}
        </Badge>
        {data.kind && <span className="luster-eyebrow">{data.kind}</span>}
      </div>
      <div className="luster-serif text-[14px] leading-snug text-luster-ink">
        {data.text}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}
