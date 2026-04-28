import { describe, expect, it, vi } from "vitest";
import { createModeEngines } from "@/core/modes";
import type { AiCallRequest, AiCallResult, AiClient } from "@/core/aiClient";
import type { CommitDelta } from "@/adapters/types";
import type { DocStats } from "@/core/stats";

function fakeAiClient(
  router: (request: AiCallRequest) => AiCallResult,
): AiClient & { runForMode: ReturnType<typeof vi.fn> } {
  return {
    runForMode: vi.fn(async (request: AiCallRequest) => router(request)),
    validateKey: vi.fn(async () => ({ ok: true })),
    callRaw: vi.fn(),
  };
}

const baseDelta: CommitDelta = {
  reason: "sentence-completed",
  sentence: "A sentence here.",
  paragraph: "A sentence here. Another sentence.",
  fullText: "A sentence here. Another sentence.",
  sentenceIndex: 0,
  paragraphIndex: 0,
};

const baseStats: DocStats = {
  words: 4,
  sentences: 2,
  paragraphs: 1,
  characters: 30,
  avgSentenceWords: 2,
  longestSentenceWords: 2,
  fleschKincaidGrade: 1,
  passiveRatio: 0,
  repeatedOpeners: [],
  topWords: [],
};

describe("createModeEngines", () => {
  it("exposes all three engines wired to the same aiClient", async () => {
    const ai = fakeAiClient((request) => {
      if (request.mode === "reading") {
        return {
          ok: true,
          provider: "anthropic",
          model: "m",
          tokens: { input: 1, output: 1 },
          text: JSON.stringify({
            voiceTrend: "a",
            rhythm: "b",
            paragraphPurpose: "c",
            transitionStrength: "d",
            notes: [],
          }),
        };
      }
      if (request.mode === "interrogation") {
        return {
          ok: true,
          provider: "anthropic",
          model: "m",
          tokens: { input: 1, output: 1 },
          text: JSON.stringify({
            questions: [{ kind: "craft", text: "why this verb?" }],
          }),
        };
      }
      return {
        ok: true,
        provider: "openai",
        model: "m",
        tokens: { input: 1, output: 1 },
        text: '{"issues":[]}',
      };
    });

    const engines = createModeEngines({ aiClient: ai });

    const reading = await engines.reading.run({
      delta: baseDelta,
      stats: baseStats,
      contextBefore: "",
    });
    const interrogation = await engines.interrogation.run({
      delta: baseDelta,
      contextBefore: "",
      lastQuestionKind: null,
    });
    const critic = await engines.critic.run({
      delta: baseDelta,
      contextBefore: "",
    });

    expect(reading.ok).toBe(true);
    expect(interrogation.ok).toBe(true);
    expect(critic.ok).toBe(true);

    const modesCalled = ai.runForMode.mock.calls.map(
      (call) => (call[0] as AiCallRequest).mode,
    );
    expect(modesCalled).toEqual(["reading", "interrogation", "critic"]);
  });
});
