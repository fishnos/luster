import { describe, expect, it, vi } from "vitest";
import { createReadingEngine } from "@/core/modes/reading";
import { SYSTEM_PROMPT, VERSION } from "@/core/modes/prompts/reading";
import type { AiCallRequest, AiCallResult, AiClient } from "@/core/aiClient";
import type { CommitDelta } from "@/adapters/types";
import type { DocStats } from "@/core/stats";

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
  sentence: "The bell rang twice.",
  paragraph: "The bell rang twice. She looked up but saw nothing.",
  fullText:
    "The morning was quiet.\n\nThe bell rang twice. She looked up but saw nothing.",
  sentenceIndex: 1,
  paragraphIndex: 1,
};

const sampleStats: DocStats = {
  words: 16,
  sentences: 3,
  paragraphs: 2,
  characters: 80,
  avgSentenceWords: 5.33,
  longestSentenceWords: 8,
  fleschKincaidGrade: 4.2,
  passiveRatio: 0,
  repeatedOpeners: [{ opener: "the", count: 2 }],
  topWords: [{ word: "bell", count: 1 }],
};

const validReadingJson = JSON.stringify({
  voiceTrend: "The voice stays measured and external.",
  rhythm: "Two short clauses then a longer one with a contrast.",
  paragraphPurpose: "Marks an interruption that the protagonist registers.",
  transitionStrength: "Crisp jump from quiet morning to the bell.",
  notes: ["Bell could become a recurring image."],
});

describe("createReadingEngine.run", () => {
  it("asks aiClient for the reading mode with a cacheable system prompt and JSON output", async () => {
    const ai = fakeAiClient({
      ok: true,
      text: validReadingJson,
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      tokens: { input: 100, output: 40 },
    });
    const engine = createReadingEngine({ aiClient: ai });

    await engine.run({
      delta: sampleDelta,
      stats: sampleStats,
      contextBefore: "The morning was quiet.",
    });

    expect(ai.runForMode).toHaveBeenCalledTimes(1);
    const request = ai.runForMode.mock.calls[0]![0] as AiCallRequest;
    expect(request.mode).toBe("reading");
    expect(request.cacheableSystem).toBe(true);
    expect(request.expectJson).toBe(true);
    expect(request.systemPrompt).toBe(SYSTEM_PROMPT);
  });

  it("passes the new paragraph, prior context, and a stats summary in the user prompt", async () => {
    const ai = fakeAiClient({
      ok: true,
      text: validReadingJson,
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      tokens: { input: 100, output: 40 },
    });
    const engine = createReadingEngine({ aiClient: ai });

    await engine.run({
      delta: sampleDelta,
      stats: sampleStats,
      contextBefore: "The morning was quiet.",
    });

    const userPrompt = (ai.runForMode.mock.calls[0]![0] as AiCallRequest)
      .userPrompt;
    expect(userPrompt).toContain("## Stats");
    expect(userPrompt).toContain("avgSentenceWords=5.33");
    expect(userPrompt).toContain("repeatedOpeners: the×2");
    expect(userPrompt).toContain("## Recent context");
    expect(userPrompt).toContain("The morning was quiet.");
    expect(userPrompt).toContain("## New paragraph");
    expect(userPrompt).toContain(sampleDelta.paragraph);
  });

  it("returns the parsed ReadingOutput on a clean JSON response", async () => {
    const ai = fakeAiClient({
      ok: true,
      text: validReadingJson,
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      tokens: { input: 100, output: 40 },
    });
    const engine = createReadingEngine({ aiClient: ai });

    const result = await engine.run({
      delta: sampleDelta,
      stats: sampleStats,
      contextBefore: "",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.output.voiceTrend).toMatch(/measured/);
    expect(result.output.notes).toHaveLength(1);
    expect(result.tokens).toEqual({ input: 100, output: 40 });
    expect(result.provider).toBe("anthropic");
    expect(result.model).toBe("claude-sonnet-4-6");
    expect(result.promptVersion).toBe(VERSION);
  });

  it("tolerates ```json``` fenced responses", async () => {
    const ai = fakeAiClient({
      ok: true,
      text: "```json\n" + validReadingJson + "\n```",
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      tokens: { input: 100, output: 40 },
    });
    const engine = createReadingEngine({ aiClient: ai });

    const result = await engine.run({
      delta: sampleDelta,
      stats: sampleStats,
      contextBefore: "",
    });
    expect(result.ok).toBe(true);
  });

  it("returns parse-error when the response is not valid JSON", async () => {
    const ai = fakeAiClient({
      ok: true,
      text: "I cannot help with that request.",
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      tokens: { input: 100, output: 0 },
    });
    const engine = createReadingEngine({ aiClient: ai });

    const result = await engine.run({
      delta: sampleDelta,
      stats: sampleStats,
      contextBefore: "",
    });
    expect(result).toMatchObject({ ok: false, reason: "parse-error" });
  });

  it("returns parse-error when required schema fields are missing", async () => {
    const ai = fakeAiClient({
      ok: true,
      text: '{"voiceTrend":"x","rhythm":"y"}',
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      tokens: { input: 100, output: 0 },
    });
    const engine = createReadingEngine({ aiClient: ai });

    const result = await engine.run({
      delta: sampleDelta,
      stats: sampleStats,
      contextBefore: "",
    });
    expect(result).toMatchObject({ ok: false, reason: "parse-error" });
  });

  it("forwards a no-key failure from the ai client without parsing", async () => {
    const ai = fakeAiClient({
      ok: false,
      reason: "no-key",
      provider: "anthropic",
    });
    const engine = createReadingEngine({ aiClient: ai });

    const result = await engine.run({
      delta: sampleDelta,
      stats: sampleStats,
      contextBefore: "",
    });
    expect(result).toEqual({
      ok: false,
      reason: "no-key",
      provider: "anthropic",
      retryAfterMs: undefined,
      error: undefined,
    });
  });

  it("forwards a rate-limited failure with retry hint", async () => {
    const ai = fakeAiClient({
      ok: false,
      reason: "rate-limited",
      retryAfterMs: 17_000,
      provider: "anthropic",
    });
    const engine = createReadingEngine({ aiClient: ai });

    const result = await engine.run({
      delta: sampleDelta,
      stats: sampleStats,
      contextBefore: "",
    });
    expect(result).toMatchObject({
      ok: false,
      reason: "rate-limited",
      retryAfterMs: 17_000,
      provider: "anthropic",
    });
  });

  it("forwards a provider-error from upstream", async () => {
    const ai = fakeAiClient({
      ok: false,
      reason: "provider-error",
      provider: "anthropic",
      error: "anthropic 500: upstream",
    });
    const engine = createReadingEngine({ aiClient: ai });

    const result = await engine.run({
      delta: sampleDelta,
      stats: sampleStats,
      contextBefore: "",
    });
    expect(result).toMatchObject({
      ok: false,
      reason: "provider-error",
      error: "anthropic 500: upstream",
    });
  });
});
