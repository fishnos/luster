import { describe, expect, it, vi } from "vitest";
import { createInterrogationEngine } from "@/core/modes/interrogation";
import { SYSTEM_PROMPT, VERSION } from "@/core/modes/prompts/interrogation";
import type { AiCallRequest, AiCallResult, AiClient } from "@/core/aiClient";
import type { CommitDelta } from "@/adapters/types";

function fakeAiClient(reply: AiCallResult): AiClient & {
  runForMode: ReturnType<typeof vi.fn>;
} {
  return {
    runForMode: vi.fn(async (_request: AiCallRequest) => reply),
    validateKey: vi.fn(async () => ({ ok: true })),
    callRaw: vi.fn(),
  };
}

const sampleDelta: CommitDelta = {
  reason: "sentence-completed",
  sentence: "She insisted on going alone.",
  paragraph: "She insisted on going alone. The others agreed.",
  fullText: "She insisted on going alone. The others agreed.",
  sentenceIndex: 0,
  paragraphIndex: 0,
};

const validInterrogationJson = JSON.stringify({
  questions: [
    {
      kind: "intent",
      text: "What does 'alone' mean here — solitary, or just unaccompanied?",
    },
  ],
});

describe("createInterrogationEngine.run", () => {
  it("asks aiClient with cacheable system + JSON output for the interrogation mode", async () => {
    const ai = fakeAiClient({
      ok: true,
      text: validInterrogationJson,
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      tokens: { input: 80, output: 30 },
    });
    const engine = createInterrogationEngine({ aiClient: ai });

    await engine.run({
      delta: sampleDelta,
      contextBefore: "The road was long and quiet.",
      lastQuestionKind: "craft",
    });

    expect(ai.runForMode).toHaveBeenCalledTimes(1);
    const request = ai.runForMode.mock.calls[0]![0] as AiCallRequest;
    expect(request.mode).toBe("interrogation");
    expect(request.cacheableSystem).toBe(true);
    expect(request.expectJson).toBe(true);
    expect(request.systemPrompt).toBe(SYSTEM_PROMPT);
  });

  it("passes the latest sentence, recent context, and last question kind into the user prompt", async () => {
    const ai = fakeAiClient({
      ok: true,
      text: validInterrogationJson,
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      tokens: { input: 80, output: 30 },
    });
    const engine = createInterrogationEngine({ aiClient: ai });

    await engine.run({
      delta: sampleDelta,
      contextBefore: "The road was long and quiet.",
      lastQuestionKind: "craft",
    });

    const userPrompt = (ai.runForMode.mock.calls[0]![0] as AiCallRequest)
      .userPrompt;
    expect(userPrompt).toContain("## Latest sentence");
    expect(userPrompt).toContain(sampleDelta.sentence);
    expect(userPrompt).toContain("## Recent context");
    expect(userPrompt).toContain("The road was long and quiet.");
    expect(userPrompt).toContain("## Last question kind");
    expect(userPrompt).toContain("craft");
  });

  it('renders the last question kind as "none" when null', async () => {
    const ai = fakeAiClient({
      ok: true,
      text: validInterrogationJson,
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      tokens: { input: 80, output: 30 },
    });
    const engine = createInterrogationEngine({ aiClient: ai });

    await engine.run({
      delta: sampleDelta,
      contextBefore: "",
      lastQuestionKind: null,
    });

    const userPrompt = (ai.runForMode.mock.calls[0]![0] as AiCallRequest)
      .userPrompt;
    expect(userPrompt).toMatch(/## Last question kind\nnone/);
  });

  it("parses a single-question response", async () => {
    const ai = fakeAiClient({
      ok: true,
      text: validInterrogationJson,
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      tokens: { input: 80, output: 30 },
    });
    const engine = createInterrogationEngine({ aiClient: ai });

    const result = await engine.run({
      delta: sampleDelta,
      contextBefore: "",
      lastQuestionKind: "craft",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.output.questions).toHaveLength(1);
    expect(result.output.questions[0]!.kind).toBe("intent");
    expect(result.promptVersion).toBe(VERSION);
  });

  it("parses a two-question response", async () => {
    const text = JSON.stringify({
      questions: [
        { kind: "intent", text: "What does alone mean here?" },
        {
          kind: "craft",
          text: "Why open with the verb instead of the subject?",
        },
      ],
    });
    const ai = fakeAiClient({
      ok: true,
      text,
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      tokens: { input: 80, output: 30 },
    });
    const engine = createInterrogationEngine({ aiClient: ai });

    const result = await engine.run({
      delta: sampleDelta,
      contextBefore: "",
      lastQuestionKind: null,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.output.questions).toHaveLength(2);
  });

  it("returns parse-error when questions array is empty", async () => {
    const ai = fakeAiClient({
      ok: true,
      text: '{"questions":[]}',
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      tokens: { input: 80, output: 0 },
    });
    const engine = createInterrogationEngine({ aiClient: ai });

    const result = await engine.run({
      delta: sampleDelta,
      contextBefore: "",
      lastQuestionKind: null,
    });
    expect(result).toMatchObject({ ok: false, reason: "parse-error" });
  });

  it("returns parse-error when kind is outside the enum", async () => {
    const text = JSON.stringify({
      questions: [{ kind: "critique", text: "Why this verb?" }],
    });
    const ai = fakeAiClient({
      ok: true,
      text,
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      tokens: { input: 80, output: 0 },
    });
    const engine = createInterrogationEngine({ aiClient: ai });

    const result = await engine.run({
      delta: sampleDelta,
      contextBefore: "",
      lastQuestionKind: null,
    });
    expect(result).toMatchObject({ ok: false, reason: "parse-error" });
  });

  it("forwards a no-key failure from the ai client", async () => {
    const ai = fakeAiClient({
      ok: false,
      reason: "no-key",
      provider: "anthropic",
    });
    const engine = createInterrogationEngine({ aiClient: ai });

    const result = await engine.run({
      delta: sampleDelta,
      contextBefore: "",
      lastQuestionKind: null,
    });
    expect(result).toMatchObject({
      ok: false,
      reason: "no-key",
      provider: "anthropic",
    });
  });
});
