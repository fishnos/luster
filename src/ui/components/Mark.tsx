import { browser } from "wxt/browser";
import { cn } from "@/ui/cn";

export interface MarkProps {
  size?: number;
  className?: string;
  rounded?: boolean;
}

export function Mark({ size = 22, className, rounded = true }: MarkProps) {
  return (
    <img
      src={browser.runtime.getURL("/icon/128.png" as never)}
      width={size}
      height={size}
      alt="Luster"
      className={cn("shrink-0", className)}
      style={{ borderRadius: rounded ? size * 0.2 : 0 }}
    />
  );
}
