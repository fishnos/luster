import type { DocStats } from "@/core/stats";
import { Odometer } from "@/ui/motion/Odometer";

export interface StatsPanelProps {
  stats: DocStats | null;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  if (stats === null || stats.words === 0) {
    return (
      <div className="flex items-center gap-3" aria-label="0 words in document">
        <p className="luster-display-italic text-[13px] leading-none text-luster-faint">
          waiting for the first word
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex items-start justify-between gap-4"
      aria-label={`${stats.words} words in document`}
    >
      <Cell label="words" value={stats.words} accent="ivory" emphasis />
      <Cell label="sentences" value={stats.sentences} accent="muted" />
      <Cell
        label="avg"
        value={Math.round(stats.avgSentenceWords)}
        accent="muted"
      />
    </div>
  );
}

function Cell({
  label,
  value,
  accent,
  emphasis,
}: {
  label: string;
  value: number;
  accent: "ivory" | "muted";
  emphasis?: boolean;
}) {
  const valueClass =
    accent === "ivory" ? "text-luster-ink" : "text-luster-ink-soft";
  const size = emphasis ? "text-[26px]" : "text-[18px]";
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="luster-eyebrow">{label}</span>
      <Odometer
        value={value}
        className={`luster-num ${size} font-medium leading-none ${valueClass}`}
      />
    </div>
  );
}
