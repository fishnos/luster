import { cn } from "@/ui/cn";

export interface MarkProps {
  size?: number;
  className?: string;
  static?: boolean;
  spin?: boolean;
}

export function Mark({
  size = 22,
  className,
  static: isStatic = false,
  spin = false,
}: MarkProps) {
  const animationClass = isStatic
    ? ""
    : spin
      ? "luster-mark-spin"
      : "luster-mark-glyph";

  const haloId = `luster-halo-${Math.round(size)}`;
  const sparkId = `luster-spark-${Math.round(size)}`;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label="Luster"
      className={cn("block shrink-0", animationClass, className)}
    >
      <defs>
        <radialGradient id={haloId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#f5d9a8" stopOpacity="0.55" />
          <stop offset="35%" stopColor="#f5d9a8" stopOpacity="0.22" />
          <stop offset="70%" stopColor="#d99a6c" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#d99a6c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={sparkId} cx="0.5" cy="0.5" r="0.55">
          <stop offset="0%" stopColor="#fff7e6" stopOpacity="1" />
          <stop offset="45%" stopColor="#f5d9a8" stopOpacity="1" />
          <stop offset="100%" stopColor="#d99a6c" stopOpacity="1" />
        </radialGradient>
      </defs>
      <circle
        className={isStatic ? undefined : "halo"}
        cx="12"
        cy="12"
        r="12"
        fill={`url(#${haloId})`}
      />
      <path
        className={isStatic ? undefined : "spark"}
        d="M12 0.6 C12.8 6.8 17.2 11.2 23.4 12 C17.2 12.8 12.8 17.2 12 23.4 C11.2 17.2 6.8 12.8 0.6 12 C6.8 11.2 11.2 6.8 12 0.6 Z"
        fill={`url(#${sparkId})`}
      />
    </svg>
  );
}
