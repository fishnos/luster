import type { ModeOverlayInfo } from "@/ui/state";
import { cn } from "@/ui/cn";

export interface ModeStatusBannerProps {
  info: ModeOverlayInfo;
  idleText: string;
}

export function ModeStatusBanner({ info, idleText }: ModeStatusBannerProps) {
  if (info.status === "idle") {
    return <div className="text-luster-muted">{idleText}</div>;
  }
  if (info.status === "pending") {
    return <div className="text-luster-accent animate-pulse">Thinking…</div>;
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
        "rounded border px-2 py-1.5 text-xs",
        tone === "err"
          ? "border-luster-err/40 bg-luster-err/10 text-luster-err"
          : "border-luster-warn/40 bg-luster-warn/10 text-luster-warn",
      )}
    >
      {children}
    </div>
  );
}
