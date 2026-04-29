import type { CSSProperties } from "react";
import { cn } from "@/ui/cn";

export interface AmbientBackdropProps {
  className?: string;
  style?: CSSProperties;
}

export function AmbientBackdrop({ className, style }: AmbientBackdropProps) {
  return (
    <div
      aria-hidden
      className={cn("luster-backdrop", className)}
      style={style}
    />
  );
}
