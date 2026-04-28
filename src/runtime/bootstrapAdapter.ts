import type { Adapter, AdapterHandle, CommitDelta } from "@/adapters/types";
import type { OverlayController } from "@/ui/state";
import type { RunModeResultData } from "@/core/messaging";
import type { ModeName } from "@/core/types";
import type { QuestionKind } from "@/core/modes/prompts/interrogation";
import { computeStats } from "@/core/stats";
import { docIdFor } from "@/lib/docId";
import { sendRunMode } from "@/core/sendRequest";
import { splitParagraphs } from "@/lib/sentenceSplit";

const CONTEXT_PARAGRAPH_WINDOW = 3;

export interface BootstrapAdapterDeps {
  adapter: Adapter;
  controller: OverlayController;
  setCaretIssue: (
    rect: DOMRect | null,
    issue: import("@/core/types").CriticIssue | null,
  ) => void;
  hostDocument?: Document;
  hostWindow?: Window;
  runMode?: typeof sendRunMode;
}

export interface BootstrapAdapterDispose {
  detach: () => void;
}

export function bootstrapAdapter(
  deps: BootstrapAdapterDeps,
): BootstrapAdapterDispose | null {
  const hostDocument = deps.hostDocument ?? document;
  const hostWindow = deps.hostWindow ?? window;
  const runMode = deps.runMode ?? sendRunMode;

  const handle: AdapterHandle = deps.adapter.attach(hostDocument);
  const docId = docIdFor(hostWindow.location.href, hostDocument.title);
  let lastQuestionKind: QuestionKind | null = null;

  const unsubscribeText = handle.onTextChange((text) => {
    deps.controller.setStats(computeStats(text));
  });

  const unsubscribeCommit = handle.onCommit((delta) => {
    const activeMode = deps.controller.getState().activeMode;
    void runForMode(activeMode, delta);
  });

  async function runForMode(mode: ModeName, delta: CommitDelta): Promise<void> {
    deps.controller.markModePending(mode);

    if (mode === "critic") {
      deps.controller.setCriticSentence(delta.sentence);
    }

    const contextBefore = computeContextBefore(delta);
    const stats = computeStats(delta.fullText);

    let result: RunModeResultData;
    try {
      result = await runMode({
        mode,
        delta,
        stats,
        contextBefore,
        lastQuestionKind: mode === "interrogation" ? lastQuestionKind : null,
        docId,
      });
    } catch (error) {
      deps.controller.setModeError(
        mode,
        error instanceof Error ? error.message : String(error),
      );
      return;
    }

    if (!result.ok) {
      if (result.reason === "rate-limited") {
        deps.controller.setModeRateLimited(mode, result.retryAfterMs ?? 60_000);
      } else if (result.reason === "no-key") {
        deps.controller.setModeError(
          mode,
          `No API key for ${result.provider ?? "the active provider"}. Open Luster settings to add one.`,
        );
      } else {
        deps.controller.setModeError(mode, result.error ?? result.reason);
      }
      if (mode === "critic") {
        deps.setCaretIssue(null, null);
      }
      return;
    }

    deps.controller.setModeOutput(mode, result.output, result.provider);

    if (mode === "interrogation" && result.output.mode === "interrogation") {
      const lastQuestion = result.output.result.questions.at(-1);
      lastQuestionKind = lastQuestion?.kind ?? lastQuestionKind;
    }

    if (mode === "critic" && result.output.mode === "critic") {
      const topIssue = result.output.result.issues[0] ?? null;
      const caretRect = handle.caretRect();
      deps.setCaretIssue(caretRect, topIssue);
    }
  }

  return {
    detach() {
      unsubscribeText();
      unsubscribeCommit();
      handle.detach();
    },
  };
}

function computeContextBefore(delta: CommitDelta): string {
  const paragraphs = splitParagraphs(delta.fullText);
  const targetIndex = Math.min(delta.paragraphIndex, paragraphs.length - 1);
  const start = Math.max(0, targetIndex - CONTEXT_PARAGRAPH_WINDOW);
  return paragraphs.slice(start, targetIndex).join("\n\n");
}
