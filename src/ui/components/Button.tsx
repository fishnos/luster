import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/ui/cn";

type ButtonVariant = "ghost" | "solid" | "tab" | "tab-active";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  ghost:
    "bg-transparent text-luster-muted hover:text-luster-ink hover:bg-luster-panel2",
  solid: "bg-luster-accent text-luster-bg hover:brightness-110",
  tab: "bg-transparent text-luster-muted hover:text-luster-ink hover:bg-luster-panel2",
  "tab-active": "bg-luster-panel2 text-luster-ink",
};

export function Button({
  variant = "ghost",
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-7 select-none items-center justify-center rounded px-2 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
