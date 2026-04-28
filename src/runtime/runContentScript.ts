import type { ContentScriptContext } from "wxt/client";
import type { Adapter, AdapterId } from "@/adapters/types";
import { mountOverlay } from "@/ui/mountOverlay";
import { bootstrapAdapter } from "@/runtime/bootstrapAdapter";
import { onBridgeState } from "@/adapters/google-docs";
import type { HostKind } from "@/ui/state";

const POLL_INTERVAL_MS = 500;
const STUCK_AFTER_MS = 4000;

const HOST_KIND: Record<AdapterId, HostKind> = {
  "google-docs": "google-docs",
  notion: "notion",
  prosemirror: "prosemirror",
};

export async function runContentScript(
  ctx: ContentScriptContext,
  adapter: Adapter,
): Promise<void> {
  const url = new URL(window.location.href);
  if (!adapter.matchUrl(url)) return;

  const overlayMount = await mountOverlay(ctx);
  overlayMount.controller.setHostKind(HOST_KIND[adapter.id]);

  let detachAdapter: (() => void) | null = null;

  const unsubscribeBridgeState =
    adapter.id === "google-docs"
      ? onBridgeState((state) => {
          if (state === "unsupported") {
            overlayMount.controller.setEditorSearchStuck(true);
          } else if (state === "attached") {
            overlayMount.controller.setEditorSearchStuck(false);
          }
        })
      : () => {};

  function tryAttach(): boolean {
    if (detachAdapter) return true;
    if (!adapter.matchEditor(document)) return false;
    const dispose = bootstrapAdapter({
      adapter,
      controller: overlayMount.controller,
      setCaretIssue: overlayMount.setCaretIssue,
    });
    if (!dispose) return false;
    overlayMount.controller.setEditorAttached(true);
    overlayMount.controller.setEditorSearchStuck(false);
    detachAdapter = () => {
      dispose.detach();
      overlayMount.controller.setEditorAttached(false);
    };
    return true;
  }

  if (tryAttach()) {
    ctx.onInvalidated(() => {
      detachAdapter?.();
      overlayMount.destroy();
    });
    return;
  }

  const observer = new MutationObserver(() => {
    if (tryAttach()) observer.disconnect();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  const intervalId = window.setInterval(() => {
    if (tryAttach()) {
      window.clearInterval(intervalId);
      observer.disconnect();
    }
  }, POLL_INTERVAL_MS);

  const stuckTimer = window.setTimeout(() => {
    if (!detachAdapter) {
      overlayMount.controller.setEditorSearchStuck(true);
    }
  }, STUCK_AFTER_MS);

  ctx.onInvalidated(() => {
    observer.disconnect();
    window.clearInterval(intervalId);
    window.clearTimeout(stuckTimer);
    unsubscribeBridgeState();
    detachAdapter?.();
    overlayMount.destroy();
  });
}
