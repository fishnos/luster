import type { CriticIssue } from "@/core/types";
import { Card, CardBody, CardHeader } from "@/ui/components/Card";
import { SeverityBadge } from "@/ui/components/SeverityBadge";
import { ModeStatusBanner } from "@/ui/ModeStatusBanner";
import type { ModeOverlayInfo } from "@/ui/state";

const SEVERITY_ORDER: CriticIssue["severity"][] = [
  "structural",
  "clarity",
  "rhythm",
  "nit",
];

export interface ModeCriticProps {
  info: ModeOverlayInfo;
  sentence: string | null;
}

export function ModeCritic({ info, sentence }: ModeCriticProps) {
  return (
    <Card>
      <CardHeader>
        <span>Critic</span>
        {info.provider && (
          <span className="text-luster-muted">{info.provider}</span>
        )}
      </CardHeader>
      <CardBody className="space-y-3 text-xs">
        <ModeStatusBanner
          info={info}
          idleText="Finish a sentence to be critiqued."
        />
        {info.status === "ok" && info.output?.mode === "critic" && (
          <CriticBody issues={info.output.result.issues} sentence={sentence} />
        )}
      </CardBody>
    </Card>
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
      <div className="text-luster-ok">
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
    <ul className="space-y-2.5">
      {sortedIssues.map((issue, index) => (
        <li key={index} className="space-y-1">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={issue.severity} />
            <span className="text-luster-ink">{issue.label}</span>
          </div>
          {sentence && <SpanQuote sentence={sentence} issue={issue} />}
          {issue.suggestion && (
            <div className="text-luster-muted leading-snug">
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
    <div className="rounded bg-luster-panel2 px-2 py-1 font-serif text-[12px] leading-snug">
      <span className="text-luster-muted">{before}</span>
      <span className="bg-luster-warn/25 underline decoration-luster-warn decoration-wavy underline-offset-2 text-luster-ink">
        {inside}
      </span>
      <span className="text-luster-muted">{after}</span>
    </div>
  );
}
