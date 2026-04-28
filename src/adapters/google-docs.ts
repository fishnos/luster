import type { Adapter, AdapterHandle } from "@/adapters/types";
import {
  createDomAdapterHandle,
  detectBlockAddition,
  readTextFromBlockElements,
} from "@/adapters/scaffold";

const PAGE_WRAP_CANDIDATES = [
  ".kix-page-content-wrap",
  ".kix-paginated-tab-container",
  '[aria-label="Document content"]',
  '[role="document"]',
  '[role="textbox"][aria-multiline="true"]',
  '[contenteditable="true"][role="textbox"]',
  ".docs-page-content",
  ".docs-editor-content",
];

const BLOCK_CANDIDATES = [
  ".kix-paragraphrenderer",
  ".kix-lineview",
  '[role="paragraph"]',
];

function matchUrl(url: URL): boolean {
  return (
    url.host === "docs.google.com" && url.pathname.startsWith("/document/")
  );
}

function findEditor(hostDocument: Document): HTMLElement | null {
  for (const selector of PAGE_WRAP_CANDIDATES) {
    const element = hostDocument.querySelector<HTMLElement>(selector);
    if (element && (element.textContent ?? "").trim().length > 0) {
      return element;
    }
  }
  const firstBlock = hostDocument.querySelector<HTMLElement>(
    BLOCK_CANDIDATES.join(", "),
  );
  if (firstBlock) {
    const wrap = firstBlock.closest<HTMLElement>(
      PAGE_WRAP_CANDIDATES.join(", "),
    );
    if (wrap) return wrap;
    const editorParent = firstBlock.closest<HTMLElement>(
      ".kix-appview-editor, .docs-editor",
    );
    if (editorParent) return editorParent;
    return firstBlock.parentElement as HTMLElement | null;
  }
  return null;
}

function matchEditor(hostDocument: Document): boolean {
  return findEditor(hostDocument) !== null;
}

export const googleDocsAdapter: Adapter = {
  id: "google-docs",

  matchUrl,
  matchEditor,

  match(url, hostDocument) {
    return matchUrl(url) && matchEditor(hostDocument);
  },

  attach(hostDocument): AdapterHandle {
    const editor = findEditor(hostDocument);
    if (!editor) {
      throw new Error("googleDocsAdapter: editor not found");
    }
    const blockSelector = BLOCK_CANDIDATES.join(", ");
    return createDomAdapterHandle({
      editorElement: editor,
      readText: () => {
        const blockText = readTextFromBlockElements(editor, blockSelector);
        if (blockText.length > 0) return blockText;
        return (editor.textContent ?? "").replace(/ /g, " ").trim();
      },
      caretRect: () => null,
      debounceMs: 500,
      detectParagraphBreak: detectBlockAddition(".kix-paragraphrenderer"),
    });
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
    ...PAGE_WRAP_CANDIDATES,
    ...BLOCK_CANDIDATES,
    ".kix-appview-editor",
    ".kix-rotatingtilemanager-content",
    ".docs-texteventtarget-iframe",
    ".docs-editor",
    '[contenteditable="true"]',
    '[role="textbox"]',
    '[role="region"][aria-label]',
  ];

  const selectorCounts: Record<string, number> = {};
  for (const selector of selectors) {
    try {
      selectorCounts[selector] = document.querySelectorAll(selector).length;
    } catch {
      selectorCounts[selector] = -1;
    }
  }

  const kixClasses = collectKixClassNames();

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
