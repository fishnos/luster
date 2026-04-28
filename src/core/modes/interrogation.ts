import { z } from "zod";
import type { AiClient } from "@/core/aiClient";
import type { CommitDelta } from "@/adapters/types";
import type { InterrogationOutput, ProviderId, TokenUsage } from "@/core/types";
import { safeParse } from "@/core/modes/parse";
import {
  SYSTEM_PROMPT,
  VERSION,
  buildUserPrompt,
  type QuestionKind,
} from "@/core/modes/prompts/interrogation";

const InterrogationOutputSchema = z.object({
  questions: z
    .array(
      z.object({
        kind: z.enum(["intent", "craft", "reader"]),
        text: z.string().min(1),
      }),
    )
    .min(1)
    .max(2),
});

export interface InterrogationEngineInput {
  delta: CommitDelta;
  contextBefore: string;
  lastQuestionKind: QuestionKind | null;
}

export type InterrogationEngineFailureReason =
  | "no-key"
  | "rate-limited"
  | "provider-error"
  | "parse-error";

export type InterrogationEngineResult =
  | {
      ok: true;
      output: InterrogationOutput;
      tokens: TokenUsage;
      provider: ProviderId;
      model: string;
      promptVersion: string;
    }
  | {
      ok: false;
      reason: InterrogationEngineFailureReason;
      provider?: ProviderId;
      retryAfterMs?: number;
      error?: string;
    };

export interface InterrogationEngineDeps {
  aiClient: AiClient;
}

export interface InterrogationEngine {
  run: (input: InterrogationEngineInput) => Promise<InterrogationEngineResult>;
}

export function createInterrogationEngine(
  deps: InterrogationEngineDeps,
): InterrogationEngine {
  return {
    async run(input) {
      const aiResponse = await deps.aiClient.runForMode({
        mode: "interrogation",
        systemPrompt: SYSTEM_PROMPT,
        cacheableSystem: true,
        userPrompt: buildUserPrompt({
          sentence: input.delta.sentence,
          contextBefore: input.contextBefore,
          lastQuestionKind: input.lastQuestionKind,
        }),
        expectJson: true,
        maxTokens: 512,
        temperature: 0.6,
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

      const parsed = safeParse(InterrogationOutputSchema, aiResponse.text);
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
