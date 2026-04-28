import type { ModeName, ModeOutput, ProviderId } from "@/core/types";
import type { DocStats } from "@/core/stats";

export type ModeStatus = "idle" | "pending" | "ok" | "error" | "rate-limited";

export interface ModeOverlayInfo {
  status: ModeStatus;
  output?: ModeOutput;
  error?: string;
  retryAfterMs?: number;
  provider?: ProviderId;
  lastUpdatedAt?: number;
}

export interface OverlayState {
  activeMode: ModeName;
  collapsed: boolean;
  position: { x: number; y: number };
  stats: DocStats | null;
  modes: Record<ModeName, ModeOverlayInfo>;
  criticSentence: string | null;
}

const INITIAL_MODE_INFO: ModeOverlayInfo = { status: "idle" };

export function createInitialOverlayState(): OverlayState {
  return {
    activeMode: "reading",
    collapsed: false,
    position: { x: 16, y: 96 },
    stats: null,
    modes: {
      reading: { ...INITIAL_MODE_INFO },
      interrogation: { ...INITIAL_MODE_INFO },
      critic: { ...INITIAL_MODE_INFO },
    },
    criticSentence: null,
  };
}

export interface OverlayController {
  getState: () => OverlayState;
  subscribe: (listener: () => void) => () => void;
  setActiveMode: (mode: ModeName) => void;
  setCollapsed: (collapsed: boolean) => void;
  setPosition: (position: { x: number; y: number }) => void;
  setStats: (stats: DocStats) => void;
  markModePending: (mode: ModeName) => void;
  setModeOutput: (
    mode: ModeName,
    output: ModeOutput,
    provider?: ProviderId,
  ) => void;
  setModeError: (mode: ModeName, error: string) => void;
  setModeRateLimited: (mode: ModeName, retryAfterMs: number) => void;
  setCriticSentence: (sentence: string | null) => void;
  resetMode: (mode: ModeName) => void;
  reset: () => void;
}

export function createOverlayController(): OverlayController {
  let state = createInitialOverlayState();
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of listeners) listener();
  }

  function update(producer: (current: OverlayState) => OverlayState): void {
    const next = producer(state);
    if (next === state) return;
    state = next;
    notify();
  }

  function withMode(
    mode: ModeName,
    transform: (current: ModeOverlayInfo) => ModeOverlayInfo,
  ): void {
    update((current) => ({
      ...current,
      modes: {
        ...current.modes,
        [mode]: transform(current.modes[mode]),
      },
    }));
  }

  return {
    getState() {
      return state;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setActiveMode(mode) {
      update((current) =>
        current.activeMode === mode
          ? current
          : { ...current, activeMode: mode },
      );
    },

    setCollapsed(collapsed) {
      update((current) =>
        current.collapsed === collapsed ? current : { ...current, collapsed },
      );
    },

    setPosition(position) {
      update((current) => ({ ...current, position }));
    },

    setStats(stats) {
      update((current) => ({ ...current, stats }));
    },

    markModePending(mode) {
      withMode(mode, (existing) => ({
        ...existing,
        status: "pending",
        error: undefined,
        retryAfterMs: undefined,
      }));
    },

    setModeOutput(mode, output, provider) {
      withMode(mode, () => ({
        status: "ok",
        output,
        provider,
        lastUpdatedAt: Date.now(),
      }));
    },

    setModeError(mode, error) {
      withMode(mode, (existing) => ({
        ...existing,
        status: "error",
        error,
        lastUpdatedAt: Date.now(),
      }));
    },

    setModeRateLimited(mode, retryAfterMs) {
      withMode(mode, (existing) => ({
        ...existing,
        status: "rate-limited",
        retryAfterMs,
        error: undefined,
        lastUpdatedAt: Date.now(),
      }));
    },

    setCriticSentence(sentence) {
      update((current) => ({ ...current, criticSentence: sentence }));
    },

    resetMode(mode) {
      withMode(mode, () => ({ ...INITIAL_MODE_INFO }));
    },

    reset() {
      state = createInitialOverlayState();
      notify();
    },
  };
}
