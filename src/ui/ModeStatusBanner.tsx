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
    return <p className="text-[12px] text-luster-muted">{idleText}</p>;
  }
  if (info.status === "pending") {
    return (
      <div className="flex items-center gap-2 text-[12px] text-luster-muted">
        <span className="relative h-[2px] w-16 overflow-hidden rounded bg-luster-subtle">
          <span className="absolute inset-0 luster-thinking-bar" />
        </span>
        <span>Reading…</span>
      </div>
    );
  }
  if (info.status === "error") {
    return (
      <Banner tone="err">
        <div className="font-medium mb-0.5">Couldn't get a response.</div>
        <div className="text-luster-muted break-words">{info.error}</div>
      </Banner>
    );
  }
  if (info.status === "rate-limited") {
    const seconds = info.retryAfterMs ? Math.ceil(info.retryAfterMs / 1000) : 0;
    return (
      <Banner tone="warn">
        Paused to stay under your rate limit
        {seconds > 0 ? ` — ${seconds}s` : ""}.
      </Banner>
    );
  }
  if (info.status === "ok") {
    return (
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-luster-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-luster-ok" />
          Ready
        </div>
        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-auto p-0 text-[10px] uppercase tracking-widest text-luster-faint hover:text-luster-accent transition-colors"
          >
            Clear
          </Button>
        )}
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
        "rounded-md border px-2.5 py-2 text-[12px]",
        tone === "err"
          ? "border-luster-border-strong bg-white/[0.03] text-luster-err"
          : "border-luster-border bg-white/[0.03] text-luster-warn",
      )}
    >
      {children}
    </div>
  );
}
