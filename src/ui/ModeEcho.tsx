import { useEffect, useState } from "react";
import type { EchoEntry, EchoOutput } from "@/core/types";
import { ModeStatusBanner } from "@/ui/ModeStatusBanner";
import type { ModeOverlayInfo, OverlayController } from "@/ui/state";
import { cn } from "@/ui/cn";

export interface ModeEchoProps {
  controller: OverlayController;
  info: ModeOverlayInfo;
  fullText: string;
  onScan: () => void;
}

const KIND_LABEL: Record<EchoEntry["kind"], string> = {
  phrase: "Phrase",
  image: "Image",
  concept: "Concept",
};

const KIND_TONE: Record<EchoEntry["kind"], string> = {
  phrase: "text-luster-ink",
  image: "text-luster-warn",
  concept: "text-luster-accent",
};

export function ModeEcho({
  controller,
  info,
  fullText,
  onScan,
}: ModeEchoProps) {
  const [hasEnoughText, setHasEnoughText] = useState(fullText.length > 200);

  useEffect(() => {
    setHasEnoughText(fullText.length > 200);
  }, [fullText]);

  const isPending = info.status === "pending";
  const echoOutput =
    info.status === "ok" && info.output?.mode === "echo"
      ? info.output.result
      : null;

  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between">
        <span className="luster-eyebrow">Returns across the draft</span>
        {info.provider && (
          <span className="luster-eyebrow">{info.provider}</span>
        )}
      </header>

      <div className="text-[13px]">
        {info.status === "idle" && (
          <p className="text-[12px] text-luster-faint">
            Scans the whole draft for phrases, images, and concepts you keep
            returning to. No suggestions — just a mirror.
          </p>
        )}

        <ModeStatusBanner
          info={info}
          idleText=""
          onReset={() => controller.resetMode("echo")}
        />

        {echoOutput && <EchoBody output={echoOutput} />}

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onScan}
            disabled={isPending || !hasEnoughText}
            className={cn(
              "luster-btn-primary text-[12px]",
              (isPending || !hasEnoughText) && "opacity-50",
            )}
          >
            {isPending ? "Scanning…" : echoOutput ? "Scan again" : "Scan draft"}
          </button>
          {!hasEnoughText && (
            <span className="text-[11px] text-luster-faint">
              Write a bit more first.
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function EchoBody({ output }: { output: EchoOutput }) {
  if (output.echoes.length === 0 && output.localPhrases.length === 0) {
    return (
      <div className="luster-cross flex items-center gap-2 text-[13px] text-luster-ok">
        <span className="inline-block h-1 w-1 rounded-full bg-luster-ok" />
        Nothing notable repeats yet.
      </div>
    );
  }

  return (
    <div className="luster-cross space-y-4">
      {output.echoes.length > 0 && (
        <ul className="space-y-3">
          {output.echoes.map((entry, index) => (
            <li key={index} className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className={cn("luster-eyebrow", KIND_TONE[entry.kind])}>
                  {KIND_LABEL[entry.kind]} · {entry.occurrences}×
                </span>
                <span className="luster-serif text-[13px] font-medium text-luster-ink">
                  {entry.phrase}
                </span>
              </div>
              <p className="luster-serif text-[13px] leading-snug text-luster-muted">
                {entry.note}
              </p>
            </li>
          ))}
        </ul>
      )}

      {output.localPhrases.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="luster-eyebrow">Recurring phrases</div>
          <ul className="space-y-1">
            {output.localPhrases.map((entry) => (
              <li
                key={entry.phrase}
                className="luster-serif text-[12px] text-luster-faint"
              >
                "{entry.phrase}" × {entry.count}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
