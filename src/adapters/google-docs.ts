import type {
  Adapter,
  AdapterAuthState,
  AdapterHandle,
  CommitDelta,
  UnsubscribeFn,
} from "@/adapters/types";
import { createTextStream } from "@/core/textStream";
import {
  BRIDGE_NAMESPACE,
  isBridgeMessage,
  type BridgeMessage,
  type BridgeState,
} from "@/runtime/kixBridgeProtocol";
import { createKeyVault, type GoogleDocsMode } from "@/core/keyVault";
import { createBrowserLocalStorage } from "@/core/storageBackend";
import { extractDocId } from "@/core/googleDocsApi";
import {
  sendGoogleAuthConnect,
  sendGoogleAuthStatus,
  sendGoogleDocsFetch,
} from "@/core/sendRequest";

const API_POLL_INTERVAL_AUTHED_MS = 6_000;
const API_POLL_INTERVAL_UNAUTHED_MS = 4_000;

const bridgeStateListeners = new Set<(state: BridgeState) => void>();
let lastBridgeState: BridgeState = "searching";

interface BufferedTextMessage {
  fullText: string;
  paragraphs: string[];
  glyphCount: number;
  generation: number;
}

let bufferedText: BufferedTextMessage | null = null;
let bufferedCaret: {
  rect: { x: number; y: number; width: number; height: number } | null;
  docIndex: number | null;
} | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("message", (event: MessageEvent) => {
    if (!isBridgeMessage(event.data)) return;
    if (event.data.channel !== BRIDGE_NAMESPACE) return;
    if (event.data.type === "state") {
      lastBridgeState = event.data.state;
      for (const listener of bridgeStateListeners) listener(event.data.state);
    } else if (event.data.type === "text") {
      bufferedText = {
        fullText: event.data.fullText,
        paragraphs: event.data.paragraphs,
        glyphCount: event.data.glyphCount,
        generation: event.data.generation,
      };
    } else if (event.data.type === "caret") {
      bufferedCaret = {
        rect: event.data.rect,
        docIndex: event.data.docIndex,
      };
    }
  });
}

export function getLastBridgeState(): BridgeState {
  return lastBridgeState;
}

export function onBridgeState(
  callback: (state: BridgeState) => void,
): () => void {
  bridgeStateListeners.add(callback);
  callback(lastBridgeState);
  return () => bridgeStateListeners.delete(callback);
}

export interface BridgeProbeCanvas {
  width: number;
  height: number;
  classChain: string;
  ancestorClasses: string;
  fillTextHits: number;
  isEditor: boolean;
}

export interface BridgeProbe {
  installed: boolean;
  fillTextCalls: number;
  strokeTextCalls: number;
  clearRectCalls: number;
  trackedEditorCanvases: number;
  totalCanvases: number;
  totalGlyphs: number;
  lastReconstructedTextLength: number;
  lastReconstructedParagraphCount: number;
  lastReconstructedSample: string;
  bridgeState: BridgeState;
  hasKixApp: boolean;
  caretSelectorPresent: boolean;
  candidateCanvases: BridgeProbeCanvas[];
}

