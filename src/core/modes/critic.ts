import { z } from "zod";
import type { AiClient } from "@/core/aiClient";
import type { CommitDelta } from "@/adapters/types";
import type {
  CriticIssue,
  CriticOutput,
  ProviderId,
  TokenUsage,
} from "@/core/types";
import { safeParse } from "@/core/modes/parse";
import {
  SYSTEM_PROMPT,
  VERSION,
  buildUserPrompt,
} from "@/core/modes/prompts/critic";

const CriticIssueSchema = z
  .object({
    severity: z.enum(["structural", "clarity", "rhythm", "nit"]),
    span: z.object({
      start: z.number().int().min(0),
      end: z.number().int().min(0),
    }),
    label: z.string().min(1).max(120),
    suggestion: z.string().min(1).max(240).optional(),
  })
  .refine((issue) => issue.span.end > issue.span.start, {
    message: "span.end must be greater than span.start",
    path: ["span"],
  });

const CriticOutputSchema = z.object({
  issues: z.array(CriticIssueSchema).max(8).default([]),
});

export interface CriticEngineInput {
  delta: CommitDelta;
  contextBefore: string;
}

export type CriticEngineFailureReason =
  | "no-key"
  | "rate-limited"
  | "provider-error"
  | "parse-error";

export type CriticEngineResult =
  | {
      ok: true;
      output: CriticOutput;
      droppedIssueCount: number;
      tokens: TokenUsage;
      provider: ProviderId;
      model: string;
      promptVersion: string;
    }
  | {
      ok: false;
      reason: CriticEngineFailureReason;
      provider?: ProviderId;
      retryAfterMs?: number;
      error?: string;
    };

export interface CriticEngineDeps {
  aiClient: AiClient;
}

export interface CriticEngine {
  run: (input: CriticEngineInput) => Promise<CriticEngineResult>;
}

export function createCriticEngine(deps: CriticEngineDeps): CriticEngine {
  return {
    async run(input) {
      const aiResponse = await deps.aiClient.runForMode({
        mode: "critic",
        systemPrompt: SYSTEM_PROMPT,
        cacheableSystem: true,
        userPrompt: buildUserPrompt({
          sentence: input.delta.sentence,
          paragraph: input.delta.paragraph,
          contextBefore: input.contextBefore,
        }),
        expectJson: true,
        maxTokens: 2048,
        temperature: 0.2,
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

      const parsed = safeParse(CriticOutputSchema, aiResponse.text);
      if (!parsed.ok) {
        return {
          ok: false,
          reason: "parse-error",
          provider: aiResponse.provider,
          error: parsed.error,
        };
      }

      const sentenceLength = input.delta.sentence.length;
      const validIssues: CriticIssue[] = [];
      let droppedIssueCount = 0;
      for (const issue of parsed.data.issues) {
        const inBounds =
          issue.span.start >= 0 &&
          issue.span.end <= sentenceLength &&
          issue.span.end > issue.span.start;
        if (inBounds) {
          validIssues.push(issue);
        } else {
          droppedIssueCount += 1;
        }
      }

      return {
        ok: true,
        output: { issues: validIssues },
        droppedIssueCount,
        tokens: aiResponse.tokens,
        provider: aiResponse.provider,
        model: aiResponse.model,
        promptVersion: VERSION,
      };
    },
  };
}
