import type { InterrogationOutput } from "@/core/types";
import { Card, CardBody, CardHeader } from "@/ui/components/Card";
import { ModeStatusBanner } from "@/ui/ModeStatusBanner";
import type { ModeOverlayInfo } from "@/ui/state";
import { cn } from "@/ui/cn";

const KIND_STYLES: Record<
  InterrogationOutput["questions"][number]["kind"],
  string
> = {
  intent: "border-luster-accent/40 text-luster-accent",
  craft: "border-luster-ok/40 text-luster-ok",
  reader: "border-luster-warn/40 text-luster-warn",
};

export interface ModeInterrogationProps {
  info: ModeOverlayInfo;
}

export function ModeInterrogation({ info }: ModeInterrogationProps) {
  return (
    <Card>
      <CardHeader>
        <span>Interrogation</span>
        {info.provider && (
          <span className="text-luster-muted">{info.provider}</span>
        )}
      </CardHeader>
      <CardBody className="space-y-3 text-xs">
        <ModeStatusBanner
          info={info}
          idleText="Finish a sentence to be questioned."
        />
        {info.status === "ok" && info.output?.mode === "interrogation" && (
          <ul className="space-y-2.5">
            {info.output.result.questions.map((question, index) => (
              <li key={index} className="flex gap-2">
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-5 shrink-0 items-center rounded border px-1.5 text-[10px] uppercase tracking-wider",
                    KIND_STYLES[question.kind],
                  )}
                >
                  {question.kind}
                </span>
                <span className="text-luster-ink leading-snug">
                  {question.text}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
