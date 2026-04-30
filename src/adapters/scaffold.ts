import { createTextStream, type TextStream } from "@/core/textStream";
import { debounce } from "@/lib/debounce";
import type {
  AdapterHandle,
  CommitDelta,
  UnsubscribeFn,
} from "@/adapters/types";

export interface DomAdapterConfig {
  editorElement: HTMLElement;
  readText: () => string;
  caretRect: () => DOMRect | null;
  observeOptions?: MutationObserverInit;
  debounceMs?: number;
  detectParagraphBreak?: (mutations: MutationRecord[]) => boolean;
}

export function createDomAdapterHandle(
  config: DomAdapterConfig,
): AdapterHandle {
  const debounceMs = config.debounceMs ?? 250;
  const observeOptions: MutationObserverInit = config.observeOptions ?? {
    subtree: true,
    childList: true,
    characterData: true,
  };

  const textStream: TextStream = createTextStream();
  const commitCallbacks = new Set<(delta: CommitDelta) => void>();
  const textChangeCallbacks = new Set<(text: string) => void>();
  const caretChangeCallbacks = new Set<(rect: DOMRect | null) => void>();
  let lastCaretRect: DOMRect | null = null;
  const unsubscribeFromStream = textStream.onCommit((delta) => {
    for (const callback of commitCallbacks) callback(delta);
  });

  const pushUpdate = debounce(() => {
    const currentText = config.readText();
    textStream.update(currentText);
    for (const callback of textChangeCallbacks) callback(currentText);
  }, debounceMs);

  const observer = new MutationObserver((mutations) => {
    pushUpdate();
    if (config.detectParagraphBreak && config.detectParagraphBreak(mutations)) {
      pushUpdate.flush();
      textStream.signalParagraphBreak();
    }
  });
  observer.observe(config.editorElement, observeOptions);

  const initialText = config.readText();
  textStream.update(initialText);
  for (const callback of textChangeCallbacks) callback(initialText);

  return {
    readText: () => config.readText(),
    onCommit(callback): UnsubscribeFn {
      commitCallbacks.add(callback);
      return () => commitCallbacks.delete(callback);
    },
    onTextChange(callback): UnsubscribeFn {
      textChangeCallbacks.add(callback);
      callback(config.readText());
      return () => textChangeCallbacks.delete(callback);
    },
    onCaretChange(callback): UnsubscribeFn {
      caretChangeCallbacks.add(callback);
      if (lastCaretRect) callback(lastCaretRect);
      return () => caretChangeCallbacks.delete(callback);
    },
    caretRect: () => {
      const rect = config.caretRect();
      lastCaretRect = rect;
      return rect;
    },
    detach() {
      observer.disconnect();
      pushUpdate.cancel();
      unsubscribeFromStream();
      commitCallbacks.clear();
      textChangeCallbacks.clear();
      caretChangeCallbacks.clear();
      textStream.reset();
    },
  };
}

const EXCLUDED_TAG_NAMES = new Set([
  "BUTTON",
  "SVG",
  "STYLE",
  "SCRIPT",
  "NOSCRIPT",
  "INPUT",
  "SELECT",
  "TEXTAREA",
]);

const EXCLUDED_ROLE_NAMES = new Set([
  "button",
  "menu",
  "menuitem",
  "toolbar",
  "presentation",
  "tooltip",
]);

const NON_BREAKING_SPACE = / /g;

export function readTextFromBlockElements(
  root: HTMLElement,
  blockSelector: string,
): string {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>(blockSelector));
  if (blocks.length === 0) return "";
  const lines = blocks
    .map((block) => extractWritingTextFromBlock(block))
    .filter((line) => line.length > 0);
  return lines.join("\n\n");
}

function extractWritingTextFromBlock(block: HTMLElement): string {
  const ownerDocument = block.ownerDocument;
  const treeWalker = ownerDocument.createTreeWalker(
    block,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(textNode) {
        let element: Element | null = textNode.parentElement;
        const stopAt = block.parentElement;
        while (element && element !== stopAt) {
          if (EXCLUDED_TAG_NAMES.has(element.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (element.getAttribute("aria-hidden") === "true") {
            return NodeFilter.FILTER_REJECT;
          }
          if (element.getAttribute("contenteditable") === "false") {
            return NodeFilter.FILTER_REJECT;
          }
          const role = element.getAttribute("role");
          if (role && EXCLUDED_ROLE_NAMES.has(role)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (element.hasAttribute("data-placeholder")) {
            return NodeFilter.FILTER_REJECT;
          }
          if (element === block) break;
          element = element.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  const parts: string[] = [];
  let textNode: Node | null = treeWalker.nextNode();
  while (textNode) {
    const value = textNode.nodeValue ?? "";
    if (value.length > 0) parts.push(value);
    textNode = treeWalker.nextNode();
  }
  return parts.join("").replace(NON_BREAKING_SPACE, " ").trim();
}

export function caretRectFromSelection(window: Window): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (
    rect.width === 0 &&
    rect.height === 0 &&
    rect.left === 0 &&
    rect.top === 0
  ) {
    return null;
  }
  return rect;
}

export function detectBlockAddition(blockSelector: string) {
  return (mutations: MutationRecord[]): boolean => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const addedNode of Array.from(mutation.addedNodes)) {
        if (addedNode.nodeType !== 1) continue;
        const element = addedNode as Element;
        if (element.matches(blockSelector)) return true;
      }
    }
    return false;
  };
}
