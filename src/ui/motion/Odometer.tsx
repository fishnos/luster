import { useEffect, useState } from "react";

export interface OdometerProps {
  value: number;
  className?: string;
  digitClassName?: string;
}

export function Odometer({ value, className, digitClassName }: OdometerProps) {
  const formatted = new Intl.NumberFormat("en-US").format(Math.max(0, value));
  return (
    <span className={className} aria-label={String(value)}>
      {[...formatted].map((char, index) =>
        /\d/.test(char) ? (
          <DigitCell
            key={`${index}-${char}`}
            digit={Number(char)}
            className={digitClassName}
          />
        ) : (
          <span key={`s-${index}-${char}`}>{char}</span>
        ),
      )}
    </span>
  );
}

function DigitCell({
  digit,
  className,
}: {
  digit: number;
  className?: string;
}) {
  const [target, setTarget] = useState(digit);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setTarget(digit));
    return () => window.cancelAnimationFrame(id);
  }, [digit]);

  return (
    <span className="luster-odometer-cell">
      <span
        className="luster-odometer-track"
        style={{ transform: `translateY(-${target}em)` }}
      >
        {Array.from({ length: 10 }).map((_, value) => (
          <span
            key={value}
            className={`luster-odometer-digit ${className ?? ""}`}
          >
            {value}
          </span>
        ))}
      </span>
    </span>
  );
}
