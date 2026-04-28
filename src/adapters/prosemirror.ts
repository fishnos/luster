import type { Adapter, AdapterHandle } from "@/adapters/types";
import {
  caretRectFromSelection,
  createDomAdapterHandle,
  detectBlockAddition,
  readTextFromBlockElements,
} from "@/adapters/scaffold";

const BLOCK_SELECTOR = "p, h1, h2, h3, h4, blockquote, li, pre";

const URL_PATTERNS: ((url: URL) => boolean)[] = [
  (url) =>
    url.host.endsWith(".substack.com") && /\/publish\//.test(url.pathname),
  (url) =>
    url.host === "medium.com" && /\/(p|new-story|edit)/.test(url.pathname),
  (url) =>
    url.host.endsWith(".medium.com") &&
    /\/(p|new-story|edit)/.test(url.pathname),
  (url) => url.host.endsWith(".ghost.io") && /\/ghost\//.test(url.pathname),
];

function matchUrl(url: URL): boolean {
  return URL_PATTERNS.some((pattern) => pattern(url));
}

function matchEditor(hostDocument: Document): boolean {
  return hostDocument.querySelector(".ProseMirror") !== null;
}

export const proseMirrorAdapter: Adapter = {
  id: "prosemirror",

  matchUrl,
  matchEditor,

  match(url, hostDocument) {
    return matchUrl(url) && matchEditor(hostDocument);
  },

  attach(hostDocument): AdapterHandle {
    const editor = hostDocument.querySelector<HTMLElement>(".ProseMirror");
    if (!editor) {
      throw new Error("proseMirrorAdapter: .ProseMirror element not found");
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
