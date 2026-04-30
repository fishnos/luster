import { useEffect, useRef, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Anchor,
  Crosshair,
  Eraser,
  FileText,
  MoveRight,
  Plus,
  Scissors,
} from "lucide-react";
import { Switch } from "@/ui/components/ui/switch";
import { DOC_BRIEF_MAX_LENGTH, DOC_PACT_MAX_LENGTH } from "@/core/docContext";
import {
  sendSetDocContextAutoMode,
  sendSetDocContextBrief,
  sendSetDocContextPact,
} from "@/core/sendRequest";
import type { OverlayController, OverlayState } from "@/ui/state";
import { cn } from "@/ui/cn";

interface PactPreset {
  Icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  hint: string;
  rule: string;
}

const PACT_PRESETS: PactPreset[] = [
  {
    Icon: Activity,
    title: "Verbs over nouns",
    hint: "Cut nominalizations",
    rule: "no nominalizations",
  },
  {
    Icon: MoveRight,
    title: "Active voice",
    hint: "Subjects act, not are acted on",
    rule: "active voice only",
  },
  {
    Icon: Anchor,
    title: "Concrete only",
    hint: "Specific verbs, no abstractions",
    rule: "concrete verbs only",
  },
  {
    Icon: Scissors,
    title: "No adverbs",
    hint: "Strip -ly modifiers",
    rule: "no adverbs",
  },
  {
    Icon: Eraser,
    title: "Cut filler",
    hint: '"very/just/actually/really"',
    rule: 'no "very/just/actually/really"',
  },
];

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

type EditorTarget = "brief" | "pact" | null;

const INPUT_STYLE: React.CSSProperties = {
  caretColor: "currentColor",
};

export interface DocContextRowProps {
  controller: OverlayController;
  state: OverlayState;
}

