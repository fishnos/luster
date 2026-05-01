import type { ModeName, ModeOutput, ProviderId } from "@/core/types";
import type { DocStats } from "@/core/stats";
import type { DocContext } from "@/core/docContext";
import { EMPTY_DOC_CONTEXT } from "@/core/docContext";
import type { AdapterAuthState } from "@/adapters/types";

export type ModeStatus = "idle" | "pending" | "ok" | "error" | "rate-limited";

export type OverlayView = "main" | "settings";

export type ConnectState = "unknown" | "missing" | "connected";

export interface ModeOverlayInfo {
  status: ModeStatus;
  output?: ModeOutput;
  error?: string;
  retryAfterMs?: number;
  provider?: ProviderId;
  lastUpdatedAt?: number;
}

export type AutoModeReason =
  | "drafting-paragraph-commit"
  | "thinking-pause"
  | "revising-edits"
  | "polishing-touchups"
  | "flow-suppress";

export interface AutoModeStatus {
  active: boolean;
  lastSwitchReason: AutoModeReason | null;
  lastSwitchAt: number | null;
}

export interface OverlayState {
  activeMode: ModeName;
  view: OverlayView;
  minimized: boolean;
  position: { x: number; y: number };
  caretPosition: { x: number; y: number } | null;
  stats: DocStats | null;
  modes: Record<ModeName, ModeOverlayInfo>;
  criticSentence: string | null;
  connectState: ConnectState;
  connectedProvider: ProviderId | null;
  autoLaunch: boolean;
  editorAttached: boolean;
  editorSearchStuck: boolean;
  hostKind: HostKind;
  isPinned: boolean;
  closed: boolean;
  docId: string | null;
  docContext: DocContext;
  autoModeStatus: AutoModeStatus;
  fullText: string;
  adapterAuth: AdapterAuthState;
}

export type HostKind = "unknown" | "google-docs" | "notion" | "prosemirror";

const INITIAL_MODE_INFO: ModeOverlayInfo = { status: "idle" };

export function createInitialOverlayState(): OverlayState {
  return {
    activeMode: "reading",
    view: "main",
    minimized: false,
    position: { x: Math.max(24, window.innerWidth - 420), y: 96 },
    caretPosition: null,
    stats: null,
    modes: {
      reading: { ...INITIAL_MODE_INFO },
      interrogation: { ...INITIAL_MODE_INFO },
      critic: { ...INITIAL_MODE_INFO },
      echo: { ...INITIAL_MODE_INFO },
    },
    criticSentence: null,
    connectState: "unknown",
    connectedProvider: null,
    autoLaunch: true,
    editorAttached: false,
    editorSearchStuck: false,
    hostKind: "unknown",
    isPinned: false,
    closed: false,
    docId: null,
    docContext: { ...EMPTY_DOC_CONTEXT },
    autoModeStatus: {
      active: false,
      lastSwitchReason: null,
      lastSwitchAt: null,
    },
    fullText: "",
    adapterAuth: { kind: "not-required" },
  };
}

export interface OverlayController {
  getState: () => OverlayState;
  subscribe: (listener: () => void) => () => void;
  setActiveMode: (mode: ModeName) => void;
  setView: (view: OverlayView) => void;
  setMinimized: (minimized: boolean) => void;
  setPosition: (position: { x: number; y: number }) => void;
  setCaretPosition: (position: { x: number; y: number } | null) => void;
  setStats: (stats: DocStats) => void;
  setFullText: (text: string) => void;
  markModePending: (mode: ModeName) => void;
  setModeOutput: (
    mode: ModeName,
    output: ModeOutput,
    provider?: ProviderId,
  ) => void;
  setModeError: (mode: ModeName, error: string) => void;
  setModeRateLimited: (mode: ModeName, retryAfterMs: number) => void;
  setCriticSentence: (sentence: string | null) => void;
  setConnectState: (state: ConnectState, provider?: ProviderId | null) => void;
  setAutoLaunch: (value: boolean) => void;
  setEditorAttached: (value: boolean) => void;
  setEditorSearchStuck: (value: boolean) => void;
  setHostKind: (value: HostKind) => void;
  setPinned: (value: boolean) => void;
  setClosed: (value: boolean) => void;
  setDocId: (docId: string | null) => void;
  setDocContext: (context: DocContext) => void;
  setBrief: (brief: string) => void;
  setPact: (pact: string) => void;
  setAutoMode: (autoMode: boolean) => void;
  setAutoModeStatus: (status: AutoModeStatus) => void;
  setActiveModeFromAuto: (mode: ModeName, reason: AutoModeReason) => void;
  setAdapterAuth: (state: AdapterAuthState) => void;
  setAdapterAuthRequester: (
    requester: ((interactive: boolean) => Promise<AdapterAuthState>) | null,
  ) => void;
  requestAdapterAuth: (interactive: boolean) => Promise<AdapterAuthState>;
  resetMode: (mode: ModeName) => void;
  reset: () => void;
}

