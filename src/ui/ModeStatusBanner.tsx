import type { ModeOverlayInfo } from "@/ui/state";
import { Button } from "@/ui/components/ui/button";
import { cn } from "@/ui/cn";

export interface ModeStatusBannerProps {
  info: ModeOverlayInfo;
  idleText: string;
  onReset?: () => void;
}

export function ModeStatusBanner({
  info,
  idleText,
  onReset,
}: ModeStatusBannerProps) {
  if (info.status === "idle") {
    return <p className="text-[12px] text-luster-faint">{idleText}</p>;
  }
  if (info.status === "pending") {
    return (
      <div className="flex items-center gap-2 text-[12px] text-luster-muted">
        <span className="relative h-px w-16 overflow-hidden">
          <span className="absolute inset-0 luster-thinking-bar" />
        </span>
        <span>Reading…</span>
      </div>
    );
  }
  if (info.status === "error") {
    return (
      <Banner tone="err">
        <div className="font-medium mb-0.5 text-luster-err">
          Couldn't get a response.
        </div>
        <div className="break-words text-luster-muted">{info.error}</div>
      </Banner>
    );
  }
  if (info.status === "rate-limited") {
    const seconds = info.retryAfterMs ? Math.ceil(info.retryAfterMs / 1000) : 0;
    return (
      <Banner tone="warn">
        <span className="text-luster-warn">
          Paused to stay under your rate limit
          {seconds > 0 ? ` — ${seconds}s` : ""}.
        </span>
      </Banner>
    );
  }
  if (info.status === "ok" && onReset) {
    return (
      <div className="mb-2 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-auto p-0 text-[10px] uppercase tracking-[0.16em] text-luster-faint hover:text-luster-ink"
        >
          Clear
        </Button>
      </div>
    );
  }
  return null;
}

function Banner({
  tone,
  children,
}: {
  tone: "warn" | "err";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-l-2 pl-2.5 py-0.5 text-[12px]",
        tone === "err" ? "border-luster-err" : "border-luster-warn",
      )}
    >
      {children}
    </div>
  );
}
