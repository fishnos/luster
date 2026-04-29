import {
  reconstructDocument,
  type RawGlyph,
} from "@/runtime/canvasGlyphReader";
import {
  BRIDGE_NAMESPACE,
  type BridgeMessage,
  type BridgeState,
} from "@/runtime/kixBridgeProtocol";

const EDITOR_CANVAS_MIN_DIMENSION = 200;
const RECONSTRUCT_DEBOUNCE_MS = 100;
const SUPPORT_PROBE_MS = 2500;
const MAX_GLYPHS_PER_CANVAS = 12000;
const CLEAR_RECT_COOLDOWN_MS = 60;
const STABLE_CANDIDATE_THRESHOLD = 3;
const DOM_FALLBACK_DEBOUNCE_MS = 350;
const DOM_FALLBACK_PERIODIC_MS = 2500;
const DOM_FALLBACK_OBSERVE_TARGETS = [
  ".kix-rotatingtilemanager-content",
  ".kix-canvas-tile-selection",
  ".kix-appview-editor",
];
const DOM_FALLBACK_PARAGRAPH_SELECTORS = [
  ".kix-paragraphrenderer",
  ".kix-lineview",
  '[role="paragraph"]',
  ".kix-page-content-wrap",
  ".kix-appview-editor",
];
const SCROLL_JIGGLE_TARGETS = [
  ".kix-appview-editor",
  ".kix-rotatingtilemanager-content",
];

export default defineContentScript({
  matches: ["https://docs.google.com/document/*"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    try {
      installCanvasBridge();
    } catch (error) {
      console.error("[Luster] bridge install failed", error);
    }
  },
});

