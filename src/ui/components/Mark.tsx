import { cn } from "@/ui/cn";

export interface MarkProps {
  size?: number;
  className?: string;
}

export function Mark({ size = 22, className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-label="Luster"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="luster-mark-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c5972f" />
          <stop offset="100%" stopColor="#7a4f12" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="7"
        fill="#fcf6e6"
        stroke="rgba(160, 122, 48, 0.30)"
        strokeWidth="1"
      />
      <path
        d="M11 8 L11 23 L21 23"
        fill="none"
        stroke="url(#luster-mark-fill)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="21" cy="9.5" r="1.6" fill="#a07a30" />
    </svg>
  );
}
