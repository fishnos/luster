import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/ui/cn";

type ButtonVariant = "primary" | "ghost" | "outline" | "icon";
type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-7 px-2 text-xs",
  md: "h-8 px-3 text-[13px]",
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-luster-ink text-white hover:bg-[#2a2520] focus-visible:outline-luster-ink",
  ghost:
    "bg-transparent text-luster-ink-soft hover:bg-luster-subtle focus-visible:outline-luster-border-strong",
  outline:
    "bg-luster-card border border-luster-border text-luster-ink hover:border-luster-border-strong focus-visible:outline-luster-border-strong",
  icon: "bg-transparent text-luster-muted hover:text-luster-ink hover:bg-luster-subtle h-7 w-7 px-0 focus-visible:outline-luster-border-strong",
};

export function Button({
  variant = "ghost",
  size = "sm",
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const sizeClass = variant === "icon" ? "" : SIZE_CLASS[size];
  return (
    <button
      type={type}
      className={cn(
        "luster-press inline-flex select-none items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1",
        sizeClass,
        VARIANT_CLASS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