export async function probeBridge(
  timeoutMs = 250,
): Promise<BridgeProbe | null> {
  if (typeof window === "undefined") return null;
  const requestId = `probe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new Promise<BridgeProbe | null>((resolve) => {
    let settled = false;
    function listener(event: MessageEvent): void {
      if (!isBridgeMessage(event.data)) return;
      const data = event.data;
      if (data.channel !== BRIDGE_NAMESPACE) return;
      if (data.type !== "probe-response") return;
      if (data.requestId !== requestId) return;
      window.removeEventListener("message", listener);
      settled = true;
      resolve({
        installed: data.installed,
        fillTextCalls: data.fillTextCalls,
        strokeTextCalls: data.strokeTextCalls,
        clearRectCalls: data.clearRectCalls,
        trackedEditorCanvases: data.trackedEditorCanvases,
        totalCanvases: data.totalCanvases,
        totalGlyphs: data.totalGlyphs,
        lastReconstructedTextLength: data.lastReconstructedTextLength,
        lastReconstructedParagraphCount: data.lastReconstructedParagraphCount,
        lastReconstructedSample: data.lastReconstructedSample,
        bridgeState: data.bridgeState,
        hasKixApp: data.hasKixApp,
        caretSelectorPresent: data.caretSelectorPresent,
        candidateCanvases: data.candidateCanvases ?? [],
      });
    }
    window.addEventListener("message", listener);
    window.postMessage(
      {
        channel: BRIDGE_NAMESPACE,
        type: "probe-request",
        requestId,
      },
      "*",
    );
    window.setTimeout(() => {
      if (settled) return;
      window.removeEventListener("message", listener);
      resolve(null);
    }, timeoutMs);
  });
}

const HOST_CANVAS_SELECTOR = ".kix-rotatingtilemanager-content";

function matchUrl(url: URL): boolean {
  return (
    url.host === "docs.google.com" && url.pathname.startsWith("/document/")
  );
}

function matchEditor(hostDocument: Document): boolean {
  return hostDocument.querySelector(HOST_CANVAS_SELECTOR) !== null;
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
    let bridgeState: BridgeState = "searching";
    let resolvedMode: GoogleDocsMode | "pending" = "pending";
    let currentAuthState: AdapterAuthState = { kind: "not-required" };
    let detached = false;
    let apiPollTimer: number | null = null;

    const commitCallbacks = new Set<(delta: CommitDelta) => void>();
    const textChangeCallbacks = new Set<(text: string) => void>();
    const caretChangeCallbacks = new Set<(rect: DOMRect | null) => void>();
    const authStateCallbacks = new Set<(state: AdapterAuthState) => void>();

    const unsubscribeStream = textStream.onCommit((delta) => {
      for (const callback of commitCallbacks) callback(delta);
    });

    function setAuthState(next: AdapterAuthState): void {
      const same =
        next.kind === currentAuthState.kind &&
        ((next.kind !== "needs-auth" && next.kind !== "doc-error") ||
          (next.kind === "needs-auth" &&
            currentAuthState.kind === "needs-auth" &&
            next.reason === currentAuthState.reason) ||
          (next.kind === "doc-error" &&
            currentAuthState.kind === "doc-error" &&
            next.reason === currentAuthState.reason));
      if (same) return;
      currentAuthState = next;
      for (const callback of authStateCallbacks) callback(next);
    }

    function applyText(nextText: string): void {
      if (nextText === lastFullText) return;
      lastFullText = nextText;
      textStream.update(nextText);
      for (const callback of textChangeCallbacks) callback(nextText);
    }

    function handleBridgeMessage(message: BridgeMessage): void {
      if (resolvedMode === "api") return;
      if (message.type === "text") {
        applyText(message.fullText);
      } else if (message.type === "caret") {
        const rect = message.rect ? toDomRect(message.rect) : null;
        if (
          rect?.x === lastCaretRect?.x &&
          rect?.y === lastCaretRect?.y &&
          rect?.width === lastCaretRect?.width &&
          rect?.height === lastCaretRect?.height
        ) {
          return;
        }
        lastCaretRect = rect;
        for (const callback of caretChangeCallbacks) callback(rect);
      } else if (message.type === "state") {
        bridgeState = message.state;
      }
    }

    function onWindowMessage(event: MessageEvent): void {
      if (!isBridgeMessage(event.data)) return;
      if (event.data.channel !== BRIDGE_NAMESPACE) return;
      handleBridgeMessage(event.data);
    }

    window.addEventListener("message", onWindowMessage);

    if (bufferedText) {
      handleBridgeMessage({
        channel: BRIDGE_NAMESPACE,
        type: "text",
        fullText: bufferedText.fullText,
        paragraphs: bufferedText.paragraphs,
        glyphCount: bufferedText.glyphCount,
        generation: bufferedText.generation,
      });
    }
    if (bufferedCaret) {
      handleBridgeMessage({
        channel: BRIDGE_NAMESPACE,
        type: "caret",
        rect: bufferedCaret.rect,
        docIndex: bufferedCaret.docIndex,
      });
    }

    try {
      window.postMessage(
        {
          channel: BRIDGE_NAMESPACE,
          type: "probe-request",
          requestId: `attach-${Date.now()}`,
        },
        "*",
      );
    } catch {
      // ignore
    }

    const settingsKeyVault = createKeyVault(createBrowserLocalStorage());

    void (async () => {
      const mode = await settingsKeyVault.getGoogleDocsMode();
      if (detached) return;
      resolvedMode = mode;
      if (mode === "api") {
        console.info("[Luster] Google Docs adapter starting in API mode");
        await initApiMode();
      } else {
        console.info("[Luster] Google Docs adapter starting in bridge mode");
      }
    })();

    async function initApiMode(): Promise<void> {
      const docId = extractDocId(window.location.href);
      if (!docId) {
        setAuthState({
          kind: "not-configured",
          error: "could not extract document ID from URL",
        });
        return;
      }
      const status = await sendGoogleAuthStatus();
      if (detached) return;
      if (status.connected) {
        await fetchCycleApi(docId);
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
      scheduleNextFetchApi(docId);
    }

    async function fetchCycleApi(docId: string): Promise<void> {
      if (detached) return;
      const result = await sendGoogleDocsFetch(docId);
      if (detached) return;
      if (result.ok) {
        setAuthState({ kind: "ok" });
        applyText(result.fullText);
        return;
      }
      if (result.reason === "auth-required") {
        setAuthState({
          kind: "needs-auth",
          reason: "no-token",
          error: result.error,
        });
      } else if (result.reason === "not-configured") {
        setAuthState({ kind: "not-configured", error: result.error });
      } else {
        setAuthState({
          kind: "doc-error",
          reason: result.reason,
          status: result.status,
          error: result.error,
        });
      }
    }

    function scheduleNextFetchApi(docId: string): void {
      if (detached) return;
      if (resolvedMode !== "api") return;
      const delay =
        currentAuthState.kind === "ok"
          ? API_POLL_INTERVAL_AUTHED_MS
          : API_POLL_INTERVAL_UNAUTHED_MS;
      apiPollTimer = window.setTimeout(async () => {
        apiPollTimer = null;
        await fetchCycleApi(docId);
        scheduleNextFetchApi(docId);
      }, delay) as unknown as number;
    }

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
        if (resolvedMode !== "api") return currentAuthState;
        const result = await sendGoogleAuthConnect(interactive);
        if (result.connected) {
          const docId = extractDocId(window.location.href);
          if (docId) await fetchCycleApi(docId);
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
        if (apiPollTimer !== null) {
          window.clearTimeout(apiPollTimer);
          apiPollTimer = null;
        }
        window.removeEventListener("message", onWindowMessage);
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

    function toDomRect(rect: {
      x: number;
      y: number;
      width: number;
      height: number;
    }): DOMRect {
      return new DOMRect(rect.x, rect.y, rect.width, rect.height);
    }

    void bridgeState;
  },
};

export interface GoogleDocsDiagnostic {
  selectorCounts: Record<string, number>;
  kixClasses: string[];
  textboxes: Array<{
    aria: string;
    contentEditable: string;
    multiline: string;
    textLength: number;
    sample: string;
  }>;
  regions: Array<{ aria: string; textLength: number }>;
  contenteditables: number;
  iframes: Array<{ src: string; sameOrigin: boolean }>;
}

export function diagnoseGoogleDocs(): GoogleDocsDiagnostic {
  const selectors = [
    ".kix-rotatingtilemanager-content",
    ".kix-appview-editor",
    ".docs-texteventtarget-iframe",
    ".kix-page-content-wrap",
    ".kix-paragraphrenderer",
    '[role="textbox"]',
    '[role="region"][aria-label]',
    '[contenteditable="true"]',
  ];
  const selectorCounts: Record<string, number> = {};
  for (const selector of selectors) {
    try {
      selectorCounts[selector] = document.querySelectorAll(selector).length;
    } catch {
      selectorCounts[selector] = -1;
    }
  }

  const textboxes = Array.from(
    document.querySelectorAll<HTMLElement>('[role="textbox"]'),
  ).map((element) => {
    const text = (element.textContent ?? "").trim();
    return {
      aria: element.getAttribute("aria-label") ?? "",
      contentEditable: element.getAttribute("contenteditable") ?? "",
      multiline: element.getAttribute("aria-multiline") ?? "",
      textLength: text.length,
      sample: text.slice(0, 80),
    };
  });

  const regions = Array.from(
    document.querySelectorAll<HTMLElement>('[role="region"][aria-label]'),
  ).map((element) => ({
    aria: element.getAttribute("aria-label") ?? "",
    textLength: (element.textContent ?? "").trim().length,
  }));

  const contenteditables = document.querySelectorAll(
    '[contenteditable="true"]',
  ).length;

  const iframes = Array.from(document.querySelectorAll("iframe")).map(
    (frame) => {
      const src = frame.getAttribute("src") ?? "";
      let sameOrigin = false;
      try {
        sameOrigin = Boolean(frame.contentDocument);
      } catch {
        sameOrigin = false;
      }
      return { src, sameOrigin };
    },
  );

  const kixClasses = collectKixClassNames();

  return {
    selectorCounts,
    kixClasses,
    textboxes,
    regions,
    contenteditables,
    iframes,
  };
}

function collectKixClassNames(): string[] {
  const set = new Set<string>();
  document
    .querySelectorAll<HTMLElement>('[class*="kix-"], [class*="docs-"]')
    .forEach((element) => {
      element.classList.forEach((token) => {
        if (token.startsWith("kix-") || token.startsWith("docs-")) {
          set.add(token);
        }
      });
    });
  return [...set].sort();
}
