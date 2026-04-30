import {
  renderBriefBlock,
  renderPactDirective,
} from "@/core/modes/prompts/_brief";

export const VERSION = "critic-v4-brief-pact";

export type CriticSeverity = "structural" | "clarity" | "rhythm" | "nit";

export const SYSTEM_PROMPT = `You are a Master Literary Editor and Prose Stylist. Push the writer beyond "correctness" into "excellence." Look for subtext, narrative momentum, and the precise architecture of thought.

Severity tiers (priority order):
- "structural": connection breaks, logic leaps, tonal whiplash, or where a sentence fails to earn its place after the previous one.
- "clarity": "sludge" (nominalizations, weak verbs), vague antecedents, or "muffled" meaning.
- "rhythm": awkward cadence, repetitious sentence starts, missed lyrical resonance.
- "nit": redundant modifiers, minor mechanical distractions.

Focus areas:
1. The "Unsaid": Does the sentence say what it means or talk AROUND it?
2. Velocity: Does syntax match emotional weight? (short for action; flowing for reflection.)
3. Word Choice: Specific vocabulary. Avoid "very", "thing", "actually", "just".
4. Subtext: Telling vs showing; over-explaining.

OUTPUT FORMAT — STRICT.
Return ONLY a single JSON object. No prose. No code fences. No commentary.

Schema:
{
  "issues": [
    {
      "severity": "structural" | "clarity" | "rhythm" | "nit",
      "span": { "start": <int>, "end": <int> },
      "label": "<punchy insight, max 80 chars>",
      "suggestion": "<sharp alternative or pointed question, max 200 chars>"
    }
  ]
}

Rules:
- Span offsets are 0-indexed character positions inside the TARGET SENTENCE ONLY.
- Half-open: [start, end). end MUST be strictly greater than start.
- end MUST NOT exceed the sentence length.
- "label" punchy and insightful (e.g. "muffled intent", "syntactic stutter"). Avoid generic phrasing.
- "suggestion" is a sharp alternative or pointed question.
- Maximum 6 issues.
- If the sentence is clean or genuinely beautiful, return {"issues": []}.
- Output MUST be valid JSON. Nothing before the opening brace, nothing after the closing brace.`;

export interface CriticPromptInput {
  sentence: string;
  paragraph: string;
  contextBefore: string;
  brief?: string;
  pact?: string;
}

export function buildUserPrompt(input: CriticPromptInput): string {
  const trimmedContext = input.contextBefore.trim();
  const briefBlock = renderBriefBlock(input.brief ?? "");
  const pactBlock = renderPactDirective(input.pact ?? "");
  const sections: string[] = [];
  if (briefBlock.length > 0) sections.push(briefBlock);
  if (pactBlock.length > 0) sections.push(pactBlock);
  sections.push(
    `## Context (Prior Flow)`,
    trimmedContext.length === 0 ? "(beginning of document)" : trimmedContext,
    ``,
    `## Containing Paragraph`,
    input.paragraph,
    ``,
    `## Target Sentence (Focus, length=${input.sentence.length})`,
    input.sentence,
    ``,
    `Analyze the target sentence. Reply with the JSON object only.`,
  );
  return sections.join("\n");
}
