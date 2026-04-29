import type { CriticIssue } from "@/core/types";
import { Badge } from "@/ui/components/ui/badge";
import { ModeStatusBanner } from "@/ui/ModeStatusBanner";
import type { ModeOverlayInfo, OverlayController } from "@/ui/state";

const SEVERITY_ORDER: CriticIssue["severity"][] = [
  "structural",
  "clarity",
  "rhythm",
  "nit",
];

const SEVERITY_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  structural: "destructive",
  clarity: "default",
  rhythm: "secondary",
  nit: "outline",
};

export interface ModeCriticProps {
  controller: OverlayController;
  info: ModeOverlayInfo;
  sentence: string | null;
}

export function ModeCritic({ controller, info, sentence }: ModeCriticProps) {
  return (
    <div className="rounded-md border border-luster-border bg-luster-card">
      <div className="flex items-center justify-between border-b border-luster-border px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-luster-faint">
        <span>Critic · structure &amp; connection</span>
        {info.provider && <span>{info.provider}</span>}
      </div>
    <div className="px-3 py-3 text-[13px]">
      <ModeStatusBanner
        info={info}
        idleText="Finish a sentence to be critiqued."
        onReset={() => controller.resetMode("critic")}
      />
        {info.status === "ok" && info.output?.mode === "critic" && (
          <CriticBody issues={info.output.result.issues} sentence={sentence} />
        )}
      </div>
    </div>
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
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-luster-ok" />
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
    <ul className="luster-cross space-y-3">
      {sortedIssues.map((issue, index) => (
        <li key={index} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant={SEVERITY_TONE[issue.severity] ?? "secondary"} className="h-4 px-1 text-[9px] uppercase">
              {issue.severity}
            </Badge>
            <span className="text-[13px] text-luster-ink font-medium">{issue.label}</span>
          </div>
          {sentence && <SpanQuote sentence={sentence} issue={issue} />}
          {issue.suggestion && (
            <div className="luster-serif text-[13px] text-luster-muted leading-snug">
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
    <div className="rounded-md border border-luster-border bg-luster-surface px-2.5 py-2 luster-serif text-[13px] leading-snug">
      <span className="text-luster-muted">{before}</span>
      <span className="bg-[#fdecd7] underline decoration-luster-warn decoration-wavy decoration-2 underline-offset-2 text-luster-ink">
        {inside}
      </span>
      <span className="text-luster-muted">{after}</span>
    </div>
  );
}
