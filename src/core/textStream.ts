import { splitParagraphs, splitSentences } from "@/lib/sentenceSplit";
import type {
  CommitDelta,
  CommitReason,
  UnsubscribeFn,
} from "@/adapters/types";

type CommitCallback = (delta: CommitDelta) => void;

export interface TextStream {
  update: (text: string) => void;
  signalParagraphBreak: () => void;
  flush: () => void;
  onCommit: (callback: CommitCallback) => UnsubscribeFn;
  reset: () => void;
}

export function createTextStream(): TextStream {
  const callbacks = new Set<CommitCallback>();
  let lastFullText = "";
  let lastCommittedSentenceIndex = -1;

  function emit(delta: CommitDelta): void {
    for (const callback of callbacks) callback(delta);
  }

  function commitThrough(targetIndex: number, reason: CommitReason): void {
    const sentences = splitSentences(lastFullText);
    const paragraphs = splitParagraphs(lastFullText);
    const cappedTarget = Math.min(targetIndex, sentences.length - 1);

    while (lastCommittedSentenceIndex < cappedTarget) {
      lastCommittedSentenceIndex += 1;
      const sentence = sentences[lastCommittedSentenceIndex];
      if (!sentence) continue;
      const paragraphIndex = locateParagraphIndex(paragraphs, sentence.text);
      const paragraphText =
        paragraphIndex >= 0 ? paragraphs[paragraphIndex]! : "";
      emit({
        reason,
        sentence: sentence.text,
        paragraph: paragraphText,
        fullText: lastFullText,
        sentenceIndex: lastCommittedSentenceIndex,
        paragraphIndex: paragraphIndex < 0 ? 0 : paragraphIndex,
      });
    }
  }

  return {
    update(text) {
      lastFullText = text;
      const sentences = splitSentences(text);
      if (sentences.length === 0) return;
      const newlyCompletedTarget = sentences.length - 2;
      if (newlyCompletedTarget > lastCommittedSentenceIndex) {
        commitThrough(newlyCompletedTarget, "sentence-completed");
      }
    },
    signalParagraphBreak() {
      const sentences = splitSentences(lastFullText);
      if (sentences.length === 0) return;
      commitThrough(sentences.length - 1, "paragraph-break");
    },
    flush() {
      const sentences = splitSentences(lastFullText);
      if (sentences.length === 0) return;
      commitThrough(sentences.length - 1, "flush");
    },
    onCommit(callback) {
      callbacks.add(callback);
      return () => callbacks.delete(callback);
    },
    reset() {
      lastFullText = "";
      lastCommittedSentenceIndex = -1;
    },
  };
}

function locateParagraphIndex(
  paragraphs: string[],
  sentenceText: string,
): number {
  for (
    let paragraphIndex = 0;
    paragraphIndex < paragraphs.length;
    paragraphIndex++
  ) {
    if (paragraphs[paragraphIndex]!.includes(sentenceText))
      return paragraphIndex;
  }
  return -1;
}
