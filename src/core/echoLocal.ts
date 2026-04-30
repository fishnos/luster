const STOP_WORDS = new Set(
  "a an the and or but if while of at by for with about against between into through during before after above below to from up down in out on off over under again further then once here there when where why how all any both each few more most other some such no nor not only own same so than too very can will just don should now is are was were be been being have has had having do does did doing as that this these those it its he she his her them they we i you me my your our".split(
    /\s+/,
  ),
);

const MIN_PHRASE_LENGTH = 3;
const MAX_PHRASE_LENGTH = 5;
const MIN_OCCURRENCES = 3;
const MAX_RESULTS = 12;

export interface LocalEchoEntry {
  phrase: string;
  count: number;
}

export function findRepeatedPhrases(documentText: string): LocalEchoEntry[] {
  const tokens = tokenize(documentText);
  if (tokens.length < MIN_PHRASE_LENGTH) return [];

  const phraseCounts = new Map<string, number>();
  for (
    let phraseLength = MIN_PHRASE_LENGTH;
    phraseLength <= MAX_PHRASE_LENGTH;
    phraseLength++
  ) {
    for (let start = 0; start + phraseLength <= tokens.length; start++) {
      const window = tokens.slice(start, start + phraseLength);
      if (window.every((token) => STOP_WORDS.has(token))) continue;
      if (window.every((token) => token.length < 4)) continue;
      const phrase = window.join(" ");
      phraseCounts.set(phrase, (phraseCounts.get(phrase) ?? 0) + 1);
    }
  }

  const entries = [...phraseCounts.entries()]
    .filter(([, count]) => count >= MIN_OCCURRENCES)
    .map(([phrase, count]) => ({ phrase, count }));

  const deduped = collapseSubsumedPhrases(entries);

  return deduped
    .sort((left, right) => {
      const lengthDifference =
        right.phrase.split(" ").length - left.phrase.split(" ").length;
      if (lengthDifference !== 0) return lengthDifference;
      return right.count - left.count;
    })
    .slice(0, MAX_RESULTS);
}

function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z][a-z'’-]*/g);
  return matches ?? [];
}

function collapseSubsumedPhrases(entries: LocalEchoEntry[]): LocalEchoEntry[] {
  const sorted = [...entries].sort(
    (left, right) =>
      right.phrase.split(" ").length - left.phrase.split(" ").length,
  );
  const kept: LocalEchoEntry[] = [];
  for (const candidate of sorted) {
    const subsumedByLonger = kept.some(
      (longer) =>
        longer.phrase.includes(candidate.phrase) &&
        longer.count >= candidate.count - 1,
    );
    if (!subsumedByLonger) kept.push(candidate);
  }
  return kept;
}
