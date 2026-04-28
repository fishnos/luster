import type { Adapter } from "@/adapters/types";
import { mountOverlay } from "@/ui/mountOverlay";
import { bootstrapAdapter } from "@/runtime/bootstrapAdapter";

export function runContentScript(adapter: Adapter): void {
  if (!adapter.match(new URL(window.location.href), document)) {
    return;
  }

  const overlayMount = mountOverlay();
  const adapterDispose = bootstrapAdapter({
    adapter,
    controller: overlayMount.controller,
    setCaretIssue: overlayMount.setCaretIssue,
  });

  if (!adapterDispose) {
    overlayMount.destroy();
    return;
  }

  window.addEventListener(
    "pagehide",
    () => {
      adapterDispose.detach();
      overlayMount.destroy();
    },
    { once: true },
  );
}
