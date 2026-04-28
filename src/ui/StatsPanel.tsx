import type { DocStats } from "@/core/stats";

export interface StatsPanelProps {
  stats: DocStats | null;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  if (stats === null || stats.words === 0) {
    return (
      <div className="rounded-md border border-luster-border bg-luster-surface/70 px-3 py-2.5 text-[12px] text-luster-muted">
        Start writing in your document.
      </div>
    );
  }

  const cells: { label: string; value: string }[] = [
    { label: "words", value: formatNumber(stats.words) },
    { label: "sentences", value: String(stats.sentences) },
    { label: "avg", value: stats.avgSentenceWords.toFixed(1) },
  ];

  return (
    <div className="rounded-md border border-luster-border bg-luster-surface/70">
      <div className="grid grid-cols-3 divide-x divide-luster-border">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="flex flex-col items-center px-2 py-2.5"
          >
            <span className="luster-num text-[15px] font-semibold text-luster-ink leading-none">
              {cell.value}
            </span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-luster-faint mt-1">
              {cell.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
