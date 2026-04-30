import { ModeStatusBanner } from "@/ui/ModeStatusBanner";
import type { ModeOverlayInfo, OverlayController } from "@/ui/state";

export interface ModeInterrogationProps {
  controller: OverlayController;
  info: ModeOverlayInfo;
}

export function ModeInterrogation({
  controller,
  info,
}: ModeInterrogationProps) {
  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between">
        <span className="luster-eyebrow">Curious reader</span>
        {info.provider && (
          <span className="luster-eyebrow">{info.provider}</span>
        )}
      </header>
      <div className="text-[13px]">
        <ModeStatusBanner
          info={info}
          idleText="Finish a sentence and a question will appear."
          onReset={() => controller.resetMode("interrogation")}
        />
        {info.status === "ok" && info.output?.mode === "interrogation" && (
          <ul className="luster-cross space-y-4">
            {info.output.result.questions.map((question, index) => (
              <li key={index} className="space-y-1.5">
                <span className="luster-eyebrow">{question.kind}</span>
                <p className="luster-serif text-[14px] leading-snug text-luster-ink">
                  {question.text}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