function installCanvasBridge(): void {
  const flag = window as unknown as { __lusterBridgeInstalled?: boolean };
  if (flag.__lusterBridgeInstalled) return;
  flag.__lusterBridgeInstalled = true;

  interface CanvasBuffers {
    glyphs: RawGlyph[];
  }
  const buffersByCanvas = new WeakMap<HTMLCanvasElement, CanvasBuffers>();
  let trackedCanvases: HTMLCanvasElement[] = [];
  const seenCanvases = new Set<HTMLCanvasElement>();
  const fillTextHitsByCanvas = new WeakMap<HTMLCanvasElement, number>();
  let pendingReconstruct: number | null = null;
  let generation = 0;
  let currentBridgeState: BridgeState = "searching";
  let fillTextCalls = 0;
  let strokeTextCalls = 0;
  let clearRectCalls = 0;
  let lastReconstructedTextLength = 0;
  let lastReconstructedParagraphCount = 0;
  let lastReconstructedSample = "";
  let lastEmittedText = "";
  let lastCanvasText = "";
  let lastDomText = "";
  let lastDomParagraphs: string[] = [];
  let pendingCandidateText = "";
  let lastClearRectTime = 0;
  let pendingCandidateCount = 0;

  const docGlyphs = new Map<string, RawGlyph>();
  const DOC_GLYPHS_MAX = 80000;
  const SCROLL_CONTAINER_SELECTORS = [
    ".kix-appview-editor",
    ".kix-rotatingtilemanager-content",
    ".docs-editor-container",
  ];

  function getScrollOffset(): number {
    for (const selector of SCROLL_CONTAINER_SELECTORS) {
      const element = document.querySelector<HTMLElement>(selector);
      if (element && element.scrollTop > 0) return element.scrollTop;
    }
    return window.scrollY || 0;
  }

  const proto = CanvasRenderingContext2D.prototype;
  const originalFillText = proto.fillText;
  const originalStrokeText = proto.strokeText;
  const originalClearRect = proto.clearRect;

  proto.fillText = function patchedFillText(
    this: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth?: number,
  ) {
    const result =
      maxWidth === undefined
        ? originalFillText.call(this, text, x, y)
        : originalFillText.call(this, text, x, y, maxWidth);
    try {
      fillTextCalls += 1;
      const canvas = this.canvas;
      if (canvas) {
        seenCanvases.add(canvas);
        fillTextHitsByCanvas.set(
          canvas,
          (fillTextHitsByCanvas.get(canvas) ?? 0) + 1,
        );
      }
      recordGlyph(this, text, x, y);
    } catch (error) {
      logOnce("fillText hook", error);
    }
    return result;
  };

  proto.strokeText = function patchedStrokeText(
    this: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth?: number,
  ) {
    const result =
      maxWidth === undefined
        ? originalStrokeText.call(this, text, x, y)
        : originalStrokeText.call(this, text, x, y, maxWidth);
    try {
      strokeTextCalls += 1;
      if (this.canvas) seenCanvases.add(this.canvas);
      recordGlyph(this, text, x, y);
    } catch (error) {
      logOnce("strokeText hook", error);
    }
    return result;
  };

  proto.clearRect = function patchedClearRect(
    this: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const result = originalClearRect.call(this, x, y, width, height);
    try {
      const canvas = this.canvas;
      if (canvas && isEditorCanvas(canvas)) {
        clearRectCalls += 1;
        lastClearRectTime = performance.now();
        const matrix = readTransform(this);
        const tx0 = matrix.a * x + matrix.c * y + matrix.e;
        const ty0 = matrix.b * x + matrix.d * y + matrix.f;
        const tx1 = matrix.a * (x + width) + matrix.c * (y + height) + matrix.e;
        const ty1 = matrix.b * (x + width) + matrix.d * (y + height) + matrix.f;
        const minX = Math.min(tx0, tx1);
        const maxX = Math.max(tx0, tx1);
        const minY = Math.min(ty0, ty1);
        const maxY = Math.max(ty0, ty1);
        const buffers = buffersByCanvas.get(canvas);
        if (buffers && buffers.glyphs.length > 0) {
          const filtered: RawGlyph[] = [];
          for (const glyph of buffers.glyphs) {
            const inside =
              glyph.x >= minX - 0.5 &&
              glyph.x <= maxX + 0.5 &&
              glyph.y >= minY - glyph.fontSize &&
              glyph.y <= maxY + 0.5;
            if (!inside) filtered.push(glyph);
          }
          if (filtered.length !== buffers.glyphs.length) {
            buffers.glyphs = filtered;
            scheduleReconstruct();
          }
        }
      }
    } catch (error) {
      logOnce("clearRect hook", error);
    }
    return result;
  };

  function isEditorCanvas(canvas: HTMLCanvasElement | null): boolean {
    if (!canvas) return false;
    try {
      if (
        canvas.width < EDITOR_CANVAS_MIN_DIMENSION ||
        canvas.height < EDITOR_CANVAS_MIN_DIMENSION
      ) {
        return false;
      }
      let cursor: Element | null = canvas.parentElement;
      let depth = 0;
      while (cursor && depth < 10) {
        const className =
          typeof cursor.className === "string" ? cursor.className : "";
        if (className) {
          for (const token of className.split(/\s+/)) {
            if (
              token.startsWith("kix-") ||
              token.startsWith("docs-") ||
              token === "kix"
            ) {
              return true;
            }
          }
        }
        cursor = cursor.parentElement;
        depth += 1;
      }
      return false;
    } catch {
      return false;
    }
  }

  function recordGlyph(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
  ): void {
    if (typeof text !== "string" || text.length === 0) return;
    const canvas = context.canvas;
    if (!isEditorCanvas(canvas)) return;

    const matrix = readTransform(context);
    const transformedX = matrix.a * x + matrix.c * y + matrix.e;
    const transformedY = matrix.b * x + matrix.d * y + matrix.f;
    const fontSize = parseFontSize(context.font);
    const verticalScale = Math.abs(matrix.d) || 1;
    const finalFontSize = fontSize * verticalScale;

    let buffers = buffersByCanvas.get(canvas);
    if (!buffers) {
      buffers = { glyphs: [] };
      buffersByCanvas.set(canvas, buffers);
      trackedCanvases.push(canvas);
    }
    if (buffers.glyphs.length >= MAX_GLYPHS_PER_CANVAS) {
      buffers.glyphs.splice(
        0,
        buffers.glyphs.length - Math.floor(MAX_GLYPHS_PER_CANVAS * 0.75),
      );
    }
    buffers.glyphs.push({
      text,
      x: transformedX,
      y: transformedY,
      fontSize: finalFontSize,
    });

    const rect = canvas.getBoundingClientRect();
    const absX = transformedX + rect.left;
    const absY = transformedY + rect.top + getScrollOffset();
    const lineBucket = Math.round(absY / Math.max(finalFontSize, 6));
    const xBucket = Math.round(absX);
    const key = `${xBucket}|${lineBucket}`;
    docGlyphs.set(key, {
      text,
      x: absX,
      y: absY,
      fontSize: finalFontSize,
    });

    scheduleReconstruct();
  }

  function readGlyphsForReconstruction(canvas: HTMLCanvasElement): RawGlyph[] {
    const buffers = buffersByCanvas.get(canvas);
    return buffers?.glyphs ?? [];
  }

  function totalGlyphCount(): number {
    let total = 0;
    for (const canvas of trackedCanvases) {
      const buffers = buffersByCanvas.get(canvas);
      if (!buffers) continue;
      total += buffers.glyphs.length;
    }
    return total;
  }

  function readTransform(context: CanvasRenderingContext2D): {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
  } {
    try {
      const matrix = context.getTransform();
      return {
        a: matrix.a,
        b: matrix.b,
        c: matrix.c,
        d: matrix.d,
        e: matrix.e,
        f: matrix.f,
      };
    } catch {
      return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    }
  }

  function parseFontSize(fontDeclaration: string): number {
    if (typeof fontDeclaration !== "string") return 14;
    const match = fontDeclaration.match(/(\d+(?:\.\d+)?)px/);
    return match && match[1] ? parseFloat(match[1]) : 14;
  }

  function scheduleReconstruct(): void {
    if (pendingReconstruct !== null) {
      window.clearTimeout(pendingReconstruct as number);
      pendingReconstruct = null;
    }
    pendingReconstruct = window.setTimeout(() => {
      pendingReconstruct = null;
      runReconstruct();
    }, RECONSTRUCT_DEBOUNCE_MS) as unknown as number;
  }

  function runReconstruct(): void {
    try {
      trackedCanvases = trackedCanvases.filter(
        (canvas) => canvas.isConnected && isEditorCanvas(canvas),
      );
      if (docGlyphs.size > DOC_GLYPHS_MAX) {
        const excess = docGlyphs.size - DOC_GLYPHS_MAX;
        const iterator = docGlyphs.keys();
        for (let i = 0; i < excess; i += 1) {
          const next = iterator.next();
          if (next.done) break;
          docGlyphs.delete(next.value);
        }
      }
      const reconstruction = reconstructDocument(
        Array.from(docGlyphs.values()),
      );
      debug(
        `reconstruct: docGlyphs=${docGlyphs.size} chars=${reconstruction.fullText.length} paras=${reconstruction.paragraphs.length}`,
      );
      lastReconstructedTextLength = reconstruction.fullText.length;
      lastReconstructedParagraphCount = reconstruction.paragraphs.length;
      lastReconstructedSample = reconstruction.fullText.slice(0, 160);

      const candidate = reconstruction.fullText;
      if (candidate === lastCanvasText) {
        pendingCandidateText = "";
        pendingCandidateCount = 0;
        return;
      }

      const timeSinceClear = performance.now() - lastClearRectTime;
      if (timeSinceClear < CLEAR_RECT_COOLDOWN_MS) {
        scheduleReconstruct();
        return;
      }

      if (candidate === pendingCandidateText) {
        pendingCandidateCount += 1;
      } else {
        pendingCandidateText = candidate;
        pendingCandidateCount = 1;
      }
      const isMonotonicGrowth =
        candidate.length > lastCanvasText.length &&
        candidate.startsWith(lastCanvasText);
      const stableLongEnough =
        pendingCandidateCount >= STABLE_CANDIDATE_THRESHOLD;
      if (!isMonotonicGrowth && !stableLongEnough) {
        scheduleReconstruct();
        return;
      }

      lastCanvasText = candidate;
      pendingCandidateText = "";
      pendingCandidateCount = 0;
      emitBest(reconstruction.paragraphs, docGlyphs.size);
    } catch (error) {
      logOnce("reconstruct", error);
    }
  }

  function postBridgeMessage(message: BridgeMessage): void {
    try {
      window.postMessage(message, "*");
    } catch (error) {
      logOnce("postMessage", error);
    }
  }

  function setState(state: BridgeState): void {
    currentBridgeState = state;
    postBridgeMessage({
      channel: BRIDGE_NAMESPACE,
      type: "state",
      state,
    });
  }

  setState("searching");

  let domObserver: MutationObserver | null = null;
  let domFallbackTimer: number | null = null;
  let lastDomEmittedText = "";
  let domObserverInstalled = false;

  function readDomParagraphs(): string[] {
    const collected: string[] = [];
    const seenElements = new WeakSet<Element>();
    for (const selector of DOM_FALLBACK_PARAGRAPH_SELECTORS) {
      let nodes: NodeListOf<Element>;
      try {
        nodes = document.querySelectorAll(selector);
      } catch {
        continue;
      }
      nodes.forEach((node) => {
        if (seenElements.has(node)) return;
        seenElements.add(node);
        const text = extractDomText(node);
        if (text) collected.push(text);
      });
      if (collected.length > 0) break;
    }
    if (collected.length === 0) {
      collected.push(...readSvgAriaText());
    }
    return collected;
  }

  function extractDomText(element: Element): string {
    const direct = (element.textContent ?? "").replace(/\s+\n/g, "\n").trim();
    if (direct.length > 0) return direct;
    const ariaParts: string[] = [];
    element.querySelectorAll<HTMLElement>("[aria-label]").forEach((node) => {
      const label = node.getAttribute("aria-label");
      if (label && label.trim()) ariaParts.push(label.trim());
    });
    return ariaParts.join(" ").trim();
  }

  function readSvgAriaText(): string[] {
    const ariaSelectors = [
      ".kix-page-content-wrapper [aria-label]",
      ".kix-page [aria-label]",
      ".kix-appview-editor [aria-label]",
      ".kix-rotatingtilemanager-content [aria-label]",
      "svg g[aria-label]",
      "svg text[aria-label]",
      "svg rect[aria-label]",
      "[role='paragraph'][aria-label]",
      "[role='textbox'][aria-label]",
    ];
    for (const selector of ariaSelectors) {
      let nodes: NodeListOf<Element>;
      try {
        nodes = document.querySelectorAll(selector);
      } catch {
        continue;
      }
      if (nodes.length === 0) continue;
      const labels: string[] = [];
      let totalLength = 0;
      let nonEmpty = 0;
      nodes.forEach((node) => {
        const label = node.getAttribute("aria-label") ?? "";
        labels.push(label);
        totalLength += label.length;
        if (label.length > 0) nonEmpty += 1;
      });
      if (nonEmpty === 0) continue;
      const avgLength = totalLength / nonEmpty;
      const joined =
        avgLength <= 3
          ? labels.join("")
          : labels
              .map((label) => label.trim())
              .filter(Boolean)
              .join(" ");
      const cleaned = joined.replace(/[ \t]+/g, " ").trim();
      if (cleaned.length === 0) continue;
      const paragraphs = cleaned
        .split(/\n{2,}|\r{2,}/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      return paragraphs.length > 0 ? paragraphs : [cleaned];
    }
    return [];
  }

  function scheduleDomFallback(): void {
    if (domFallbackTimer !== null) {
      window.clearTimeout(domFallbackTimer);
    }
    domFallbackTimer = window.setTimeout(() => {
      domFallbackTimer = null;
      runDomFallback();
    }, DOM_FALLBACK_DEBOUNCE_MS) as unknown as number;
  }

  function runDomFallback(): void {
    try {
      const paragraphs = readDomParagraphs();
      debug(
        `dom scan: ${paragraphs.length} paragraphs, ${paragraphs.join("\n\n").length} chars`,
      );
      if (paragraphs.length === 0) return;
      const fullText = paragraphs.join("\n\n");
      if (fullText === lastDomEmittedText) return;
      lastDomEmittedText = fullText;
      lastDomText = fullText;
      lastDomParagraphs = paragraphs;
      if (currentBridgeState !== "attached") setState("attached");
      emitBest(paragraphs, 0);
    } catch (error) {
      logOnce("dom-fallback", error);
    }
  }

  function emitBest(canvasParagraphs: string[], glyphCount: number): void {
    const useDom = lastDomText.length > lastCanvasText.length;
    const fullText = useDom ? lastDomText : lastCanvasText;
    const paragraphs = useDom ? lastDomParagraphs : canvasParagraphs;
    debug(
      `emit ${useDom ? "DOM" : "CANVAS"} chars=${fullText.length} paras=${paragraphs.length} (canvas=${lastCanvasText.length} dom=${lastDomText.length})`,
    );
    if (fullText.length === 0) return;
    if (fullText === lastEmittedText) return;
    lastEmittedText = fullText;
    lastReconstructedTextLength = fullText.length;
    lastReconstructedParagraphCount = paragraphs.length;
    lastReconstructedSample = fullText.slice(0, 160);
    postBridgeMessage({
      channel: BRIDGE_NAMESPACE,
      type: "text",
      fullText,
      paragraphs,
      glyphCount,
      generation: ++generation,
    });
  }

  function debug(message: string): void {
    const flag = (window as unknown as { __lusterDebug?: boolean })
      .__lusterDebug;
    if (flag) console.log(`[Luster bridge] ${message}`);
  }

  function installDomObserver(): void {
    if (domObserverInstalled) return;
    const targets: Element[] = [];
    for (const selector of DOM_FALLBACK_OBSERVE_TARGETS) {
      document.querySelectorAll(selector).forEach((element) => {
        targets.push(element);
      });
    }
    if (targets.length === 0) {
      const editor =
        document.querySelector(".kix-appview-editor") || document.body;
      if (editor) targets.push(editor);
    }
    domObserver = new MutationObserver(() => {
      scheduleDomFallback();
    });
    for (const target of targets) {
      try {
        domObserver.observe(target, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
          attributeFilter: ["aria-label"],
        });
      } catch (error) {
        logOnce("dom-observe", error);
      }
    }
    domObserverInstalled = targets.length > 0;
    if (domObserverInstalled) runDomFallback();
  }

  function tryInstallDomObserverWithRetry(): void {
    installDomObserver();
    if (!domObserverInstalled) {
      window.setTimeout(tryInstallDomObserverWithRetry, 1000);
    } else {
      jiggleScrollToForceRedraw();
    }
  }

  function jiggleScrollToForceRedraw(): void {
    let attempts = 0;
    function attempt(): void {
      attempts += 1;
      let nudged = false;
      for (const selector of SCROLL_JIGGLE_TARGETS) {
        const targets = document.querySelectorAll<HTMLElement>(selector);
        targets.forEach((element) => {
          try {
            const original = element.scrollTop;
            element.scrollTop = original + 1;
            element.scrollTop = original;
            nudged = true;
          } catch {
            // ignore
          }
          try {
            element.dispatchEvent(new Event("scroll", { bubbles: true }));
            nudged = true;
          } catch {
            // ignore
          }
        });
      }
      try {
        window.dispatchEvent(new Event("resize"));
        nudged = true;
      } catch {
        // ignore
      }
      void nudged;
      if (lastEmittedText.length === 0 && attempts < 6) {
        window.setTimeout(attempt, 600);
      }
    }
    attempt();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      tryInstallDomObserverWithRetry,
      { once: true },
    );
  } else {
    tryInstallDomObserverWithRetry();
  }

  window.setInterval(runDomFallback, DOM_FALLBACK_PERIODIC_MS);

  window.setTimeout(() => {
    const hasGlyphs = totalGlyphCount() > 0;
    const hasDomText = lastDomEmittedText.length > 0;
    if (hasGlyphs || hasDomText) {
      setState("attached");
    } else {
      runDomFallback();
      setState(
        totalGlyphCount() === 0 && lastDomEmittedText.length === 0
          ? "unsupported"
          : "attached",
      );
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
      logOnce("pollCaret", error);
    }
  }

  window.setInterval(pollCaret, 80);

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

      let trackedEditorCanvases = 0;
      for (const canvas of trackedCanvases) {
        if (canvas.isConnected && isEditorCanvas(canvas)) {
          trackedEditorCanvases += 1;
        }
      }
      const totalGlyphs = totalGlyphCount();

      const totalCanvases = document.querySelectorAll("canvas").length;
      const hasKixApp =
        "KX_kixApp" in window ||
        (window as unknown as Record<string, unknown>).KX_kixApp !== undefined;
      const caretSelectorPresent =
        document.querySelector(".kix-cursor, .kix-cursor-caret") !== null;

      const candidateCanvases = [...seenCanvases]
        .filter((canvas) => canvas.isConnected)
        .slice(0, 8)
        .map((canvas) => ({
          width: canvas.width,
          height: canvas.height,
          classChain: canvas.className || "(no class)",
          ancestorClasses: collectAncestorClasses(canvas, 4),
          fillTextHits: fillTextHitsByCanvas.get(canvas) ?? 0,
          isEditor: isEditorCanvas(canvas),
        }));

      postBridgeMessage({
        channel: BRIDGE_NAMESPACE,
        type: "probe-response",
        requestId,
        installed: true,
        fillTextCalls,
        strokeTextCalls,
        clearRectCalls,
        trackedEditorCanvases,
        totalCanvases,
        totalGlyphs,
        lastReconstructedTextLength,
        lastReconstructedParagraphCount,
        lastReconstructedSample,
        bridgeState: currentBridgeState,
        hasKixApp,
        caretSelectorPresent,
        candidateCanvases,
      });

      if (lastEmittedText.length > 0) {
        postBridgeMessage({
          channel: BRIDGE_NAMESPACE,
          type: "text",
          fullText: lastEmittedText,
          paragraphs: lastEmittedText.split(/\n{2,}/),
          glyphCount: totalGlyphs,
          generation: ++generation,
        });
      }
    } catch (error) {
      logOnce("probe-request", error);
    }
  });

  const loggedTags = new Set<string>();
  function logOnce(tag: string, error: unknown): void {
    if (loggedTags.has(tag)) return;
    loggedTags.add(tag);
    console.warn(`[Luster] bridge ${tag} failed:`, error);
  }

  function collectAncestorClasses(element: Element, depth: number): string {
    const chain: string[] = [];
    let current: Element | null = element.parentElement;
    while (current && chain.length < depth) {
      if (current.className && typeof current.className === "string") {
        chain.push(current.className.split(/\s+/).slice(0, 3).join(" "));
      } else {
        chain.push(current.tagName.toLowerCase());
      }
      current = current.parentElement;
    }
    return chain.join(" › ") || "(none)";
  }
}
