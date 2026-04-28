import { cn } from "@/ui/cn";

export interface MarkProps {
  size?: number;
  className?: string;
}

export function Mark({ size = 22, className }: MarkProps) {
  return (
    <img
      src={browser.runtime.getURL("/icon/128.png")}
      width={size}
      height={size}
      alt="Luster"
      className={cn("shrink-0", className)}
      style={{ borderRadius: size * 0.2 }}
    />
  );
}
