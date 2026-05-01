export type AdapterId = "google-docs" | "notion" | "prosemirror";

export interface Adapter {
  id: AdapterId;
  matchUrl: (url: URL) => boolean;
  matchEditor: (hostDocument: Document) => boolean;
  match: (url: URL, hostDocument: Document) => boolean;
  attach: (hostDocument: Document) => AdapterHandle;
}

export interface AnnotationRange {
  start: number;
  end: number;
}

export type AnnotationKind = "critic-issue";

export type AdapterAuthState =
  | { kind: "ok" }
  | { kind: "not-required" }
  | {
      kind: "needs-auth";
      reason: "no-token" | "denied" | "error";
      error?: string;
    }
  | { kind: "not-configured"; error?: string }
  | {
      kind: "doc-error";
      reason:
        | "permission-denied"
        | "not-found"
        | "rate-limited"
        | "office-file"
        | "screen-reader-off"
        | "error";
      status?: number;
      error?: string;
    };

export interface AdapterHandle {
  readText: () => string;
  onCommit: (callback: (delta: CommitDelta) => void) => UnsubscribeFn;
  onTextChange: (callback: (text: string) => void) => UnsubscribeFn;
  onCaretChange: (callback: (rect: DOMRect | null) => void) => UnsubscribeFn;
  caretRect: () => DOMRect | null;
  authState?: () => AdapterAuthState;
  onAuthStateChange?: (
    callback: (state: AdapterAuthState) => void,
  ) => UnsubscribeFn;
  requestAuth?: (interactive: boolean) => Promise<AdapterAuthState>;
  pushManualText?: (text: string) => void;
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
