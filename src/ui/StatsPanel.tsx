import type { DocStats } from "@/core/stats";

export interface StatsPanelProps {
  stats: DocStats | null;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  if (stats === null || stats.words === 0) {
    return (
      <p className="text-[12px] text-luster-faint">
        Start writing in your document.
      </p>
    );
  }

  const cells: { label: string; value: string }[] = [
    { label: "words", value: formatNumber(stats.words) },
    { label: "sentences", value: String(stats.sentences) },
  ];

  return (
    <div className="flex items-baseline gap-6">
      {cells.map((cell) => (
        <div key={cell.label} className="flex items-baseline gap-1.5">
          <span className="luster-num text-[18px] font-semibold leading-none text-luster-ink">
            {cell.value}
          </span>
          <span className="luster-eyebrow">{cell.label}</span>
        </div>
      ))}
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
