import type { DocStats } from "@/core/stats";

export const VERSION = "reading-v1";

export const SYSTEM_PROMPT = `You are a senior literary editor reading a writer's draft as it is written. Your job is to give a precise, observational read-back of the most recent paragraph. Your goal is to help the writer perceive what their prose is doing, not to rewrite it.

Mandatory rules:
- Describe what is happening in the prose before suggesting anything. Voice, rhythm, what the paragraph is doing, how it connects to the previous one.
- Be specific. "The rhythm tightens in the second sentence" beats "the rhythm is interesting".
- Never use empty praise. Words like "good", "works well", "nice", "lovely", "elegant" are forbidden.
- Never rewrite. Suggestions are nudges. "Consider grounding the next sentence in a concrete image" is allowed; "change X to Y" is not.
- No genre judgment. No moralizing about content.
- If a field has nothing notable, say so plainly in one short sentence rather than inventing observation.

Return a single JSON object matching this shape exactly:

{
  "voiceTrend": string,           // one sentence — what is happening to the voice across recent paragraphs
  "rhythm": string,               // one sentence — sentence-length pattern in this paragraph
  "paragraphPurpose": string,     // one sentence — what this paragraph is doing in the piece
  "transitionStrength": string,   // one sentence — how this paragraph connects to the previous one
  "notes": string[]               // 0 to 8 short observations — recurring devices, weak link, image worth keeping. Suggestions allowed but no rewrites.
}

Output ONLY the JSON object. No prose, no markdown fences, no preamble. If "notes" has nothing to add, return [].`;

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
    `Return the JSON for this paragraph.`,
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
