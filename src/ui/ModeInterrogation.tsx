import type { InterrogationOutput } from "@/core/types";
import { ModeStatusBanner } from "@/ui/ModeStatusBanner";
import type { ModeOverlayInfo, OverlayController } from "@/ui/state";
import { cn } from "@/ui/cn";

const KIND_STYLES: Record<
  InterrogationOutput["questions"][number]["kind"],
  string
> = {
  intent: "border-[#ebd9b3] bg-luster-accent-soft text-luster-accent",
  craft: "border-[#cfe1cd] bg-[#eef5ed] text-luster-ok",
  reader: "border-[#f3d9a8] bg-[#fdf6e7] text-luster-warn",
};

export interface ModeInterrogationProps {
  controller: OverlayController;
  info: ModeOverlayInfo;
}

export function ModeInterrogation({ controller, info }: ModeInterrogationProps) {
  return (
    <div className="rounded-md border border-luster-border bg-luster-card">
      <div className="flex items-center justify-between border-b border-luster-border px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-luster-faint">
        <span>Interrogation · curious reader</span>
        {info.provider && <span>{info.provider}</span>}
      </div>
      <div className="px-3 py-3 text-[13px]">
        <ModeStatusBanner
          info={info}
          idleText="Finish a sentence and a question will appear."
          onReset={() => controller.resetMode("interrogation")}
        />
        {info.status === "ok" && info.output?.mode === "interrogation" && (
          <ul className="luster-cross space-y-3">
            {info.output.result.questions.map((question, index) => (
              <li key={index} className="space-y-1.5">
                <span
                  className={cn(
                    "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em]",
                    KIND_STYLES[question.kind],
                  )}
                >
                  {question.kind}
                </span>
                <p className="luster-serif text-[14px] leading-snug text-luster-ink">
                  {question.text}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
