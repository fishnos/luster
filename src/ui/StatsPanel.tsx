import type { DocStats } from "@/core/stats";
import { Card, CardBody, CardHeader } from "@/ui/components/Card";

export interface StatsPanelProps {
  stats: DocStats | null;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <span>Stats</span>
        {stats !== null && (
          <span className="text-luster-muted">
            FK {stats.fleschKincaidGrade.toFixed(1)}
          </span>
        )}
      </CardHeader>
      <CardBody className="font-mono text-xs">
        {stats === null ? (
          <div className="text-luster-muted">
            Start writing in your document.
          </div>
        ) : (
          <Grid stats={stats} />
        )}
      </CardBody>
    </Card>
  );
}

function Grid({ stats }: { stats: DocStats }) {
  const rows: { label: string; value: string }[] = [
    { label: "words", value: String(stats.words) },
    { label: "sentences", value: String(stats.sentences) },
    { label: "paragraphs", value: String(stats.paragraphs) },
    { label: "avg sent. words", value: stats.avgSentenceWords.toFixed(1) },
    { label: "longest", value: String(stats.longestSentenceWords) },
    { label: "passive", value: `${Math.round(stats.passiveRatio * 100)}%` },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between">
            <span className="text-luster-muted">{row.label}</span>
            <span className="text-luster-ink">{row.value}</span>
          </div>
        ))}
      </div>
      {stats.repeatedOpeners.length > 0 && (
        <div className="mt-3 border-t border-luster-border pt-2">
          <div className="text-luster-muted text-[10px] uppercase tracking-wider mb-1">
            Repeated openers
          </div>
          <div className="flex flex-wrap gap-1">
            {stats.repeatedOpeners.map((entry) => (
              <span
                key={entry.opener}
                className="rounded bg-luster-panel2 px-1.5 py-0.5 text-[11px]"
              >
                {entry.opener}
                <span className="text-luster-muted"> ×{entry.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
