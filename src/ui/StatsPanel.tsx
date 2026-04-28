import type { DocStats } from "@/core/stats";

export interface StatsPanelProps {
  stats: DocStats | null;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  if (stats === null || stats.words === 0) {
    return (
      <div className="rounded-md border border-luster-border bg-luster-surface px-3 py-2.5 text-[12px] text-luster-muted">
        Start writing in your document.
      </div>
    );
  }

  const cells: { label: string; value: string }[] = [
    { label: "words", value: formatNumber(stats.words) },
    { label: "sent.", value: String(stats.sentences) },
    { label: "avg", value: stats.avgSentenceWords.toFixed(1) },
    { label: "longest", value: String(stats.longestSentenceWords) },
    { label: "passive", value: `${Math.round(stats.passiveRatio * 100)}%` },
    { label: "F-K", value: stats.fleschKincaidGrade.toFixed(1) },
  ];

  return (
    <div className="rounded-md border border-luster-border bg-luster-surface">
      <div className="grid grid-cols-6 divide-x divide-luster-border">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="flex flex-col items-center px-1 py-2"
          >
            <span className="luster-mono text-[12px] tabular-nums text-luster-ink">
              {cell.value}
            </span>
            <span className="text-[9px] uppercase tracking-[0.14em] text-luster-faint mt-0.5">
              {cell.label}
            </span>
          </div>
        ))}
      </div>
      {stats.repeatedOpeners.length > 0 && (
        <div className="border-t border-luster-border px-3 py-2 text-[11px]">
          <span className="uppercase tracking-[0.14em] text-luster-faint mr-2">
            Repeats
          </span>
          {stats.repeatedOpeners.slice(0, 3).map((entry, index) => (
            <span key={entry.opener} className="text-luster-muted">
              {index > 0 ? ", " : ""}
              <span className="text-luster-ink">{entry.opener}</span>
              <span className="text-luster-faint"> ×{entry.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
