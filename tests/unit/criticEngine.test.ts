import { describe, expect, it, vi } from "vitest";
import { createCriticEngine } from "@/core/modes/critic";
import { SYSTEM_PROMPT, VERSION } from "@/core/modes/prompts/critic";
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

const sampleSentence = "The dog quickly ran out the door, which was open.";
const sampleDelta: CommitDelta = {
  reason: "sentence-completed",
  sentence: sampleSentence,
  paragraph: `${sampleSentence} The wind followed it.`,
  fullText: `${sampleSentence} The wind followed it.`,
  sentenceIndex: 0,
  paragraphIndex: 0,
};

describe("createCriticEngine.run", () => {
  it("asks aiClient with cacheable system + JSON output for the critic mode", async () => {
    const ai = fakeAiClient({
      ok: true,
      text: '{"issues":[]}',
      provider: "openai",
      model: "gpt-5-mini",
      tokens: { input: 60, output: 4 },
    });
    const engine = createCriticEngine({ aiClient: ai });

    await engine.run({ delta: sampleDelta, contextBefore: "" });

    const request = ai.runForMode.mock.calls[0]![0] as AiCallRequest;
    expect(request.mode).toBe("critic");
    expect(request.cacheableSystem).toBe(true);
    expect(request.expectJson).toBe(true);
    expect(request.systemPrompt).toBe(SYSTEM_PROMPT);
  });

  it("passes the sentence (with offset reference label), paragraph, and context in the user prompt", async () => {
    const ai = fakeAiClient({
      ok: true,
      text: '{"issues":[]}',
      provider: "openai",
      model: "gpt-5-mini",
      tokens: { input: 60, output: 4 },
    });
    const engine = createCriticEngine({ aiClient: ai });

    await engine.run({
      delta: sampleDelta,
      contextBefore: "A door creaked open.",
    });

    const userPrompt = (ai.runForMode.mock.calls[0]![0] as AiCallRequest)
      .userPrompt;
    expect(userPrompt).toContain("## Context (Prior Flow)");
    expect(userPrompt).toContain("A door creaked open.");
    expect(userPrompt).toContain("## Containing Paragraph");
    expect(userPrompt).toContain(sampleDelta.paragraph);
    expect(userPrompt).toMatch(/## Target Sentence \(Focus[^\n]*\)\n/);
    expect(userPrompt).toContain(sampleSentence);
  });

  it("returns an empty issues list when the model says the sentence is clean", async () => {
    const ai = fakeAiClient({
      ok: true,
      text: '{"issues":[]}',
      provider: "openai",
      model: "gpt-5-mini",
      tokens: { input: 60, output: 4 },
    });
    const engine = createCriticEngine({ aiClient: ai });

    const result = await engine.run({ delta: sampleDelta, contextBefore: "" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.output.issues).toEqual([]);
    expect(result.droppedIssueCount).toBe(0);
    expect(result.promptVersion).toBe(VERSION);
  });

  it("parses multiple in-bounds issues and preserves them", async () => {
    const text = JSON.stringify({
      issues: [
        {
          severity: "rhythm",
          span: { start: 8, end: 15 },
          label: "weak adverb",
          suggestion: "try a stronger verb",
        },
        {
          severity: "clarity",
          span: { start: 33, end: 38 },
          label: "vague pronoun: 'which'",
        },
      ],
    });
    const ai = fakeAiClient({
      ok: true,
      text,
      provider: "openai",
      model: "gpt-5-mini",
      tokens: { input: 60, output: 30 },
    });
    const engine = createCriticEngine({ aiClient: ai });

    const result = await engine.run({ delta: sampleDelta, contextBefore: "" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.output.issues).toHaveLength(2);
    expect(result.output.issues[0]!.severity).toBe("rhythm");
    expect(result.output.issues[1]!.suggestion).toBeUndefined();
    expect(result.droppedIssueCount).toBe(0);
  });

  it("clamps issues whose span overruns the sentence bounds", async () => {
    const sentenceLength = sampleSentence.length;
    const text = JSON.stringify({
      issues: [
        {
          severity: "rhythm",
          span: { start: 8, end: 15 },
          label: "weak adverb",
        },
        {
          severity: "structural",
          span: { start: sentenceLength + 5, end: sentenceLength + 20 },
          label: "overrun span",
        },
      ],
    });
    const ai = fakeAiClient({
      ok: true,
      text,
      provider: "openai",
      model: "gpt-5-mini",
      tokens: { input: 60, output: 20 },
    });
    const engine = createCriticEngine({ aiClient: ai });

    const result = await engine.run({ delta: sampleDelta, contextBefore: "" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.output.issues).toHaveLength(2);
    expect(result.output.issues[0]!.label).toBe("weak adverb");
    const clamped = result.output.issues[1]!;
    expect(clamped.span.start).toBeGreaterThanOrEqual(0);
    expect(clamped.span.end).toBeLessThanOrEqual(sentenceLength);
    expect(clamped.span.end).toBeGreaterThan(clamped.span.start);
    expect(result.droppedIssueCount).toBe(0);
  });

  it("returns parse-error when severity is not in the enum", async () => {
    const text = JSON.stringify({
      issues: [{ severity: "minor", span: { start: 0, end: 3 }, label: "x" }],
    });
    const ai = fakeAiClient({
      ok: true,
      text,
      provider: "openai",
      model: "gpt-5-mini",
      tokens: { input: 60, output: 4 },
    });
    const engine = createCriticEngine({ aiClient: ai });

    const result = await engine.run({ delta: sampleDelta, contextBefore: "" });
    expect(result).toMatchObject({ ok: false, reason: "parse-error" });
  });

  it("clamps an issue with end <= start instead of failing", async () => {
    const text = JSON.stringify({
      issues: [{ severity: "rhythm", span: { start: 10, end: 5 }, label: "x" }],
    });
    const ai = fakeAiClient({
      ok: true,
      text,
      provider: "openai",
      model: "gpt-5-mini",
      tokens: { input: 60, output: 4 },
    });
    const engine = createCriticEngine({ aiClient: ai });

    const result = await engine.run({ delta: sampleDelta, contextBefore: "" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    const issue = result.output.issues[0]!;
    expect(issue.span.end).toBeGreaterThan(issue.span.start);
  });

  it("forwards a rate-limited failure with retry hint", async () => {
    const ai = fakeAiClient({
      ok: false,
      reason: "rate-limited",
      retryAfterMs: 5000,
      provider: "openai",
    });
    const engine = createCriticEngine({ aiClient: ai });

    const result = await engine.run({ delta: sampleDelta, contextBefore: "" });
    expect(result).toMatchObject({
      ok: false,
      reason: "rate-limited",
      retryAfterMs: 5000,
    });
  });
});