export function DocContextRow({ controller, state }: DocContextRowProps) {
  const [openTarget, setOpenTarget] = useState<EditorTarget>(null);
  const docId = state.docId;
  const briefValue = state.docContext.brief;
  const pactValue = state.docContext.pact;
  const autoModeOn = state.docContext.autoMode;

  const briefFilled = briefValue.trim().length > 0;
  const pactFilled = pactValue.trim().length > 0;

  function chooseTarget(target: EditorTarget): void {
    setOpenTarget((current) => (current === target ? null : target));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <ContextPill
          label="Brief"
          FilledIcon={FileText}
          isFilled={briefFilled}
          isActive={openTarget === "brief"}
          onClick={() => chooseTarget("brief")}
        />
        <ContextPill
          label="Pact"
          FilledIcon={Crosshair}
          isFilled={pactFilled}
          isActive={openTarget === "pact"}
          onClick={() => chooseTarget("pact")}
        />
        <div className="ml-auto flex items-center gap-1.5">
          <span className="luster-eyebrow">auto</span>
          <Switch
            checked={autoModeOn}
            aria-label="Auto-switch modes as you write"
            onCheckedChange={(value) => {
              controller.setAutoMode(value);
              controller.setAutoModeStatus({
                active: value,
                lastSwitchReason: null,
                lastSwitchAt: null,
              });
              if (docId) void sendSetDocContextAutoMode(docId, value);
            }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {openTarget !== null && (
          <motion.div
            key={openTarget}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            style={{ overflow: "hidden" }}
          >
            {openTarget === "brief" ? (
              <BriefEditor
                controller={controller}
                docId={docId}
                value={briefValue}
                onClose={() => setOpenTarget(null)}
              />
            ) : (
              <PactEditor
                controller={controller}
                docId={docId}
                value={pactValue}
                onClose={() => setOpenTarget(null)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ContextPill({
  label,
  FilledIcon,
  isFilled,
  isActive,
  onClick,
}: {
  label: string;
  FilledIcon: ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  isFilled: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  const ActiveIcon = isFilled || isActive ? FilledIcon : Plus;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isActive}
      aria-label={
        isFilled ? `${label} set, click to edit` : `Add ${label.toLowerCase()}`
      }
      className={cn(
        "luster-press inline-grid h-7 grid-cols-[14px_auto_6px] items-center gap-x-2 rounded-full px-2.5 transition-all",
        isActive
          ? "bg-luster-accent/15 text-luster-ink ring-1 ring-luster-accent/50"
          : isFilled
            ? "bg-luster-subtle text-luster-ink ring-1 ring-luster-ink/10 hover:ring-luster-ink/25"
            : "border border-dashed border-luster-ink/20 text-luster-faint hover:border-luster-ink/35 hover:text-luster-muted",
      )}
    >
      <span className="grid h-3.5 w-3.5 place-items-center">
        <ActiveIcon size={12} strokeWidth={2.25} className="opacity-90" />
      </span>
      <span className="text-[11.5px] font-semibold leading-none tracking-tight">
        {label}
      </span>
      <span className="grid h-1.5 w-1.5 place-items-center">
        {isFilled && !isActive && (
          <span className="block h-1.5 w-1.5 rounded-full bg-luster-accent" />
        )}
      </span>
    </button>
  );
}

function BriefEditor({
  controller,
  docId,
  value,
  onClose,
}: {
  controller: OverlayController;
  docId: string | null;
  value: string;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function commit(next: string): Promise<void> {
    const sliced = next.slice(0, DOC_BRIEF_MAX_LENGTH);
    controller.setBrief(sliced);
    if (docId) await sendSetDocContextBrief(docId, sliced);
  }

  return (
    <div className="space-y-1.5 rounded-md bg-luster-subtle/40 p-2">
      <div className="flex items-center justify-between">
        <span className="luster-eyebrow">Writer's brief</span>
        <div className="flex items-center gap-2">
          {value.trim().length > 0 && (
            <button
              type="button"
              className="luster-btn-text hover:!text-luster-err"
              onClick={async () => {
                setDraft("");
                await commit("");
              }}
            >
              Clear
            </button>
          )}
          <span className="text-[10px] text-luster-faint">
            {draft.length}/{DOC_BRIEF_MAX_LENGTH}
          </span>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        rows={4}
        value={draft}
        onChange={(event) =>
          setDraft(event.target.value.slice(0, DOC_BRIEF_MAX_LENGTH))
        }
        onBlur={() => commit(draft)}
        placeholder="What is this draft? Genre, audience, constraints, what you're trying to do…"
        spellCheck={true}
        style={{
          ...INPUT_STYLE,
          padding: "8px 12px",
          lineHeight: 1.45,
        }}
        className="luster-glass-input block w-full resize-y text-[12.5px] font-medium"
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={async () => {
            await commit(draft);
            onClose();
          }}
          className="luster-btn-text"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function PactEditor({
  controller,
  docId,
  value,
  onClose,
}: {
  controller: OverlayController;
  docId: string | null;
  value: string;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  async function commit(next: string): Promise<void> {
    const sliced = next.slice(0, DOC_PACT_MAX_LENGTH);
    controller.setPact(sliced);
    if (docId) await sendSetDocContextPact(docId, sliced);
  }

  function selectPreset(rule: string): void {
    setDraft(rule);
    void commit(rule);
  }

  return (
    <div className="space-y-2.5 rounded-md bg-luster-subtle/40 p-2.5">
      <div className="flex items-center justify-between">
        <span className="luster-eyebrow">Pact · one rule</span>
        {value.trim().length > 0 && (
          <button
            type="button"
            className="luster-btn-text hover:!text-luster-err"
            onClick={() => {
              setDraft("");
              void commit("");
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {PACT_PRESETS.map((preset) => {
          const isSelected = draft.trim() === preset.rule;
          return (
            <button
              key={preset.rule}
              type="button"
              onClick={() => selectPreset(preset.rule)}
              className={cn(
                "luster-press group flex items-start gap-2 rounded-md px-2 py-1.5 text-left transition-all",
                isSelected
                  ? "bg-luster-accent/15 ring-1 ring-luster-accent/50"
                  : "bg-luster-subtle/60 ring-1 ring-luster-ink/5 hover:ring-luster-ink/15",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors",
                  isSelected
                    ? "bg-luster-accent/30 text-luster-ink"
                    : "bg-luster-ink/5 text-luster-muted group-hover:text-luster-ink",
                )}
              >
                <preset.Icon size={11} />
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "text-[11.5px] font-medium leading-tight transition-colors",
                    isSelected ? "text-luster-ink" : "text-luster-ink-soft",
                  )}
                >
                  {preset.title}
                </div>
                <div className="mt-0.5 text-[10px] leading-snug text-luster-faint">
                  {preset.hint}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        <span className="luster-eyebrow">or write your own</span>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit(draft)}
          placeholder="e.g. one image per paragraph"
          spellCheck={true}
          style={{ ...INPUT_STYLE, padding: "8px 12px" }}
          className="luster-glass-input block w-full text-[12.5px] font-medium"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={async () => {
            await commit(draft);
            onClose();
          }}
          className="luster-btn-text"
        >
          Done
        </button>
      </div>
    </div>
  );
}
