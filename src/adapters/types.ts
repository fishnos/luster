export type AdapterId = "google-docs" | "notion" | "prosemirror";

export interface Adapter {
  id: AdapterId;
  match: (url: URL, hostDocument: Document) => boolean;
  attach: (hostDocument: Document) => AdapterHandle;
}

export interface AnnotationRange {
  start: number;
  end: number;
}

export type AnnotationKind = "critic-issue";

export interface AdapterHandle {
  readText: () => string;
  onCommit: (callback: (delta: CommitDelta) => void) => UnsubscribeFn;
  caretRect: () => DOMRect | null;
  annotate?: (
    range: AnnotationRange,
    kind: AnnotationKind,
    label: string,
  ) => AnnotationDisposer;
  detach: () => void;
}

export type UnsubscribeFn = () => void;
export type AnnotationDisposer = () => void;

export type CommitReason = "sentence-completed" | "paragraph-break" | "flush";

export interface CommitDelta {
  reason: CommitReason;
  sentence: string;
  paragraph: string;
  fullText: string;
  sentenceIndex: number;
  paragraphIndex: number;
}
