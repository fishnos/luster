import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/ui/cn";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  strong?: boolean;
}

export function GlassCard({
  children,
  className,
  strong = false,
  ...rest
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "luster-card text-luster-ink",
        strong && "luster-card-strong",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
