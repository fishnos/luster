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
const RECONSTRUCT_DEBOUNCE_MS = 350;
const SUPPORT_PROBE_MS = 4000;
const MAX_GLYPHS_PER_CANVAS = 12000;
const CLEAR_RECT_COOLDOWN_MS = 250;
const STABLE_CANDIDATE_THRESHOLD = 3;

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
    current: RawGlyph[];
    last: RawGlyph[];
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
  let pendingCandidateText = "";
  let lastClearRectTime = 0;
  let pendingCandidateCount = 0;

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
        const clearArea = Math.max(0, width) * Math.max(0, height);
        const canvasArea = canvas.width * canvas.height;
        const cssArea = canvas.clientWidth * canvas.clientHeight;
        const referenceArea = Math.max(canvasArea, cssArea, 1);
        if (clearArea / referenceArea >= 0.6) {
          const buffers = buffersByCanvas.get(canvas);
          if (buffers) {
            if (buffers.current.length > 0) {
              buffers.last = buffers.current;
            }
            buffers.current = [];
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

    let buffers = buffersByCanvas.get(canvas);
    if (!buffers) {
      buffers = { current: [], last: [] };
      buffersByCanvas.set(canvas, buffers);
      trackedCanvases.push(canvas);
    }
    if (buffers.current.length >= MAX_GLYPHS_PER_CANVAS) {
      buffers.current.splice(
        0,
        buffers.current.length - Math.floor(MAX_GLYPHS_PER_CANVAS * 0.75),
      );
    }
    buffers.current.push({
      text,
      x: transformedX,
      y: transformedY,
      fontSize: fontSize * verticalScale,
    });
    scheduleReconstruct();
  }

  function readGlyphsForReconstruction(canvas: HTMLCanvasElement): RawGlyph[] {
    const buffers = buffersByCanvas.get(canvas);
    if (!buffers) return [];
    const source = buffers.last.length > 0 ? buffers.last : buffers.current;
    return dedupeGlyphs(source);
  }

  function dedupeGlyphs(source: RawGlyph[]): RawGlyph[] {
    const seen = new Set<string>();
    const unique: RawGlyph[] = [];
    for (const glyph of source) {
      const key = `${glyph.text}|${Math.round(glyph.x)}|${Math.round(glyph.y)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(glyph);
    }
    return unique;
  }

  function totalGlyphCount(): number {
    let total = 0;
    for (const canvas of trackedCanvases) {
      const buffers = buffersByCanvas.get(canvas);
      if (!buffers) continue;
      total += Math.max(buffers.current.length, buffers.last.length);
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
      const merged: RawGlyph[] = [];
      for (const canvas of trackedCanvases) {
        const glyphs = readGlyphsForReconstruction(canvas);
        if (glyphs.length === 0) continue;
        const rect = canvas.getBoundingClientRect();
        for (const glyph of glyphs) {
          merged.push({
            text: glyph.text,
            x: glyph.x + rect.left,
            y: glyph.y + rect.top,
            fontSize: glyph.fontSize,
          });
        }
      }
      const reconstruction = reconstructDocument(merged);
      lastReconstructedTextLength = reconstruction.fullText.length;
      lastReconstructedParagraphCount = reconstruction.paragraphs.length;
      lastReconstructedSample = reconstruction.fullText.slice(0, 160);

      const candidate = reconstruction.fullText;
      if (candidate === lastEmittedText) {
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
        candidate.length > lastEmittedText.length &&
        candidate.startsWith(lastEmittedText);
      const stableLongEnough = pendingCandidateCount >= STABLE_CANDIDATE_THRESHOLD;
      if (!isMonotonicGrowth && !stableLongEnough) {
        scheduleReconstruct();
        return;
      }

      lastEmittedText = candidate;
      pendingCandidateText = "";
      pendingCandidateCount = 0;
      postBridgeMessage({
        channel: BRIDGE_NAMESPACE,
        type: "text",
        fullText: candidate,
        paragraphs: reconstruction.paragraphs,
        glyphCount: merged.length,
        generation: ++generation,
      });
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

  window.setTimeout(() => {
    setState(totalGlyphCount() === 0 ? "unsupported" : "attached");
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

  window.setInterval(pollCaret, 200);

  window.setInterval(() => {
    for (const canvas of trackedCanvases) {
      const buffers = buffersByCanvas.get(canvas);
      if (!buffers) continue;
      if (buffers.current.length > buffers.last.length / 2) {
        buffers.last = buffers.current;
        buffers.current = [];
      }
    }
  }, 1200);

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
