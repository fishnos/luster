import { cn } from "@/ui/cn";
import type { ModeStatus } from "@/ui/state";

const STATUS_LABEL: Record<ModeStatus, string> = {
  idle: "idle",
  pending: "thinking",
  ok: "ready",
  error: "error",
  "rate-limited": "paused",
};

const STATUS_TONE: Record<ModeStatus, string> = {
  idle: "text-luster-faint",
  pending: "text-luster-ink",
  ok: "text-luster-ok",
  error: "text-luster-err",
  "rate-limited": "text-luster-warn",
};

export interface StatusDotProps {
  status: ModeStatus;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      role="status"
      aria-label={STATUS_LABEL[status]}
      className={cn(
        "luster-eyebrow leading-none",
        STATUS_TONE[status],
        status === "pending" && "luster-status-thinking",
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
