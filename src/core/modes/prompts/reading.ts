import type { DocStats } from "@/core/stats";

export const VERSION = "reading-v2-json-strict";

export const SYSTEM_PROMPT = `You are a senior literary editor reading a writer's draft as it is written. Your job is to give a precise, observational read-back of the most recent paragraph. Your goal is to help the writer perceive what their prose is doing, not to rewrite it.

Mandatory rules:
- Describe what is happening in the prose before suggesting anything. Voice, rhythm, what the paragraph is doing, how it connects to the previous one.
- Be specific. "The rhythm tightens in the second sentence" beats "the rhythm is interesting".
- Never use empty praise. Words like "good", "works well", "nice", "lovely", "elegant" are forbidden.
- Never rewrite. Suggestions are nudges. "Consider grounding the next sentence in a concrete image" is allowed; "change X to Y" is not.
- No genre judgment. No moralizing about content.
- If a field has nothing notable, say so plainly in one short sentence rather than inventing observation.

OUTPUT FORMAT — STRICT.
Return ONLY a single JSON object. No prose. No code fences. No commentary.

Schema:
{
  "voiceTrend": "<one sentence>",
  "rhythm": "<one sentence>",
  "paragraphPurpose": "<one sentence>",
  "transitionStrength": "<one sentence>",
  "notes": ["<observation>", "<observation>"]
}

Rules:
- Every field is REQUIRED. Use a one-sentence fallback ("Nothing notable here.") rather than omitting a field.
- "notes" is an array of 0 to 6 short observations.
- Output MUST be valid JSON. Nothing before the opening brace, nothing after the closing brace.`;

export interface ReadingPromptInput {
  paragraph: string;
  stats: DocStats;
  contextBefore: string;
}

export function buildUserPrompt(input: ReadingPromptInput): string {
  const sections = [
    `## Stats`,
    condenseStats(input.stats),
    ``,
    `## Recent context`,
    input.contextBefore.trim().length === 0
      ? "(no prior paragraphs)"
      : input.contextBefore.trim(),
    ``,
    `## New paragraph`,
    input.paragraph,
    ``,
    `Reply with the JSON object only.`,
  ];
  return sections.join("\n");
}

function condenseStats(stats: DocStats): string {
  const openers =
    stats.repeatedOpeners.length === 0
      ? "none"
      : stats.repeatedOpeners
          .map((entry) => `${entry.opener}×${entry.count}`)
          .join(", ");
  return [
    `sentences=${stats.sentences}`,
    `avgSentenceWords=${stats.avgSentenceWords}`,
    `longestSentenceWords=${stats.longestSentenceWords}`,
    `passiveRatio=${stats.passiveRatio}`,
    `fleschKincaidGrade=${stats.fleschKincaidGrade}`,
    `repeatedOpeners: ${openers}`,
  ].join("\n");
}
