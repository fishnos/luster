import {
  splitParagraphs,
  splitSentences,
  type SentenceSpan,
} from "@/lib/sentenceSplit";

export interface DocStats {
  words: number;
  sentences: number;
  paragraphs: number;
  characters: number;
  avgSentenceWords: number;
  longestSentenceWords: number;
  fleschKincaidGrade: number;
  passiveRatio: number;
  repeatedOpeners: { opener: string; count: number }[];
  topWords: { word: string; count: number }[];
}

const STOP_WORDS = new Set(
  "a an the and or but if while of at by for with about against between into through during before after above below to from up down in out on off over under again further then once here there when where why how all any both each few more most other some such no nor not only own same so than too very can will just don should now is are was were be been being have has had having do does did doing as that this these those it its he she his her them they we i you me my your our".split(
    /\s+/,
  ),
);

const PASSIVE_AUXILIARY =
  /\b(?:am|is|are|was|were|be|been|being|get|got|gets|getting)\b/i;
const PAST_PARTICIPLE = /\b\w+(?:ed|en|own|orn|ought|aught|aid|ept|elt)\b/i;

const EMPTY_STATS: DocStats = {
  words: 0,
  sentences: 0,
  paragraphs: 0,
  characters: 0,
  avgSentenceWords: 0,
  longestSentenceWords: 0,
  fleschKincaidGrade: 0,
  passiveRatio: 0,
  repeatedOpeners: [],
  topWords: [],
};

export function computeStats(text: string): DocStats {
  const trimmed = text.trim();
  if (!trimmed) return { ...EMPTY_STATS };

  const paragraphs = splitParagraphs(trimmed);
  const sentences = splitSentences(trimmed);
  const allWords = extractWords(trimmed);
  const wordCount = allWords.length;

  const sentenceWordCounts = sentences.map(
    (sentence) => extractWords(sentence.text).length,
  );
  const longestSentenceWords = sentenceWordCounts.reduce(
    (longest, count) => (count > longest ? count : longest),
    0,
  );
  const avgSentenceWords = sentences.length ? wordCount / sentences.length : 0;

  const totalSyllables = allWords.reduce(
    (running, word) => running + countSyllables(word),
    0,
  );
  const fleschKincaidGrade =
    sentences.length && wordCount
      ? 0.39 * (wordCount / sentences.length) +
        11.8 * (totalSyllables / wordCount) -
        15.59
      : 0;

  const passiveCount = sentences.reduce(
    (running, sentence) => (isLikelyPassive(sentence) ? running + 1 : running),
    0,
  );
  const passiveRatio = sentences.length ? passiveCount / sentences.length : 0;

  return {
    words: wordCount,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    characters: trimmed.length,
    avgSentenceWords: roundTwo(avgSentenceWords),
    longestSentenceWords,
    fleschKincaidGrade: roundTwo(fleschKincaidGrade),
    passiveRatio: roundTwo(passiveRatio),
    repeatedOpeners: findRepeatedOpeners(sentences),
    topWords: findTopWords(allWords, 8),
  };
}

function extractWords(input: string): string[] {
  const matches = input.toLowerCase().match(/[a-z][a-z'’-]*/g);
  return matches ?? [];
}

function countSyllables(word: string): number {
  if (!word) return 0;
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 0;
  if (cleaned.length <= 3) return 1;
  const stripped = cleaned
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "");
  const vowelGroups = stripped.match(/[aeiouy]+/g);
  return Math.max(1, vowelGroups ? vowelGroups.length : 1);
}

function isLikelyPassive(sentence: SentenceSpan): boolean {
  const sentenceText = sentence.text;
  if (!PASSIVE_AUXILIARY.test(sentenceText)) return false;
  const auxiliaryMatch = sentenceText.match(PASSIVE_AUXILIARY);
  if (!auxiliaryMatch || auxiliaryMatch.index === undefined) return false;
  const tailStart = auxiliaryMatch.index + auxiliaryMatch[0].length;
  const tailWindow = sentenceText.slice(tailStart, tailStart + 60);
  return PAST_PARTICIPLE.test(tailWindow);
}

function findRepeatedOpeners(
  sentences: SentenceSpan[],
): { opener: string; count: number }[] {
  const openerCounts = new Map<string, number>();
  for (const sentence of sentences) {
    const firstWordMatch = sentence.text.match(/[A-Za-z'’]+/);
    if (!firstWordMatch) continue;
    const opener = firstWordMatch[0].toLowerCase();
    openerCounts.set(opener, (openerCounts.get(opener) ?? 0) + 1);
  }
  return [...openerCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([opener, count]) => ({ opener, count }));
}

function findTopWords(
  words: string[],
  limit: number,
): { word: string; count: number }[] {
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    if (STOP_WORDS.has(word)) continue;
    if (word.length < 3) continue;
    wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
  }
  return [...wordCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
