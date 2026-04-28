import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/ui/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-luster-border bg-luster-panel text-luster-ink",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-luster-border px-3 py-2 text-[11px] uppercase tracking-wider text-luster-muted",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className, ...rest }: CardProps) {
  return (
    <div className={cn("p-3", className)} {...rest}>
      {children}
    </div>
  );
}
