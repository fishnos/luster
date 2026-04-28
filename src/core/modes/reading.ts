import { z } from "zod";
import type { AiClient } from "@/core/aiClient";
import type { CommitDelta } from "@/adapters/types";
import type { DocStats } from "@/core/stats";
import type { ProviderId, ReadingOutput, TokenUsage } from "@/core/types";
import { safeParse } from "@/core/modes/parse";
import {
  SYSTEM_PROMPT,
  VERSION,
  buildUserPrompt,
} from "@/core/modes/prompts/reading";

const ReadingOutputSchema = z.object({
  voiceTrend: z.string().min(1),
  rhythm: z.string().min(1),
  paragraphPurpose: z.string().min(1),
  transitionStrength: z.string().min(1),
  notes: z.array(z.string().min(1)).max(8).default([]),
});

export interface ReadingEngineInput {
  delta: CommitDelta;
  stats: DocStats;
  contextBefore: string;
}

export type ReadingEngineFailureReason =
  | "no-key"
  | "rate-limited"
  | "provider-error"
  | "parse-error";

export type ReadingEngineResult =
  | {
      ok: true;
      output: ReadingOutput;
      tokens: TokenUsage;
      provider: ProviderId;
      model: string;
      promptVersion: string;
    }
  | {
      ok: false;
      reason: ReadingEngineFailureReason;
      provider?: ProviderId;
      retryAfterMs?: number;
      error?: string;
    };

export interface ReadingEngineDeps {
  aiClient: AiClient;
}

export interface ReadingEngine {
  run: (input: ReadingEngineInput) => Promise<ReadingEngineResult>;
}

export function createReadingEngine(deps: ReadingEngineDeps): ReadingEngine {
  return {
    async run(input) {
      const aiResponse = await deps.aiClient.runForMode({
        mode: "reading",
        systemPrompt: SYSTEM_PROMPT,
        cacheableSystem: true,
        userPrompt: buildUserPrompt({
          paragraph: input.delta.paragraph,
          stats: input.stats,
          contextBefore: input.contextBefore,
        }),
        expectJson: true,
        maxTokens: 2048,
        temperature: 0.3,
      });

      if (!aiResponse.ok) {
        return {
          ok: false,
          reason: aiResponse.reason,
          provider: aiResponse.provider,
          retryAfterMs: aiResponse.retryAfterMs,
          error: aiResponse.error,
        };
      }

      const parsed = safeParse(ReadingOutputSchema, aiResponse.text);
      if (!parsed.ok) {
        return {
          ok: false,
          reason: "parse-error",
          provider: aiResponse.provider,
          error: parsed.error,
        };
      }

      return {
        ok: true,
        output: parsed.data,
        tokens: aiResponse.tokens,
        provider: aiResponse.provider,
        model: aiResponse.model,
        promptVersion: VERSION,
      };
    },
  };
}
