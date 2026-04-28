import { describe, expect, it, vi } from "vitest";
import { bootstrapAdapter } from "@/runtime/bootstrapAdapter";
import { createOverlayController } from "@/ui/state";
import type {
  Adapter,
  AdapterHandle,
  CommitDelta,
  UnsubscribeFn,
} from "@/adapters/types";
import type { RunModeRequest, RunModeResultData } from "@/core/messaging";

type RunModePayload = RunModeRequest["payload"];
type RunMode = (payload: RunModePayload) => Promise<RunModeResultData>;

interface FakeAdapterHandle extends AdapterHandle {
  emitCommit: (delta: CommitDelta) => void;
  emitTextChange: (text: string) => void;
}

function createFakeAdapter(): { adapter: Adapter; handle: FakeAdapterHandle } {
  const commitListeners = new Set<(delta: CommitDelta) => void>();
  const textListeners = new Set<(text: string) => void>();
  let attached = false;

  const handle: FakeAdapterHandle = {
    readText: () => "A sentence here. Another sentence.",
    onCommit(callback): UnsubscribeFn {
      commitListeners.add(callback);
      return () => commitListeners.delete(callback);
    },
    onTextChange(callback): UnsubscribeFn {
      textListeners.add(callback);
      callback("A sentence here. Another sentence.");
      return () => textListeners.delete(callback);
    },
    caretRect: () => null,
    detach: () => {
      commitListeners.clear();
      textListeners.clear();
      attached = false;
    },
    emitCommit(delta) {
      for (const listener of commitListeners) listener(delta);
    },
    emitTextChange(text) {
      for (const listener of textListeners) listener(text);
    },
  };

  const adapter: Adapter = {
    id: "prosemirror",
    match: () => true,
    attach: () => {
      attached = true;
      return handle;
    },
  };

  return { adapter, handle };
}

const sampleDelta: CommitDelta = {
  reason: "sentence-completed",
  sentence: "A sentence here.",
  paragraph: "A sentence here. Another sentence.",
  fullText: "A sentence here. Another sentence.",
  sentenceIndex: 0,
  paragraphIndex: 0,
};

describe("bootstrapAdapter", () => {
  it("updates live stats when the adapter reports text changes", () => {
    const controller = createOverlayController();
    const { adapter } = createFakeAdapter();
    const runMode = vi.fn();

    bootstrapAdapter({
      adapter,
      controller,
      setCaretIssue: vi.fn(),
      hostDocument: document,
      hostWindow: window,
      runMode,
    });

    expect(controller.getState().stats?.sentences).toBe(2);
  });

  it("runs the active mode through runMode on each commit and surfaces the output", async () => {
    const controller = createOverlayController();
    const { adapter, handle } = createFakeAdapter();
    const runMode = vi.fn<RunMode>(
      async (): Promise<RunModeResultData> => ({
        ok: true,
        output: {
          mode: "reading",
          result: {
            voiceTrend: "measured",
            rhythm: "steady",
            paragraphPurpose: "opens",
            transitionStrength: "soft",
            notes: [],
          },
        },
        tokens: { input: 1, output: 1 },
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        promptVersion: "reading-v1",
      }),
    );

    bootstrapAdapter({
      adapter,
      controller,
      setCaretIssue: vi.fn(),
      hostDocument: document,
      hostWindow: window,
      runMode,
    });

    handle.emitCommit(sampleDelta);
    await flushMicrotasks();

    expect(runMode).toHaveBeenCalledTimes(1);
    expect(runMode.mock.calls[0]![0]).toMatchObject({
      mode: "reading",
      delta: sampleDelta,
    });
    const info = controller.getState().modes.reading;
    expect(info.status).toBe("ok");
    expect(info.provider).toBe("anthropic");
  });

  it("routes critic-mode commits and forwards the issue to setCaretIssue", async () => {
    const controller = createOverlayController();
    controller.setActiveMode("critic");

    const { adapter, handle } = createFakeAdapter();
    const setCaretIssue = vi.fn();
    const runMode = vi.fn<RunMode>(
      async (): Promise<RunModeResultData> => ({
        ok: true,
        output: {
          mode: "critic",
          result: {
            issues: [
              {
                severity: "rhythm",
                span: { start: 0, end: 4 },
                label: "weak adverb",
              },
            ],
          },
        },
        tokens: { input: 1, output: 1 },
        provider: "openai",
        model: "gpt-5-mini",
        promptVersion: "critic-v1",
      }),
    );

    bootstrapAdapter({
      adapter,
      controller,
      setCaretIssue,
      hostDocument: document,
      hostWindow: window,
      runMode,
    });

    handle.emitCommit(sampleDelta);
    await flushMicrotasks();

    expect(controller.getState().criticSentence).toBe(sampleDelta.sentence);
    expect(setCaretIssue).toHaveBeenCalled();
    const lastCall = setCaretIssue.mock.calls.at(-1)!;
    expect(lastCall[1]).toMatchObject({
      severity: "rhythm",
      label: "weak adverb",
    });
  });

  it("alternates the question kind across interrogation commits", async () => {
    const controller = createOverlayController();
    controller.setActiveMode("interrogation");
    const { adapter, handle } = createFakeAdapter();
    const replies: RunModeResultData[] = [
      {
        ok: true,
        output: {
          mode: "interrogation",
          result: { questions: [{ kind: "craft", text: "Why this verb?" }] },
        },
        tokens: { input: 1, output: 1 },
        provider: "anthropic",
        model: "m",
        promptVersion: "interrogation-v1",
      },
      {
        ok: true,
        output: {
          mode: "interrogation",
          result: {
            questions: [{ kind: "intent", text: "What does X mean?" }],
          },
        },
        tokens: { input: 1, output: 1 },
        provider: "anthropic",
        model: "m",
        promptVersion: "interrogation-v1",
      },
    ];
    const runMode = vi.fn<RunMode>(async () => replies.shift()!);

    bootstrapAdapter({
      adapter,
      controller,
      setCaretIssue: vi.fn(),
      hostDocument: document,
      hostWindow: window,
      runMode,
    });

    handle.emitCommit(sampleDelta);
    await flushMicrotasks();
    handle.emitCommit(sampleDelta);
    await flushMicrotasks();

    expect(runMode.mock.calls[0]![0].lastQuestionKind).toBeNull();
    expect(runMode.mock.calls[1]![0].lastQuestionKind).toBe("craft");
  });

  it("marks the mode as rate-limited when runMode reports rate-limited", async () => {
    const controller = createOverlayController();
    const { adapter, handle } = createFakeAdapter();
    const runMode = vi.fn<RunMode>(
      async (): Promise<RunModeResultData> => ({
        ok: false,
        reason: "rate-limited",
        retryAfterMs: 12_000,
        provider: "anthropic",
      }),
    );

    bootstrapAdapter({
      adapter,
      controller,
      setCaretIssue: vi.fn(),
      hostDocument: document,
      hostWindow: window,
      runMode,
    });

    handle.emitCommit(sampleDelta);
    await flushMicrotasks();

    const info = controller.getState().modes.reading;
    expect(info.status).toBe("rate-limited");
    expect(info.retryAfterMs).toBe(12_000);
  });
});

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
