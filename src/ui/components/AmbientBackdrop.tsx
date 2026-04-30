import type { CSSProperties } from "react";
import { cn } from "@/ui/cn";

export interface AmbientBackdropProps {
  className?: string;
  style?: CSSProperties;
}

export function AmbientBackdrop({ className, style }: AmbientBackdropProps) {
  return (
    <div aria-hidden className={cn("luster-backdrop", className)} style={style}>
      <span
        className="absolute h-[60%] w-[60%] rounded-full opacity-[0.18] blur-[60px]"
        style={{
          left: "-10%",
          top: "-12%",
          background:
            "radial-gradient(circle, rgba(217,154,108,0.6), transparent 70%)",
          animation: "drift-a 22s ease-in-out infinite",
        }}
      />
      <span
        className="absolute h-[55%] w-[55%] rounded-full opacity-[0.14] blur-[64px]"
        style={{
          right: "-8%",
          bottom: "-10%",
          background:
            "radial-gradient(circle, rgba(155,191,154,0.55), transparent 70%)",
          animation: "drift-b 28s ease-in-out infinite",
        }}
      />
      <span className="luster-grain" />
    </div>
  );
}
