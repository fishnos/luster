import type { Adapter, AdapterHandle } from "@/adapters/types";
import {
  caretRectFromSelection,
  createDomAdapterHandle,
  detectBlockAddition,
  readTextFromBlockElements,
} from "@/adapters/scaffold";

const PAGE_ROOT_SELECTOR =
  '.notion-page-content, [data-content-editable-leaf="true"]';
const BLOCK_SELECTOR = "[data-block-id]";

export const notionAdapter: Adapter = {
  id: "notion",

  match(url, hostDocument) {
    const isNotionHost =
      url.host === "www.notion.so" || url.host.endsWith(".notion.site");
    if (!isNotionHost) return false;
    return hostDocument.querySelector(PAGE_ROOT_SELECTOR) !== null;
  },

  attach(hostDocument): AdapterHandle {
    const editor = hostDocument.querySelector<HTMLElement>(PAGE_ROOT_SELECTOR);
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
