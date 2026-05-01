import type {
  Adapter,
  AdapterAuthState,
  AdapterHandle,
  CommitDelta,
  UnsubscribeFn,
} from "@/adapters/types";
import { createTextStream } from "@/core/textStream";
import {
  sendGoogleAuthConnect,
  sendGoogleAuthStatus,
  sendGoogleDocsFetch,
} from "@/core/sendRequest";
import { extractDocId } from "@/core/googleDocsApi";

const POLL_INTERVAL_AUTHED_MS = 6_000;
const POLL_INTERVAL_UNAUTHED_MS = 4_000;
const CARET_POLL_INTERVAL_MS = 120;

function matchUrl(url: URL): boolean {
  return (
    url.host === "docs.google.com" && url.pathname.startsWith("/document/")
  );
}

function matchEditor(hostDocument: Document): boolean {
  return hostDocument.querySelector(".kix-appview-editor") !== null;
}

export const googleDocsAdapter: Adapter = {
  id: "google-docs",

  matchUrl,
  matchEditor,

  match(url, hostDocument) {
    return matchUrl(url) && matchEditor(hostDocument);
  },

  attach(): AdapterHandle {
    const textStream = createTextStream();
    let lastFullText = "";
    let lastCaretRect: DOMRect | null = null;
    let currentAuthState: AdapterAuthState = {
      kind: "needs-auth",
      reason: "no-token",
    };
    let lastRevisionId: string | undefined;

    const commitCallbacks = new Set<(delta: CommitDelta) => void>();
    const textChangeCallbacks = new Set<(text: string) => void>();
    const caretChangeCallbacks = new Set<(rect: DOMRect | null) => void>();
    const authStateCallbacks = new Set<(state: AdapterAuthState) => void>();

    const unsubscribeStream = textStream.onCommit((delta) => {
      for (const callback of commitCallbacks) callback(delta);
    });

    const docId = extractDocId(window.location.href);

    function setAuthState(next: AdapterAuthState): void {
      const sameKind =
        next.kind === currentAuthState.kind &&
        (next.kind !== "needs-auth" ||
          (currentAuthState.kind === "needs-auth" &&
            next.reason === currentAuthState.reason));
      if (sameKind) return;
      currentAuthState = next;
      for (const callback of authStateCallbacks) callback(next);
    }

    function applyText(nextText: string): void {
      if (nextText === lastFullText) return;
      lastFullText = nextText;
      textStream.update(nextText);
      for (const callback of textChangeCallbacks) callback(nextText);
    }

    function applyCaret(rect: DOMRect | null): void {
      const sameAsBefore =
        rect?.x === lastCaretRect?.x &&
        rect?.y === lastCaretRect?.y &&
        rect?.width === lastCaretRect?.width &&
        rect?.height === lastCaretRect?.height;
      if (sameAsBefore) return;
      lastCaretRect = rect;
      for (const callback of caretChangeCallbacks) callback(rect);
    }

    function pollCaret(): void {
      try {
        const cursor = document.querySelector<HTMLElement>(
          ".kix-cursor, .kix-cursor-caret",
        );
        if (!cursor) {
          applyCaret(null);
          return;
        }
        const bounding = cursor.getBoundingClientRect();
        const next = new DOMRect(
          bounding.left,
          bounding.top,
          Math.max(bounding.width, 1),
          Math.max(bounding.height, 14),
        );
        applyCaret(next);
      } catch {
        // ignore
      }
    }

    let pollTimer: number | null = null;
    let detached = false;

    async function fetchCycle(): Promise<void> {
      if (detached || !docId) return;
      const result = await sendGoogleDocsFetch(docId);
      if (detached) return;
      if (result.ok) {
        setAuthState({ kind: "ok" });
        if (result.revisionId !== lastRevisionId) {
          lastRevisionId = result.revisionId;
          applyText(result.fullText);
        } else if (result.fullText !== lastFullText) {
          applyText(result.fullText);
        }
      } else if (result.reason === "auth-required") {
        setAuthState({
          kind: "needs-auth",
          reason: "no-token",
          error: result.error,
        });
      } else if (result.reason === "not-configured") {
        setAuthState({
          kind: "not-configured",
          error: result.error,
        });
      }
    }

    function scheduleNextFetch(): void {
      if (detached) return;
      const delay =
        currentAuthState.kind === "ok"
          ? POLL_INTERVAL_AUTHED_MS
          : POLL_INTERVAL_UNAUTHED_MS;
      pollTimer = window.setTimeout(async () => {
        pollTimer = null;
        await fetchCycle();
        scheduleNextFetch();
      }, delay) as unknown as number;
    }

    if (!docId) {
      setAuthState({
        kind: "not-configured",
        error: "could not extract document ID from URL",
      });
    } else {
      void (async () => {
        const status = await sendGoogleAuthStatus();
        if (detached) return;
        if (status.connected) {
          await fetchCycle();
        } else if (
          status.reason === "not-configured" ||
          status.reason === "unsupported"
        ) {
          setAuthState({ kind: "not-configured", error: status.error });
        } else {
          setAuthState({
            kind: "needs-auth",
            reason: "no-token",
            error: status.error,
          });
        }
        scheduleNextFetch();
      })();
    }

    const caretInterval = window.setInterval(pollCaret, CARET_POLL_INTERVAL_MS);

    return {
      readText: () => lastFullText,
      onCommit(callback): UnsubscribeFn {
        commitCallbacks.add(callback);
        return () => commitCallbacks.delete(callback);
      },
      onTextChange(callback): UnsubscribeFn {
        textChangeCallbacks.add(callback);
        if (lastFullText.length > 0) callback(lastFullText);
        return () => textChangeCallbacks.delete(callback);
      },
      onCaretChange(callback): UnsubscribeFn {
        caretChangeCallbacks.add(callback);
        if (lastCaretRect) callback(lastCaretRect);
        return () => caretChangeCallbacks.delete(callback);
      },
      caretRect: () => lastCaretRect,
      authState: () => currentAuthState,
      onAuthStateChange(callback): UnsubscribeFn {
        authStateCallbacks.add(callback);
        callback(currentAuthState);
        return () => authStateCallbacks.delete(callback);
      },
      async requestAuth(interactive: boolean): Promise<AdapterAuthState> {
        const result = await sendGoogleAuthConnect(interactive);
        if (result.connected) {
          setAuthState({ kind: "ok" });
          await fetchCycle();
        } else if (
          result.reason === "not-configured" ||
          result.reason === "unsupported"
        ) {
          setAuthState({ kind: "not-configured", error: result.error });
        } else {
          setAuthState({
            kind: "needs-auth",
            reason: result.reason === "denied" ? "denied" : "no-token",
            error: result.error,
          });
        }
        return currentAuthState;
      },
      detach() {
        detached = true;
        if (pollTimer !== null) {
          window.clearTimeout(pollTimer);
          pollTimer = null;
        }
        window.clearInterval(caretInterval);
        unsubscribeStream();
        commitCallbacks.clear();
        textChangeCallbacks.clear();
        caretChangeCallbacks.clear();
        authStateCallbacks.clear();
        textStream.reset();
        lastFullText = "";
        lastCaretRect = null;
      },
    };
  },
};
