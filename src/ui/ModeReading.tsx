import type { ReadingOutput } from "@/core/types";
import { ModeStatusBanner } from "@/ui/ModeStatusBanner";
import type { ModeOverlayInfo } from "@/ui/state";

export interface ModeReadingProps {
  info: ModeOverlayInfo;
}

export function ModeReading({ info }: ModeReadingProps) {
  return (
    <div className="rounded-md border border-luster-border bg-luster-card">
      <div className="flex items-center justify-between border-b border-luster-border px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-luster-faint">
        <span>Reading · editor's read-back</span>
        {info.provider && <span>{info.provider}</span>}
      </div>
      <div className="px-3 py-3 text-[13px]">
        <ModeStatusBanner
          info={info}
          idleText="Finish a paragraph to get an editor's read-back."
        />
        {info.status === "ok" && info.output?.mode === "reading" && (
          <ReadingBody output={info.output.result} />
        )}
      </div>
    </div>
  );
}

function ReadingBody({ output }: { output: ReadingOutput }) {
  return (
    <div className="luster-cross space-y-3">
      <Section label="Voice" body={output.voiceTrend} />
      <Section label="Rhythm" body={output.rhythm} />
      <Section label="Doing" body={output.paragraphPurpose} />
      <Section label="Transition" body={output.transitionStrength} />
      {output.notes.length > 0 && (
        <div className="border-t border-luster-border pt-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-luster-faint mb-1.5">
            Notes
          </div>
          <ul className="space-y-1.5">
            {output.notes.map((note, index) => (
              <li
                key={index}
                className="luster-serif text-luster-ink-soft leading-snug"
              >
                — {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Section({ label, body }: { label: string; body: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-[0.14em] text-luster-faint">
        {label}
      </div>
      <p className="luster-serif text-[14px] leading-snug text-luster-ink">
        {body}
      </p>
    </div>
  );
}