export function createOverlayController(): OverlayController {
  let state = createInitialOverlayState();
  const listeners = new Set<() => void>();
  let authRequester:
    | ((interactive: boolean) => Promise<AdapterAuthState>)
    | null = null;

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

    setView(view) {
      update((current) =>
        current.view === view ? current : { ...current, view },
      );
    },

    setMinimized(minimized) {
      update((current) =>
        current.minimized === minimized ? current : { ...current, minimized },
      );
    },

    setPosition(position) {
      update((current) => ({ ...current, position }));
    },
    setCaretPosition(caretPosition) {
      update((current) => ({ ...current, caretPosition }));
    },

    setStats(stats) {
      update((current) => ({ ...current, stats }));
    },

    setFullText(text) {
      update((current) =>
        current.fullText === text ? current : { ...current, fullText: text },
      );
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

    setConnectState(connectState, provider) {
      update((current) => ({
        ...current,
        connectState,
        connectedProvider: provider ?? null,
      }));
    },

    setAutoLaunch(value) {
      update((current) =>
        current.autoLaunch === value
          ? current
          : { ...current, autoLaunch: value },
      );
    },

    setEditorAttached(value) {
      update((current) =>
        current.editorAttached === value
          ? current
          : { ...current, editorAttached: value },
      );
    },

    setEditorSearchStuck(value) {
      update((current) =>
        current.editorSearchStuck === value
          ? current
          : { ...current, editorSearchStuck: value },
      );
    },

    setHostKind(value) {
      update((current) =>
        current.hostKind === value ? current : { ...current, hostKind: value },
      );
    },

    setPinned(value) {
      update((current) =>
        current.isPinned === value ? current : { ...current, isPinned: value },
      );
    },
    setClosed(value) {
      update((current) =>
        current.closed === value ? current : { ...current, closed: value },
      );
    },
    setDocId(docId) {
      update((current) =>
        current.docId === docId ? current : { ...current, docId },
      );
    },
    setDocContext(context) {
      update((current) => ({ ...current, docContext: context }));
    },
    setBrief(brief) {
      update((current) => ({
        ...current,
        docContext: { ...current.docContext, brief },
      }));
    },
    setPact(pact) {
      update((current) => ({
        ...current,
        docContext: { ...current.docContext, pact },
      }));
    },
    setAutoMode(autoMode) {
      update((current) => ({
        ...current,
        docContext: { ...current.docContext, autoMode },
      }));
    },
    setAutoModeStatus(status) {
      update((current) => ({ ...current, autoModeStatus: status }));
    },
    setActiveModeFromAuto(mode, reason) {
      update((current) => {
        if (current.activeMode === mode) {
          return {
            ...current,
            autoModeStatus: {
              active: true,
              lastSwitchReason: reason,
              lastSwitchAt: Date.now(),
            },
          };
        }
        return {
          ...current,
          activeMode: mode,
          autoModeStatus: {
            active: true,
            lastSwitchReason: reason,
            lastSwitchAt: Date.now(),
          },
        };
      });
    },
    setAdapterAuth(adapterAuth) {
      update((current) => ({ ...current, adapterAuth }));
    },

    setAdapterAuthRequester(requester) {
      authRequester = requester;
    },

    async requestAdapterAuth(interactive) {
      if (!authRequester) {
        return state.adapterAuth;
      }
      return authRequester(interactive);
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
