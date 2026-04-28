import type { ReadingOutput } from "@/core/types";
import { Card, CardBody, CardHeader } from "@/ui/components/Card";
import type { ModeOverlayInfo } from "@/ui/state";
import { ModeStatusBanner } from "@/ui/ModeStatusBanner";

export interface ModeReadingProps {
  info: ModeOverlayInfo;
}

export function ModeReading({ info }: ModeReadingProps) {
  return (
    <Card>
      <CardHeader>
        <span>Reading</span>
        {info.provider && (
          <span className="text-luster-muted">{info.provider}</span>
        )}
      </CardHeader>
      <CardBody className="space-y-3 text-xs">
        <ModeStatusBanner
          info={info}
          idleText="Finish a paragraph to get a read-back."
        />
        {info.status === "ok" && info.output?.mode === "reading" && (
          <ReadingBody output={info.output.result} />
        )}
      </CardBody>
    </Card>
  );
}

function ReadingBody({ output }: { output: ReadingOutput }) {
  return (
    <div className="space-y-3">
      <Section label="Voice" body={output.voiceTrend} />
      <Section label="Rhythm" body={output.rhythm} />
      <Section label="Doing" body={output.paragraphPurpose} />
      <Section label="Transition" body={output.transitionStrength} />
      {output.notes.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-luster-muted mb-1">
            Notes
          </div>
          <ul className="list-disc pl-4 space-y-1">
            {output.notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Section({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-luster-muted mb-1">
        {label}
      </div>
      <p className="text-luster-ink leading-snug">{body}</p>
    </div>
  );
}
