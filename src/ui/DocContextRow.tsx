import { useRef, useState } from "react";
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
import { SECTION_TRANSITION, type LusterIcon } from "@/ui/motion";
import { cn } from "@/ui/cn";

interface PactPreset {
  Icon: LusterIcon;
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

type EditorTarget = "brief" | "pact" | null;

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

  function chooseTarget(target: EditorTarget): void {
    setOpenTarget((current) => (current === target ? null : target));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <ContextPill
          label="Brief"
          FilledIcon={FileText}
          isFilled={briefValue.trim().length > 0}
          isActive={openTarget === "brief"}
          onClick={() => chooseTarget("brief")}
        />
        <ContextPill
          label="Pact"
          FilledIcon={Crosshair}
          isFilled={pactValue.trim().length > 0}
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
            transition={SECTION_TRANSITION}
            style={{ overflow: "hidden" }}
          >
            {openTarget === "brief" ? (
              <BriefEditor
                key={`brief:${briefValue}`}
                controller={controller}
                docId={docId}
                initialValue={briefValue}
                onClose={() => setOpenTarget(null)}
              />
            ) : (
              <PactEditor
                key={`pact:${pactValue}`}
                controller={controller}
                docId={docId}
                initialValue={pactValue}
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
  FilledIcon: LusterIcon;
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
        "luster-press inline-flex h-7 items-center gap-2 rounded-full px-3 transition-all",
        isActive
          ? "bg-luster-ink/12 text-luster-ink ring-1 ring-luster-ink/40"
          : isFilled
            ? "bg-luster-subtle text-luster-ink ring-1 ring-luster-ember/40 hover:ring-luster-ember/60"
            : "border border-dashed border-luster-ink/20 text-luster-faint hover:border-luster-ink/35 hover:text-luster-muted",
      )}
    >
      <ActiveIcon size={12} strokeWidth={2} className="opacity-90" />
      <span className="text-[11.5px] font-medium leading-none tracking-tight">
        {label}
      </span>
    </button>
  );
}

interface EditorShellProps {
  title: string;
  hasValue: boolean;
  onClear: () => void;
  onDone: () => void;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}

function EditorShell({
  title,
  hasValue,
  onClear,
  onDone,
  trailing,
  children,
}: EditorShellProps) {
  return (
    <div className="space-y-2 rounded-md bg-luster-subtle/40 p-2.5">
      <div className="flex items-center justify-between">
        <span className="luster-eyebrow">{title}</span>
        <div className="flex items-center gap-2">
          {hasValue && (
            <button
              type="button"
              className="luster-btn-text hover:!text-luster-err"
              onClick={onClear}
            >
              Clear
            </button>
          )}
          {trailing}
        </div>
      </div>
      {children}
      <div className="flex justify-end">
        <button type="button" onClick={onDone} className="luster-btn-text">
          Done
        </button>
      </div>
    </div>
  );
}

interface BriefEditorProps {
  controller: OverlayController;
  docId: string | null;
  initialValue: string;
  onClose: () => void;
}

function BriefEditor({
  controller,
  docId,
  initialValue,
  onClose,
}: BriefEditorProps) {
  const [draft, setDraft] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function commit(next: string): void {
    const sliced = next.slice(0, DOC_BRIEF_MAX_LENGTH);
    setDraft(sliced);
    controller.setBrief(sliced);
    if (docId) void sendSetDocContextBrief(docId, sliced);
  }

  return (
    <EditorShell
      title="Writer's brief"
      hasValue={draft.trim().length > 0}
      onClear={() => commit("")}
      onDone={onClose}
      trailing={
        <span className="text-[10px] text-luster-faint">
          {draft.length}/{DOC_BRIEF_MAX_LENGTH}
        </span>
      }
    >
      <textarea
        ref={textareaRef}
        rows={4}
        value={draft}
        autoFocus
        onChange={(event) =>
          setDraft(event.target.value.slice(0, DOC_BRIEF_MAX_LENGTH))
        }
        onBlur={() => commit(draft)}
        placeholder="What is this draft? Genre, audience, constraints, what you're trying to do…"
        className="luster-glass-input luster-textarea"
      />
    </EditorShell>
  );
}

interface PactEditorProps {
  controller: OverlayController;
  docId: string | null;
  initialValue: string;
  onClose: () => void;
}

function PactEditor({
  controller,
  docId,
  initialValue,
  onClose,
}: PactEditorProps) {
  const [draft, setDraft] = useState(initialValue);

  function commit(next: string): void {
    const sliced = next.slice(0, DOC_PACT_MAX_LENGTH);
    setDraft(sliced);
    controller.setPact(sliced);
    if (docId) void sendSetDocContextPact(docId, sliced);
  }

  const matchingPreset = PACT_PRESETS.find(
    (preset) => preset.rule === draft.trim(),
  );

  return (
    <EditorShell
      title="Pact · one rule"
      hasValue={draft.trim().length > 0}
      onClear={() => commit("")}
      onDone={onClose}
    >
      <div className="grid grid-cols-2 gap-1.5">
        {PACT_PRESETS.map((preset) => (
          <PactPresetCard
            key={preset.rule}
            preset={preset}
            isSelected={matchingPreset?.rule === preset.rule}
            onSelect={() => commit(preset.rule)}
          />
        ))}
      </div>

      <div className="space-y-1">
        <span className="luster-eyebrow">or write your own</span>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit(draft)}
          placeholder="e.g. one image per paragraph"
          className="luster-glass-input luster-text-input"
        />
      </div>
    </EditorShell>
  );
}

function PactPresetCard({
  preset,
  isSelected,
  onSelect,
}: {
  preset: PactPreset;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
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
        <preset.Icon size={11} strokeWidth={2.25} />
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
}
