import { cn } from "@/ui/cn";
import type { ModeStatus } from "@/ui/state";

const STATUS_LABEL: Record<ModeStatus, string> = {
  idle: "Idle",
  pending: "Thinking",
  ok: "Ready",
  error: "Error",
  "rate-limited": "Paused",
};

const STATUS_TONE: Record<ModeStatus, string> = {
  idle: "neutral",
  pending: "pending",
  ok: "ok",
  error: "error",
  "rate-limited": "warn",
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
      data-tone={STATUS_TONE[status]}
      className={cn("luster-status-pill", className)}
    >
      <span
        className={cn(
          "dot",
          status === "pending" && "luster-pulse",
          status === "ok" && "luster-morse",
        )}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
