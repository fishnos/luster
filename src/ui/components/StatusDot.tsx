import { cn } from "@/ui/cn";
import type { ModeStatus } from "@/ui/state";

const STATUS_STYLES: Record<ModeStatus, string> = {
  idle: "bg-luster-faint",
  pending: "bg-luster-accent luster-pulse",
  ok: "bg-luster-ok",
  error: "bg-luster-err",
  "rate-limited": "bg-luster-warn",
};

const STATUS_LABEL: Record<ModeStatus, string> = {
  idle: "idle",
  pending: "thinking",
  ok: "ready",
  error: "error",
  "rate-limited": "paused",
};

export interface StatusDotProps {
  status: ModeStatus;
}

export function StatusDot({ status }: StatusDotProps) {
  return (
    <span
      role="status"
      aria-label={STATUS_LABEL[status]}
      data-status={status}
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        STATUS_STYLES[status],
      )}
    />
  );
}
