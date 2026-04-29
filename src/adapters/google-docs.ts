import type {
  Adapter,
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

const bridgeStateListeners = new Set<(state: BridgeState) => void>();
let lastBridgeState: BridgeState = "searching";

if (typeof window !== "undefined") {
  window.addEventListener("message", (event: MessageEvent) => {
    if (!isBridgeMessage(event.data)) return;
    if (event.data.channel !== BRIDGE_NAMESPACE) return;
    if (event.data.type === "state") {
      lastBridgeState = event.data.state;
      for (const listener of bridgeStateListeners) listener(event.data.state);
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

    const commitCallbacks = new Set<(delta: CommitDelta) => void>();
    const textChangeCallbacks = new Set<(text: string) => void>();
    const caretChangeCallbacks = new Set<(rect: DOMRect | null) => void>();

    const unsubscribeStream = textStream.onCommit((delta) => {
      for (const callback of commitCallbacks) callback(delta);
    });

    function handleBridgeMessage(message: BridgeMessage): void {
      if (message.type === "text") {
        if (message.fullText === lastFullText) return;
        lastFullText = message.fullText;
        textStream.update(message.fullText);
        for (const callback of textChangeCallbacks) callback(message.fullText);
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
      detach() {
        window.removeEventListener("message", onWindowMessage);
        unsubscribeStream();
        commitCallbacks.clear();
        textChangeCallbacks.clear();
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
