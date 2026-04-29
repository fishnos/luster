import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { Overlay } from "@/ui/Overlay";
import { CaretPopup } from "@/ui/CaretChip";
import { createOverlayController, type OverlayController } from "@/ui/state";
import type { CaretPopupData } from "@/core/types";
import "@/ui/theme.css";

export interface OverlayMount {
  controller: OverlayController;
  setCaretPopup: (caretRect: DOMRect | null, data: CaretPopupData | null) => void;
  destroy: () => void;
}

export async function mountOverlay(
  ctx: ContentScriptContext,
): Promise<OverlayMount> {
  const controller = createOverlayController();
  let caretRect: DOMRect | null = null;
  let caretData: CaretPopupData | null = null;
  let caretRoot: Root | null = null;
  let overlayRoot: Root | null = null;

  function renderCaretChip(): void {
    if (!caretRoot) return;
    caretRoot.render(
      createElement(CaretPopup, { caretRect, data: caretData }),
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
    setCaretPopup(nextRect, nextData) {
      caretRect = nextRect;
      caretData = nextData;
      renderCaretChip();
    },
    destroy() {
      ui.remove();
    },
  };
}
