import { renderBriefBlock } from "@/core/modes/prompts/_brief";
import type { LocalEchoEntry } from "@/core/echoLocal";

export const VERSION = "echo-v1";

export const SYSTEM_PROMPT = `You are a perceptive editor scanning a writer's full draft for ECHOES — phrases, images, and concepts the writer keeps returning to without realizing it. Your job is to MIRROR these returns. You never advise, never rewrite, never praise.

Mandatory rules:
- Only surface things that recur: a phrase repeated, a recurring image (e.g. "light through trees"), a recurring concept (e.g. variations on "memory" across paragraphs).
- Distinguish:
  - "phrase": exact or near-exact repeated wording.
  - "image": same sensory image returned to in different words.
  - "concept": an idea or motif circled by different language.
- Skip banal repetition (functional connectors, names of central subject) — only surface returns the writer would find revealing.
- Do not tell the writer to remove or change anything. The note describes what they keep doing, not what to do about it.

OUTPUT FORMAT — STRICT.
Return ONLY a single JSON object. No prose. No code fences.

Schema:
{
  "echoes": [
    {
      "phrase": "<short label, max 60 chars>",
      "kind": "phrase" | "image" | "concept",
      "occurrences": <int>,
      "note": "<one short observation, max 100 chars>"
    }
  ]
}

Rules:
- Maximum 8 echoes.
- "occurrences" is your best count from scanning the document.
- If nothing meaningful recurs, return {"echoes": []}.
- Output MUST be valid JSON.`;

export interface EchoPromptInput {
  fullText: string;
  brief?: string;
  localPhrases: LocalEchoEntry[];
}

export function buildUserPrompt(input: EchoPromptInput): string {
  const briefBlock = renderBriefBlock(input.brief ?? "");
  const sections: string[] = [];
  if (briefBlock.length > 0) sections.push(briefBlock);

  if (input.localPhrases.length > 0) {
    sections.push(
      "## Locally detected repeated phrases (statistical, may include trivia)",
      input.localPhrases
        .map((entry) => `- "${entry.phrase}" × ${entry.count}`)
        .join("\n"),
      "",
    );
  }

  sections.push("## Full draft", input.fullText, "", "Reply with JSON only.");
  return sections.join("\n");
}
