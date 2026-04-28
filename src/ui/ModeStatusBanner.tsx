import type { ModeOverlayInfo } from "@/ui/state";
import { cn } from "@/ui/cn";

export interface ModeStatusBannerProps {
  info: ModeOverlayInfo;
  idleText: string;
}

export function ModeStatusBanner({ info, idleText }: ModeStatusBannerProps) {
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
          ? "border-[#f3c4bd] bg-[#fdf3f1] text-luster-err"
          : "border-[#f3d9a8] bg-[#fdf6e7] text-luster-warn",
      )}
    >
      {children}
    </div>
  );
}
