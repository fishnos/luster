import type { Adapter, AdapterHandle, CommitDelta } from "@/adapters/types";
import type { OverlayController } from "@/ui/state";
import type { RunModeResultData } from "@/core/messaging";
import type { ModeName } from "@/core/types";
import type { QuestionKind } from "@/core/modes/prompts/interrogation";
import { computeStats } from "@/core/stats";
import { docIdFor } from "@/lib/docId";
import { sendRunMode } from "@/core/sendRequest";
import { splitParagraphs } from "@/lib/sentenceSplit";
import { createKeyVault } from "@/core/keyVault";
import { createBrowserLocalStorage } from "@/core/storageBackend";

const CONTEXT_PARAGRAPH_WINDOW = 3;
const COMMIT_QUIET_MS = 1200;

export interface BootstrapAdapterDeps {
  adapter: Adapter;
  controller: OverlayController;
  setCaretPopup: (
    rect: DOMRect | null,
    data: import("@/core/types").CaretPopupData | null,
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

  if (!deps.runMode) {
    void hydrateSettings(deps.controller);
  }

  const unsubscribeText = handle.onTextChange((text) => {
    const stats = computeStats(text);
    if ((window as unknown as { __lusterDebug?: boolean }).__lusterDebug) {
      console.log(
        `[Luster panel] text=${text.length} chars, stats: words=${stats.words} sentences=${stats.sentences}`,
      );
    }
    deps.controller.setStats(stats);
  });

  let lastCaretPopupData: import("@/core/types").CaretPopupData | null = null;
  let lastActiveMode = deps.controller.getState().activeMode;
  const unsubscribeMode = deps.controller.subscribe(() => {
    const next = deps.controller.getState().activeMode;
    if (next === lastActiveMode) return;
    lastActiveMode = next;
    if (next === "reading") {
      lastCaretPopupData = null;
      deps.setCaretPopup(null, null);
    }
  });
  const handleCaretChange = (rect: DOMRect | null) => {
    if (!rect) {
      if (lastCaretPopupData) {
        lastCaretPopupData = null;
        deps.setCaretPopup(null, null);
      }
      return;
    }
    const panelWidth = 360;
    const padding = 24;
    let x = rect.right + padding;
    if (x + panelWidth > window.innerWidth - padding) {
      x = rect.left - panelWidth - padding;
    }
    deps.controller.setCaretPosition({
      x: Math.max(padding, x),
      y: Math.max(padding, rect.top - 10),
    });
    if (lastCaretPopupData) {
      deps.setCaretPopup(rect, lastCaretPopupData);
    }
  };
  const unsubscribeCaret =
    typeof handle.onCaretChange === "function"
      ? handle.onCaretChange(handleCaretChange)
      : () => {};

  let pendingCommit: { mode: ModeName; delta: CommitDelta } | null = null;
  let commitTimer: ReturnType<typeof setTimeout> | null = null;
  const lastSentenceFiredFor = new Set<string>();

  function flushPendingCommit(): void {
    if (commitTimer) {
      clearTimeout(commitTimer);
      commitTimer = null;
    }
    if (!pendingCommit) return;
    const { mode, delta } = pendingCommit;
    pendingCommit = null;
    const sentenceKey = delta.sentence
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    if (sentenceKey.length === 0) return;
    if (lastSentenceFiredFor.has(sentenceKey)) return;
    lastSentenceFiredFor.add(sentenceKey);
    if (lastSentenceFiredFor.size > 200) {
      const next = new Set<string>();
      let kept = 0;
      for (const value of lastSentenceFiredFor) {
        if (kept >= 100) break;
        next.add(value);
        kept += 1;
      }
      lastSentenceFiredFor.clear();
      for (const value of next) lastSentenceFiredFor.add(value);
    }
    void runForMode(mode, delta);
  }

  const unsubscribeCommit = handle.onCommit((delta) => {
    const state = deps.controller.getState();
    const activeMode = state.activeMode;
    pendingCommit = { mode: activeMode, delta };
    if (commitTimer) clearTimeout(commitTimer);
    commitTimer = setTimeout(flushPendingCommit, COMMIT_QUIET_MS);
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
      lastCaretPopupData = null;
      deps.setCaretPopup(null, null);
      return;
    }

    deps.controller.setModeOutput(mode, result.output, result.provider);

    if (mode === "reading") {
      lastCaretPopupData = null;
      deps.setCaretPopup(null, null);
    }

    if (mode === "interrogation" && result.output.mode === "interrogation") {
      const lastQuestion = result.output.result.questions.at(-1);
      lastQuestionKind = lastQuestion?.kind ?? lastQuestionKind;

      if (lastQuestion) {
        const caretRect = handle.caretRect();
        lastCaretPopupData = {
          type: "interrogation",
          label: "Reader",
          text: lastQuestion.text,
          kind: lastQuestion.kind,
        };
        deps.setCaretPopup(caretRect, lastCaretPopupData);
      } else {
        lastCaretPopupData = null;
        deps.setCaretPopup(null, null);
      }
    }

    if (mode === "critic" && result.output.mode === "critic") {
      const topIssue = result.output.result.issues[0] ?? null;
      const caretRect = handle.caretRect();
      if (topIssue) {
        lastCaretPopupData = {
          type: "critic",
          label: "Critique",
          text: topIssue.suggestion || topIssue.label,
          severity: topIssue.severity,
        };
        deps.setCaretPopup(caretRect, lastCaretPopupData);
      } else {
        lastCaretPopupData = null;
        deps.setCaretPopup(null, null);
      }
    }
  }

  return {
    detach() {
      if (commitTimer) {
        clearTimeout(commitTimer);
        commitTimer = null;
      }
      pendingCommit = null;
      lastSentenceFiredFor.clear();
      unsubscribeText();
      unsubscribeCaret();
      unsubscribeCommit();
      unsubscribeMode();
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

async function hydrateSettings(controller: OverlayController): Promise<void> {
  try {
    const keyVault = createKeyVault(createBrowserLocalStorage());
    const [defaultMode, autoLaunch, activeProvider, providersWithKey] =
      await Promise.all([
        keyVault.getDefaultMode(),
        keyVault.getAutoLaunch(),
        keyVault.getActiveProvider(),
        keyVault.listProvidersWithKey(),
      ]);
    controller.setActiveMode(defaultMode);
    controller.setAutoLaunch(autoLaunch);
    controller.setMinimized(!autoLaunch);
    if (providersWithKey.length === 0) {
      controller.setConnectState("missing", null);
    } else if (providersWithKey.includes(activeProvider)) {
      controller.setConnectState("connected", activeProvider);
    } else {
      controller.setConnectState("missing", activeProvider);
    }
  } catch {
    controller.setConnectState("missing", null);
  }
}
