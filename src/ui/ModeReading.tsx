import type { ReadingOutput } from "@/core/types";
import { ModeStatusBanner } from "@/ui/ModeStatusBanner";
import type { ModeOverlayInfo, OverlayController } from "@/ui/state";

export interface ModeReadingProps {
  controller: OverlayController;
  info: ModeOverlayInfo;
}

export function ModeReading({ controller, info }: ModeReadingProps) {
  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between">
        <span className="luster-eyebrow">Editor's read-back</span>
        {info.provider && (
          <span className="luster-eyebrow">{info.provider}</span>
        )}
      </header>
      <div className="text-[13px]">
        <ModeStatusBanner
          info={info}
          idleText="Finish a paragraph to get an editor's read-back."
          onReset={() => controller.resetMode("reading")}
        />
        {info.status === "ok" && info.output?.mode === "reading" && (
          <ReadingBody output={info.output.result} />
        )}
      </div>
    </section>
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
        <div className="space-y-1.5 pt-2">
          <div className="luster-eyebrow">Notes</div>
          <ul className="space-y-1.5">
            {output.notes.map((note, index) => (
              <li
                key={index}
                className="luster-serif leading-snug text-luster-ink-soft"
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
      <div className="luster-eyebrow">{label}</div>
      <p className="luster-serif text-[14px] leading-snug text-luster-ink">
        {body}
      </p>
    </div>
  );
}
