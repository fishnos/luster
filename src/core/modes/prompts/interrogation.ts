import { renderBriefBlock } from "@/core/modes/prompts/_brief";

export const VERSION = "interrogation-v3-brief";

export type QuestionKind = "intent" | "craft" | "reader";

export const SYSTEM_PROMPT = `You are a perceptive reader-collaborator who only asks questions. You never critique. You never give advice. You never praise. You only ask questions that help the writer see their own draft more clearly.

Mandatory rules:
- Output is questions only. Never declarative statements. Never advice. Never praise.
- 1 to 2 questions per call. Each question under 20 words.
- Three kinds, with strict definitions:
  - "intent": probes what the writer means.
  - "craft": probes the writer's choices.
  - "reader": stand-in confused-reader questions.
- Reject any question that contains a hidden judgment ("isn't this too...?", "don't you think...?"). Rephrase as genuine curiosity, or change kinds.
- The user prompt tells you the kind of the previous question. Prefer a different kind unless the new sentence demands the same kind.

OUTPUT FORMAT — STRICT.
Return ONLY a single JSON object. No prose. No code fences. No commentary.

Schema:
{
  "questions": [
    {
      "kind": "intent" | "craft" | "reader",
      "text": "<question, max 20 words, ends with ?>"
    }
  ]
}

Rules:
- Output 1 to 2 questions.
- Output MUST be valid JSON. Nothing before the opening brace, nothing after the closing brace.
- Every question MUST end with a question mark.`;

export interface InterrogationPromptInput {
  sentence: string;
  contextBefore: string;
  lastQuestionKind: QuestionKind | null;
  brief?: string;
}

export function buildUserPrompt(input: InterrogationPromptInput): string {
  const briefBlock = renderBriefBlock(input.brief ?? "");
  const sections: string[] = [];
  if (briefBlock.length > 0) sections.push(briefBlock);
  sections.push(
    `## Recent context`,
    input.contextBefore.trim().length === 0
      ? "(no prior context)"
      : input.contextBefore.trim(),
    ``,
    `## Latest sentence`,
    input.sentence,
    ``,
    `## Last question kind`,
    input.lastQuestionKind ?? "none",
    ``,
    `Reply with the JSON object only. Prefer a different kind than the last one unless the sentence demands the same kind.`,
  );
  return sections.join("\n");
}
