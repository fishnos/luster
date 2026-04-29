import {
  BRIDGE_NAMESPACE,
  type BridgeMessage,
  type BridgeState,
} from "@/runtime/kixBridgeProtocol";

const TEXT_DEBOUNCE_MS = 150;
const CARET_POLL_MS = 80;
const SUPPORT_PROBE_MS = 4000;

const PARAGRAPH_SELECTORS = [
  ".kix-paragraphrenderer",
  ".kix-lineview",
  '[role="paragraph"]',
];
const OBSERVE_TARGETS = [
  ".kix-rotatingtilemanager-content",
  ".kix-canvas-tile-selection",
  ".kix-appview-editor",
];

export default defineContentScript({
  matches: ["https://docs.google.com/document/*"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    try {
      installDomBridge();
    } catch (error) {
      console.error("[Luster] bridge install failed", error);
    }
  },
});

function installDomBridge(): void {
  const flag = window as unknown as { __lusterBridgeInstalled?: boolean };
  if (flag.__lusterBridgeInstalled) return;
  flag.__lusterBridgeInstalled = true;

  let bridgeState: BridgeState = "searching";
  let lastEmittedText = "";
  let textTimer: number | null = null;
  let observer: MutationObserver | null = null;
  let observerInstalled = false;
  let generation = 0;

  const loggedTags = new Set<string>();
  function logOnce(tag: string, error: unknown): void {
    if (loggedTags.has(tag)) return;
    loggedTags.add(tag);
    console.warn(`[Luster] bridge ${tag} failed:`, error);
  }

  function postBridgeMessage(message: BridgeMessage): void {
    try {
      window.postMessage(message, "*");
    } catch (error) {
      logOnce("postMessage", error);
    }
  }

  function setState(state: BridgeState): void {
    if (bridgeState === state) return;
    bridgeState = state;
    postBridgeMessage({
      channel: BRIDGE_NAMESPACE,
      type: "state",
      state,
    });
  }

  function readParagraphs(): string[] {
    for (const selector of PARAGRAPH_SELECTORS) {
      let nodes: NodeListOf<Element>;
      try {
        nodes = document.querySelectorAll(selector);
      } catch {
        continue;
      }
      if (nodes.length === 0) continue;
      const collected: string[] = [];
      nodes.forEach((node) => {
        const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
        if (text.length > 0) collected.push(text);
      });
      if (collected.length > 0) return collected;
    }
    return readSvgAriaText();
  }

  function readSvgAriaText(): string[] {
    const lines: string[] = [];
    const nodes = document.querySelectorAll<SVGElement>(
      "svg rect[aria-label], svg text[aria-label]",
    );
    nodes.forEach((node) => {
      const label = node.getAttribute("aria-label");
      if (label && label.trim()) lines.push(label.trim());
    });
    return lines;
  }

  function emitText(): void {
    try {
      const paragraphs = readParagraphs();
      if (paragraphs.length === 0) return;
      const fullText = paragraphs.join("\n\n");
      if (fullText === lastEmittedText) return;
      lastEmittedText = fullText;
      setState("attached");
      postBridgeMessage({
        channel: BRIDGE_NAMESPACE,
        type: "text",
        fullText,
        paragraphs,
        glyphCount: 0,
        generation: ++generation,
      });
    } catch (error) {
      logOnce("emit-text", error);
    }
  }

  function scheduleEmit(): void {
    if (textTimer !== null) {
      window.clearTimeout(textTimer);
    }
    textTimer = window.setTimeout(() => {
      textTimer = null;
      emitText();
    }, TEXT_DEBOUNCE_MS) as unknown as number;
  }

  function installObserver(): void {
    if (observerInstalled) return;
    const targets: Element[] = [];
    for (const selector of OBSERVE_TARGETS) {
      document.querySelectorAll(selector).forEach((element) => {
        targets.push(element);
      });
    }
    if (targets.length === 0) {
      const editor =
        document.querySelector(".kix-appview-editor") || document.body;
      if (editor) targets.push(editor);
    }
    observer = new MutationObserver(() => {
      scheduleEmit();
    });
    for (const target of targets) {
      try {
        observer.observe(target, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
          attributeFilter: ["aria-label"],
        });
      } catch (error) {
        logOnce("observe", error);
      }
    }
    observerInstalled = targets.length > 0;
    if (observerInstalled) emitText();
  }

  function tryInstallObserverWithRetry(): void {
    installObserver();
    if (!observerInstalled) {
      window.setTimeout(tryInstallObserverWithRetry, 800);
    }
  }

  setState("searching");
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryInstallObserverWithRetry, {
      once: true,
    });
  } else {
    tryInstallObserverWithRetry();
  }

  window.setTimeout(() => {
    if (lastEmittedText.length > 0) {
      setState("attached");
    } else {
      emitText();
      setState(lastEmittedText.length > 0 ? "attached" : "unsupported");
    }
  }, SUPPORT_PROBE_MS);

  let lastCaretRectKey = "";
  function pollCaret(): void {
    try {
      const cursor = document.querySelector<HTMLElement>(
        ".kix-cursor, .kix-cursor-caret",
      );
      if (!cursor) {
        if (lastCaretRectKey !== "null") {
          lastCaretRectKey = "null";
          postBridgeMessage({
            channel: BRIDGE_NAMESPACE,
            type: "caret",
            rect: null,
            docIndex: null,
          });
        }
        return;
      }
      const rect = cursor.getBoundingClientRect();
      const key = `${rect.left}|${rect.top}|${rect.width}|${rect.height}`;
      if (key === lastCaretRectKey) return;
      lastCaretRectKey = key;
      postBridgeMessage({
        channel: BRIDGE_NAMESPACE,
        type: "caret",
        rect: {
          x: rect.left,
          y: rect.top,
          width: Math.max(rect.width, 1),
          height: Math.max(rect.height, 14),
        },
        docIndex: null,
      });
    } catch (error) {
      logOnce("poll-caret", error);
    }
  }

  window.setInterval(pollCaret, CARET_POLL_MS);

  window.addEventListener("message", (event: MessageEvent) => {
    try {
      const data = event.data;
      if (
        typeof data !== "object" ||
        data === null ||
        (data as { channel?: unknown }).channel !== BRIDGE_NAMESPACE ||
        (data as { type?: unknown }).type !== "probe-request"
      ) {
        return;
      }
      const requestId = String(
        (data as { requestId?: unknown }).requestId ?? "",
      );
      const totalCanvases = document.querySelectorAll("canvas").length;
      const hasKixApp =
        "KX_kixApp" in window ||
        (window as unknown as Record<string, unknown>).KX_kixApp !== undefined;
      const caretSelectorPresent =
        document.querySelector(".kix-cursor, .kix-cursor-caret") !== null;
      postBridgeMessage({
        channel: BRIDGE_NAMESPACE,
        type: "probe-response",
        requestId,
        installed: true,
        fillTextCalls: 0,
        strokeTextCalls: 0,
        clearRectCalls: 0,
        trackedEditorCanvases: 0,
        totalCanvases,
        totalGlyphs: 0,
        lastReconstructedTextLength: lastEmittedText.length,
        lastReconstructedParagraphCount: lastEmittedText
          ? lastEmittedText.split("\n\n").length
          : 0,
        lastReconstructedSample: lastEmittedText.slice(0, 160),
        bridgeState,
        hasKixApp,
        caretSelectorPresent,
        candidateCanvases: [],
      });
    } catch (error) {
      logOnce("probe-request", error);
    }
  });
}
