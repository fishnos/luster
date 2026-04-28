import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import type { ContentScriptContext } from "wxt/client";
import { createShadowRootUi } from "wxt/client";
import { Overlay } from "@/ui/Overlay";
import { CaretChip } from "@/ui/CaretChip";
import { createOverlayController, type OverlayController } from "@/ui/state";
import type { CriticIssue } from "@/core/types";
import "@/ui/theme.css";

export interface OverlayMount {
  controller: OverlayController;
  setCaretIssue: (caretRect: DOMRect | null, issue: CriticIssue | null) => void;
  destroy: () => void;
}

export async function mountOverlay(
  ctx: ContentScriptContext,
): Promise<OverlayMount> {
  const controller = createOverlayController();
  let caretRect: DOMRect | null = null;
  let caretIssue: CriticIssue | null = null;
  let caretRoot: Root | null = null;
  let overlayRoot: Root | null = null;

  function renderCaretChip(): void {
    if (!caretRoot) return;
    caretRoot.render(
      createElement(CaretChip, { caretRect, issue: caretIssue }),
    );
  }

  const ui = await createShadowRootUi(ctx, {
    name: "luster-overlay",
    position: "inline",
    anchor: "body",
    append: "last",
    onMount(container) {
      const overlayMountPoint = document.createElement("div");
      const caretMountPoint = document.createElement("div");
      container.appendChild(overlayMountPoint);
      container.appendChild(caretMountPoint);

      overlayRoot = createRoot(overlayMountPoint);
      overlayRoot.render(createElement(Overlay, { controller }));

      caretRoot = createRoot(caretMountPoint);
      renderCaretChip();
    },
    onRemove() {
      overlayRoot?.unmount();
      caretRoot?.unmount();
      overlayRoot = null;
      caretRoot = null;
    },
  });

  ui.mount();

  return {
    controller,
    setCaretIssue(nextRect, nextIssue) {
      caretRect = nextRect;
      caretIssue = nextIssue;
      renderCaretChip();
    },
    destroy() {
      ui.remove();
    },
  };
}
