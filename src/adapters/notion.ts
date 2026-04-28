import type { Adapter, AdapterHandle } from "@/adapters/types";
import {
  caretRectFromSelection,
  createDomAdapterHandle,
  detectBlockAddition,
  readTextFromBlockElements,
} from "@/adapters/scaffold";

const PAGE_ROOT_SELECTORS = [
  ".notion-page-content",
  ".notion-page",
  '[data-content-editable-leaf="true"]',
  'main [contenteditable="true"]',
];

const BLOCK_SELECTOR = "[data-block-id]";

function matchUrl(url: URL): boolean {
  return url.host === "www.notion.so" || url.host.endsWith(".notion.site");
}

function findEditor(hostDocument: Document): HTMLElement | null {
  for (const selector of PAGE_ROOT_SELECTORS) {
    const found = hostDocument.querySelector<HTMLElement>(selector);
    if (found) return found;
  }
  return null;
}

function matchEditor(hostDocument: Document): boolean {
  const editor = findEditor(hostDocument);
  if (!editor) return false;
  return editor.querySelector(BLOCK_SELECTOR) !== null;
}

export const notionAdapter: Adapter = {
  id: "notion",

  matchUrl,
  matchEditor,

  match(url, hostDocument) {
    return matchUrl(url) && matchEditor(hostDocument);
  },

  attach(hostDocument): AdapterHandle {
    const editor = findEditor(hostDocument);
    if (!editor) {
      throw new Error("notionAdapter: page content element not found");
    }

    return createDomAdapterHandle({
      editorElement: editor,
      readText: () => readTextFromBlockElements(editor, BLOCK_SELECTOR),
      caretRect: () => {
        const ownerWindow = editor.ownerDocument.defaultView;
        return ownerWindow ? caretRectFromSelection(ownerWindow) : null;
      },
      detectParagraphBreak: detectBlockAddition(BLOCK_SELECTOR),
    });
  },
};
