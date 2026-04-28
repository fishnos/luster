import { useSyncExternalStore } from "react";
import type { OverlayController, OverlayState } from "@/ui/state";

export function useOverlayState(controller: OverlayController): OverlayState {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
}
