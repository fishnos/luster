import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { Overlay } from "@/ui/Overlay";
import { CaretChip } from "@/ui/CaretChip";
import { createOverlayController, type OverlayController } from "@/ui/state";
import type { CriticIssue } from "@/core/types";
import themeCss from "@/ui/theme.css?inline";

const HOST_ID = "luster-host";

export interface OverlayMount {
  controller: OverlayController;
  setCaretIssue: (caretRect: DOMRect | null, issue: CriticIssue | null) => void;
  destroy: () => void;
}

export function mountOverlay(): OverlayMount {
  const existing = document.getElementById(HOST_ID);
  if (existing) existing.remove();

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.all = "initial";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const styleNode = document.createElement("style");
  styleNode.textContent = themeCss;
  shadow.appendChild(styleNode);

  const overlayMount = document.createElement("div");
  const caretMount = document.createElement("div");
  shadow.appendChild(overlayMount);
  shadow.appendChild(caretMount);

  const controller = createOverlayController();

  const overlayRoot: Root = createRoot(overlayMount);
  overlayRoot.render(createElement(Overlay, { controller }));

  const caretRoot: Root = createRoot(caretMount);
  let caretRect: DOMRect | null = null;
  let caretIssue: CriticIssue | null = null;
  function renderCaretChip(): void {
    caretRoot.render(
      createElement(CaretChip, { caretRect, issue: caretIssue }),
    );
  }
  renderCaretChip();

  return {
    controller,
    setCaretIssue(nextRect, nextIssue) {
      caretRect = nextRect;
      caretIssue = nextIssue;
      renderCaretChip();
    },
    destroy() {
      overlayRoot.unmount();
      caretRoot.unmount();
      host.remove();
    },
  };
}
