const ABBREVIATIONS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "st",
  "jr",
  "sr",
  "mt",
  "fr",
  "rev",
  "hon",
  "gen",
  "col",
  "maj",
  "capt",
  "sgt",
  "lt",
  "prof",
  "gov",
  "pres",
  "sen",
  "rep",
  "vs",
  "etc",
  "eg",
  "ie",
  "cf",
  "al",
  "inc",
  "co",
  "corp",
  "ltd",
  "plc",
  "no",
  "vol",
  "pp",
  "jan",
  "feb",
  "mar",
  "apr",
  "jun",
  "jul",
  "aug",
  "sep",
  "sept",
  "oct",
  "nov",
  "dec",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
  "us",
  "usa",
  "uk",
  "eu",
  "un",
  "phd",
  "md",
  "ba",
  "bs",
  "ma",
  "msc",
  "llb",
  "jd",
  "am",
  "pm",
]);

const TERMINATOR_CHAR = /[.!?]/;
const CLOSING_PUNCTUATION = /["'’”\)\]\}]/;
const SENTENCE_OPENER = /[A-Z0-9"'‘“\(\[\{]/;
const LETTER = /[A-Za-z]/;
const WHITESPACE = /\s/;

export interface SentenceSpan {
  text: string;
  start: number;
  end: number;
}

export function splitSentences(input: string): SentenceSpan[] {
  if (!input) return [];

  const sentences: SentenceSpan[] = [];
  const totalLength = input.length;
  let cursor = 0;
  let sentenceStart = 0;

  while (cursor < totalLength) {
    const currentChar = input[cursor]!;

    if (TERMINATOR_CHAR.test(currentChar)) {
      let terminatorEnd = cursor + 1;
      while (
        terminatorEnd < totalLength &&
        TERMINATOR_CHAR.test(input[terminatorEnd]!)
      ) {
        terminatorEnd++;
      }
      while (
        terminatorEnd < totalLength &&
        CLOSING_PUNCTUATION.test(input[terminatorEnd]!)
      ) {
        terminatorEnd++;
      }

      if (isLikelyBoundary(input, cursor, terminatorEnd, sentenceStart)) {
        appendSentence(sentences, input, sentenceStart, terminatorEnd);
        let afterWhitespace = terminatorEnd;
        while (
          afterWhitespace < totalLength &&
          WHITESPACE.test(input[afterWhitespace]!)
        ) {
          afterWhitespace++;
        }
        sentenceStart = afterWhitespace;
        cursor = afterWhitespace;
        continue;
      }
      cursor = terminatorEnd;
      continue;
    }
    cursor++;
  }

  if (sentenceStart < totalLength) {
    appendSentence(sentences, input, sentenceStart, totalLength);
  }

  return sentences;
}

function appendSentence(
  sentences: SentenceSpan[],
  input: string,
  rawStart: number,
  rawEnd: number,
): void {
  const rawSlice = input.slice(rawStart, rawEnd);
  const trimmed = rawSlice.trim();
  if (trimmed.length === 0) return;
  const leadingSpaces = rawSlice.length - rawSlice.trimStart().length;
  const trailingSpaces = rawSlice.length - rawSlice.trimEnd().length;
  sentences.push({
    text: trimmed,
    start: rawStart + leadingSpaces,
    end: rawEnd - trailingSpaces,
  });
}

function isLikelyBoundary(
  input: string,
  terminatorStart: number,
  terminatorEnd: number,
  sentenceStart: number,
): boolean {
  if (terminatorEnd >= input.length) return true;

  let nextNonSpace = terminatorEnd;
  while (nextNonSpace < input.length && WHITESPACE.test(input[nextNonSpace]!)) {
    nextNonSpace++;
  }
  if (nextNonSpace >= input.length) return true;
  const nextChar = input[nextNonSpace]!;

  if (!SENTENCE_OPENER.test(nextChar)) return false;

  const isSinglePeriod =
    terminatorEnd - terminatorStart === 1 && input[terminatorStart] === ".";
  if (isSinglePeriod) {
    let wordStart = terminatorStart;
    while (wordStart > sentenceStart && LETTER.test(input[wordStart - 1]!)) {
      wordStart--;
    }
    const wordBeforePeriod = input
      .slice(wordStart, terminatorStart)
      .toLowerCase();
    if (wordBeforePeriod.length > 0 && ABBREVIATIONS.has(wordBeforePeriod))
      return false;
    if (wordBeforePeriod.length === 1 && LETTER.test(input[wordStart]!))
      return false;
  }

  return true;
}

export function splitParagraphs(input: string): string[] {
  if (!input) return [];
  return input
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}
