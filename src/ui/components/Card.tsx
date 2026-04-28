import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/ui/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-luster-border bg-luster-card text-luster-ink",
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
        "flex items-center justify-between border-b border-luster-border px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-luster-faint",
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
    <div className={cn("px-3 py-3", className)} {...rest}>
      {children}
    </div>
  );
}
