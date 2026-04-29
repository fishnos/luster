import type { CriticIssue } from "@/core/types";
import { ModeStatusBanner } from "@/ui/ModeStatusBanner";
import type { ModeOverlayInfo, OverlayController } from "@/ui/state";
import { cn } from "@/ui/cn";

const SEVERITY_ORDER: CriticIssue["severity"][] = [
  "structural",
  "clarity",
  "rhythm",
  "nit",
];

const SEVERITY_LABEL: Record<CriticIssue["severity"], string> = {
  structural: "Structural",
  clarity: "Clarity",
  rhythm: "Rhythm",
  nit: "Nit",
};

const SEVERITY_TONE: Record<CriticIssue["severity"], string> = {
  structural: "text-luster-err",
  clarity: "text-luster-ink",
  rhythm: "text-luster-warn",
  nit: "text-luster-faint",
};

export interface ModeCriticProps {
  controller: OverlayController;
  info: ModeOverlayInfo;
  sentence: string | null;
}

export function ModeCritic({ controller, info, sentence }: ModeCriticProps) {
  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between">
        <span className="luster-eyebrow">Structure & connection</span>
        {info.provider && (
          <span className="luster-eyebrow">{info.provider}</span>
        )}
      </header>
      <div className="text-[13px]">
        <ModeStatusBanner
          info={info}
          idleText="Finish a sentence to be critiqued."
          onReset={() => controller.resetMode("critic")}
        />
        {info.status === "ok" && info.output?.mode === "critic" && (
          <CriticBody issues={info.output.result.issues} sentence={sentence} />
        )}
      </div>
    </section>
  );
}

function CriticBody({
  issues,
  sentence,
}: {
  issues: CriticIssue[];
  sentence: string | null;
}) {
  if (issues.length === 0) {
    return (
      <div className="luster-cross flex items-center gap-2 text-[13px] text-luster-ok">
        <span className="inline-block h-1 w-1 rounded-full bg-luster-ok" />
        No issues spotted in the latest sentence.
      </div>
    );
  }
  const sortedIssues = [...issues].sort(
    (left, right) =>
      SEVERITY_ORDER.indexOf(left.severity) -
      SEVERITY_ORDER.indexOf(right.severity),
  );
  return (
    <ul className="luster-cross space-y-4">
      {sortedIssues.map((issue, index) => (
        <li key={index} className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span
              className={cn("luster-eyebrow", SEVERITY_TONE[issue.severity])}
            >
              {SEVERITY_LABEL[issue.severity]}
            </span>
            <span className="text-[13px] font-medium text-luster-ink">
              {issue.label}
            </span>
          </div>
          {sentence && <SpanQuote sentence={sentence} issue={issue} />}
          {issue.suggestion && (
            <div className="luster-serif text-[13px] leading-snug text-luster-muted">
              → {issue.suggestion}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function SpanQuote({
  sentence,
  issue,
}: {
  sentence: string;
  issue: CriticIssue;
}) {
  const before = sentence.slice(0, issue.span.start);
  const inside = sentence.slice(issue.span.start, issue.span.end);
  const after = sentence.slice(issue.span.end);
  return (
    <div className="luster-serif py-1 text-[13px] leading-snug">
      <span className="text-luster-faint">{before}</span>
      <span className="luster-squiggle text-luster-ink">{inside}</span>
      <span className="text-luster-faint">{after}</span>
    </div>
  );
}
