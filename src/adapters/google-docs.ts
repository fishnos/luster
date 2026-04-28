import type { Adapter, AdapterHandle } from "@/adapters/types";
import {
  createDomAdapterHandle,
  detectBlockAddition,
  readTextFromBlockElements,
} from "@/adapters/scaffold";

const PAGE_WRAP_SELECTOR =
  '.kix-page-content-wrap, [aria-label="Document content"]';
const BLOCK_SELECTOR = ".kix-paragraphrenderer";

export const googleDocsAdapter: Adapter = {
  id: "google-docs",

  match(url, hostDocument) {
    if (url.host !== "docs.google.com") return false;
    if (!url.pathname.startsWith("/document/")) return false;
    return hostDocument.querySelector(PAGE_WRAP_SELECTOR) !== null;
  },

  attach(hostDocument): AdapterHandle {
    const editor = hostDocument.querySelector<HTMLElement>(PAGE_WRAP_SELECTOR);
    if (!editor) {
      throw new Error("googleDocsAdapter: kix page content wrap not found");
    }

    return createDomAdapterHandle({
      editorElement: editor,
      readText: () => readTextFromBlockElements(editor, BLOCK_SELECTOR),
      caretRect: () => null,
      debounceMs: 500,
      detectParagraphBreak: detectBlockAddition(BLOCK_SELECTOR),
    });
  },
};
