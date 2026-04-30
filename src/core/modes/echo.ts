import { z } from "zod";
import type { AiClient } from "@/core/aiClient";
import type { EchoOutput, ProviderId, TokenUsage } from "@/core/types";
import { findRepeatedPhrases } from "@/core/echoLocal";
import { safeParse } from "@/core/modes/parse";
import {
  SYSTEM_PROMPT,
  VERSION,
  buildUserPrompt,
} from "@/core/modes/prompts/echo";

const EchoEntrySchema = z.object({
  phrase: z.string().min(1).max(120),
  kind: z.enum(["phrase", "image", "concept"]),
  occurrences: z.coerce.number().int().min(2),
  note: z.string().min(1).max(160),
});

const EchoOutputSchema = z.object({
  echoes: z.array(EchoEntrySchema).max(8).default([]),
});

export interface EchoEngineInput {
  fullText: string;
  brief?: string;
}

export type EchoEngineFailureReason =
  | "no-key"
  | "rate-limited"
  | "provider-error"
  | "parse-error";

export type EchoEngineResult =
  | {
      ok: true;
      output: EchoOutput;
      tokens: TokenUsage;
      provider: ProviderId;
      model: string;
      promptVersion: string;
    }
  | {
      ok: false;
      reason: EchoEngineFailureReason;
      provider?: ProviderId;
      retryAfterMs?: number;
      error?: string;
    };

export interface EchoEngineDeps {
  aiClient: AiClient;
}

export interface EchoEngine {
  run: (input: EchoEngineInput) => Promise<EchoEngineResult>;
}

export function createEchoEngine(deps: EchoEngineDeps): EchoEngine {
  return {
    async run(input) {
      const localPhrases = findRepeatedPhrases(input.fullText);

      const aiResponse = await deps.aiClient.runForMode({
        mode: "echo",
        systemPrompt: SYSTEM_PROMPT,
        cacheableSystem: true,
        userPrompt: buildUserPrompt({
          fullText: input.fullText,
          brief: input.brief,
          localPhrases,
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

      const parsed = safeParse(EchoOutputSchema, aiResponse.text);
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
        output: {
          echoes: parsed.data.echoes,
          localPhrases,
        },
        tokens: aiResponse.tokens,
        provider: aiResponse.provider,
        model: aiResponse.model,
        promptVersion: VERSION,
      };
    },
  };
}
