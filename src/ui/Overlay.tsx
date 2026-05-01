import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ModeName } from "@/core/types";
import { Button } from "@/ui/components/ui/button";
import { Badge } from "@/ui/components/ui/badge";
import { Icon } from "@/ui/components/Icon";
import { Mark } from "@/ui/components/Mark";
import { Odometer } from "@/ui/motion/Odometer";
import { StatusDot } from "@/ui/components/StatusDot";
import { ModeReading } from "@/ui/ModeReading";
import { ModeInterrogation } from "@/ui/ModeInterrogation";
import { ModeCritic } from "@/ui/ModeCritic";
import { ModeEcho } from "@/ui/ModeEcho";
import { ModeSegment } from "@/ui/ModeSegment";
import {
  sendGoogleAuthConnect,
  sendGoogleAuthForget,
  sendGoogleAuthRedirect,
  sendRunEchoScan,
} from "@/core/sendRequest";
import { StatsPanel } from "@/ui/StatsPanel";
import { DocContextRow } from "@/ui/DocContextRow";
import { ConnectBanner } from "@/ui/ConnectBanner";
import { EditorHint, runDocsDiagnostic } from "@/ui/EditorHint";
import { InlineSettings } from "@/ui/InlineSettings";
import { useOverlayState } from "@/ui/useOverlayState";
import type {
  AutoModeReason,
  AutoModeStatus,
  HostKind,
  OverlayController,
  OverlayState,
} from "@/ui/state";
import { EASE_OUT, SECTION_TRANSITION, TAB_TRANSITION } from "@/ui/motion";
import { cn } from "@/ui/cn";
import { createKeyVault } from "@/core/keyVault";
import { createBrowserLocalStorage } from "@/core/storageBackend";

const overlayKeyVault = createKeyVault(createBrowserLocalStorage());

export interface OverlayProps {
  controller: OverlayController;
}

const SHELL_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const SHELL_DURATION_MS = 460;
const SHELL_TRANSITION_CSS = `width ${SHELL_DURATION_MS}ms ${SHELL_EASE}, height ${SHELL_DURATION_MS}ms ${SHELL_EASE}, border-radius ${SHELL_DURATION_MS}ms ${SHELL_EASE}`;

const PILL_WIDTH = 140;
const PILL_HEIGHT = 36;
const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 560;

export function Overlay({ controller }: OverlayProps) {
  const state = useOverlayState(controller);
  if (state.closed) return null;

  const isMin = state.minimized;

  return (
    <div
      role={isMin ? undefined : "region"}
      aria-label={isMin ? undefined : "Luster"}
      style={{
        position: "fixed",
        left: state.position.x,
        top: state.position.y,
        width: isMin ? PILL_WIDTH : PANEL_WIDTH,
        height: isMin ? PILL_HEIGHT : PANEL_HEIGHT,
        borderRadius: isMin ? 999 : 14,
        zIndex: 2147483647,
        maxHeight: "85vh",
        transition: SHELL_TRANSITION_CSS,
      }}
      className="luster-root luster-card text-luster-ink overflow-hidden flex flex-col"
    >
      {isMin ? (
        <MinimizedInner controller={controller} state={state} />
      ) : (
        <PanelInner controller={controller} state={state} />
      )}
    </div>
  );
}

function PanelInner({
  controller,
  state,
}: {
  controller: OverlayController;
  state: OverlayState;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, delay: 0.18 }}
        className="shrink-0"
      >
        <Header controller={controller} state={state} />
        <div className="luster-rule mx-4" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.26, delay: 0.22 }}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3"
        style={{ overscrollBehavior: "contain" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {state.view === "main" ? (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={SECTION_TRANSITION}
              className="space-y-4"
            >
              <MainView controller={controller} state={state} />
            </motion.div>
          ) : (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={SECTION_TRANSITION}
            >
              <InlineSettings
                onBack={() => controller.setView("main")}
                onConnectionChange={(connectState, provider) =>
                  controller.setConnectState(connectState, provider ?? null)
                }
                onAutoLaunchChange={(value) => controller.setAutoLaunch(value)}
                onDefaultModeChange={(mode) => controller.setActiveMode(mode)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

function Header({
  controller,
  state,
}: {
  controller: OverlayController;
  state: OverlayState;
}) {
  const dragOriginRef = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const eventTarget = event.target as Element | null;
      if (
        eventTarget &&
        eventTarget.closest(
          'button, a, input, select, textarea, [role="button"]',
        )
      ) {
        return;
      }
      const target = event.currentTarget;
      if (typeof target.setPointerCapture === "function") {
        target.setPointerCapture(event.pointerId);
      }
      dragOriginRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        startX: state.position.x,
        startY: state.position.y,
      };
    },
    [state.position.x, state.position.y],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const origin = dragOriginRef.current;
      if (!origin) return;
      const nextX = origin.startX + (event.clientX - origin.pointerX);
      const nextY = origin.startY + (event.clientY - origin.pointerY);
      controller.setPosition({ x: Math.max(0, nextX), y: Math.max(0, nextY) });
    },
    [controller],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      if (
        typeof target.hasPointerCapture === "function" &&
        target.hasPointerCapture(event.pointerId) &&
        typeof target.releasePointerCapture === "function"
      ) {
        target.releasePointerCapture(event.pointerId);
      }
      dragOriginRef.current = null;
    },
    [],
  );

  return (
    <div
      data-testid="luster-drag-handle"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative flex h-12 cursor-grab items-center gap-3 px-4 active:cursor-grabbing"
    >
      <Mark size={20} spin />
      <div className="flex items-center gap-2.5">
        <span className="luster-display text-[19px] leading-none">luster</span>
        <StatusDot status={state.modes[state.activeMode]?.status ?? "idle"} />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            state.view === "settings" ? "Back to main" : "Open settings"
          }
          aria-pressed={state.view === "settings"}
          className="h-8 w-8"
          onClick={() =>
            controller.setView(state.view === "settings" ? "main" : "settings")
          }
        >
          <Icon
            name={state.view === "settings" ? "back" : "sliders"}
            size={14}
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Minimize Luster"
          className="h-8 w-8 hover:text-luster-err"
          onClick={() => controller.setMinimized(true)}
        >
          <Icon name="close" size={14} />
        </Button>
      </div>
    </div>
  );
}

function MainView({
  controller,
  state,
}: {
  controller: OverlayController;
  state: OverlayState;
}) {
  return (
    <>
      <AnimatePresence initial={false}>
        {state.connectState === "missing" && (
          <motion.div
            key="connect"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={SECTION_TRANSITION}
            style={{ overflow: "hidden" }}
          >
            <ConnectBanner
              onConnected={(provider) => {
                controller.setConnectState("connected", provider);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {state.adapterAuth.kind === "needs-auth" && (
          <motion.div
            key="gauth"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={SECTION_TRANSITION}
            style={{ overflow: "hidden" }}
          >
            <GoogleAuthBanner controller={controller} state={state} />
          </motion.div>
        )}
        {state.adapterAuth.kind === "not-configured" && (
          <motion.div
            key="gauth-cfg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={SECTION_TRANSITION}
            style={{ overflow: "hidden" }}
          >
            <GoogleAuthNotConfigured error={state.adapterAuth.error} />
          </motion.div>
        )}
        {state.adapterAuth.kind === "doc-error" && (
          <motion.div
            key="gauth-doc-error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={SECTION_TRANSITION}
            style={{ overflow: "hidden" }}
          >
            <GoogleDocFetchError
              controller={controller}
              reason={state.adapterAuth.reason}
              status={state.adapterAuth.status}
              error={state.adapterAuth.error}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <StatsPanel stats={state.stats} />

      <DocContextRow controller={controller} state={state} />

      <ModeSegment
        active={state.activeMode}
        modes={state.modes}
        onSelect={(mode) => {
          controller.setActiveMode(mode);
          if (state.docContext.autoMode) {
            controller.setAutoModeStatus({
              active: true,
              lastSwitchReason: null,
              lastSwitchAt: Date.now(),
            });
          }
        }}
      />

      <AutoSwitchToast status={state.autoModeStatus} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={state.activeMode}
          role="tabpanel"
          id={`luster-panel-${state.activeMode}`}
          aria-label={`${state.activeMode} mode`}
          initial={{
            opacity: 0,
            x: 8,
            clipPath: "inset(0 100% 0 0)",
          }}
          animate={{
            opacity: 1,
            x: 0,
            clipPath: "inset(0 0 0 0)",
          }}
          exit={{
            opacity: 0,
            x: -6,
            clipPath: "inset(0 0 0 100%)",
          }}
          transition={TAB_TRANSITION}
        >
          {state.activeMode === "reading" && (
            <ModeReading controller={controller} info={state.modes.reading} />
          )}
          {state.activeMode === "interrogation" && (
            <ModeInterrogation
              controller={controller}
              info={state.modes.interrogation}
            />
          )}
          {state.activeMode === "critic" && (
            <ModeCritic
              controller={controller}
              info={state.modes.critic}
              sentence={state.criticSentence}
            />
          )}
          {state.activeMode === "echo" && (
            <ModeEcho
              controller={controller}
              info={state.modes.echo}
              fullText={state.fullText}
              onScan={async () => {
                if (!state.docId || state.fullText.trim().length === 0) return;
                controller.markModePending("echo");
                const result = await sendRunEchoScan({
                  docId: state.docId,
                  fullText: state.fullText,
                });
                if (!result.ok) {
                  if (result.reason === "rate-limited") {
                    controller.setModeRateLimited(
                      "echo",
                      result.retryAfterMs ?? 60_000,
                    );
                  } else if (result.reason === "no-key") {
                    controller.setModeError(
                      "echo",
                      `No API key for ${
                        result.provider ?? "the active provider"
                      }. Open Luster settings to add one.`,
                    );
                  } else {
                    controller.setModeError(
                      "echo",
                      result.error ?? result.reason,
                    );
                  }
                  return;
                }
                controller.setModeOutput(
                  "echo",
                  result.output,
                  result.provider,
                );
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {state.hostDisabledKind !== null && (
          <motion.div
            key="host-disabled"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
          >
            <HostDisabledBanner hostKind={state.hostDisabledKind} />
          </motion.div>
        )}
        {state.hostDisabledKind === null &&
          !state.editorAttached &&
          state.connectState !== "missing" && (
            <motion.div
              key={state.editorSearchStuck ? "stuck" : "searching"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
            >
              {state.editorSearchStuck ? (
                <EditorHint hostKind={state.hostKind} />
              ) : (
                <div className="flex items-center gap-2 text-[12px] text-luster-muted">
                  <span className="relative h-px w-16 overflow-hidden">
                    <span className="absolute inset-0 luster-thinking-bar" />
                  </span>
                  <span>Looking for the editor</span>
                </div>
              )}
            </motion.div>
          )}
      </AnimatePresence>
      {!state.editorAttached && state.connectState === "connected" && (
        <p className="text-[11px] text-luster-faint italic">
          Stats and AI calls start as soon as Luster can read the document.
        </p>
      )}
    </>
  );
}

const AUTO_REASON_TEXT: Record<AutoModeReason, string> = {
  "drafting-paragraph-commit": "Switched to Reading — paragraph just landed.",
  "thinking-pause": "Switched to Interrogation — long pause detected.",
  "revising-edits": "Switched to Critic — heavy revision in last 30s.",
  "polishing-touchups": "Switched to Critic — small targeted edits.",
  "flow-suppress": "Holding mode — you're in flow.",
};

function AutoSwitchToast({ status }: { status: AutoModeStatus }) {
  const [visible, setVisible] = useState(false);
  const lastSwitchAt = status.lastSwitchAt;
  const reason = status.lastSwitchReason;

  useEffect(() => {
    if (!status.active || lastSwitchAt === null || reason === null) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 4000);
    return () => window.clearTimeout(timer);
  }, [status.active, lastSwitchAt, reason]);

  if (!visible || reason === null) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -2 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      className="text-[11px] italic text-luster-faint"
    >
      {AUTO_REASON_TEXT[reason]}
    </motion.div>
  );
}

function MinimizedInner({
  controller,
  state,
}: {
  controller: OverlayController;
  state: OverlayState;
}) {
  const status = state.modes[state.activeMode]?.status ?? "idle";
  const wordCount = state.stats?.words ?? 0;

  const dragOriginRef = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const justDraggedRef = useRef(false);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      const target = event.currentTarget;
      if (typeof target.setPointerCapture === "function") {
        target.setPointerCapture(event.pointerId);
      }
      dragOriginRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        startX: state.position.x,
        startY: state.position.y,
        moved: false,
      };
      justDraggedRef.current = false;
    },
    [state.position.x, state.position.y],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const origin = dragOriginRef.current;
      if (!origin) return;
      const deltaX = event.clientX - origin.pointerX;
      const deltaY = event.clientY - origin.pointerY;
      if (!origin.moved && Math.hypot(deltaX, deltaY) < 4) return;
      origin.moved = true;
      const nextX = origin.startX + deltaX;
      const nextY = origin.startY + deltaY;
      controller.setPosition({ x: Math.max(0, nextX), y: Math.max(0, nextY) });
    },
    [controller],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const target = event.currentTarget;
      if (
        typeof target.hasPointerCapture === "function" &&
        target.hasPointerCapture(event.pointerId) &&
        typeof target.releasePointerCapture === "function"
      ) {
        target.releasePointerCapture(event.pointerId);
      }
      const moved = dragOriginRef.current?.moved ?? false;
      justDraggedRef.current = moved;
      dragOriginRef.current = null;
    },
    [],
  );

  return (
    <motion.button
      type="button"
      aria-label="Open Luster"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(event) => {
        if (justDraggedRef.current) {
          event.preventDefault();
          event.stopPropagation();
          justDraggedRef.current = false;
          return;
        }
        controller.setMinimized(false);
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, delay: 0.18 }}
      className={cn(
        "flex h-full w-full cursor-grab items-center justify-center gap-2 px-4 active:cursor-grabbing",
      )}
    >
      <Mark size={16} />
      <Odometer
        value={wordCount}
        className={cn(
          "luster-num text-[12px] font-medium leading-none transition-colors",
          status === "pending" && "text-luster-ember",
          status === "error" && "text-luster-err",
          status === "rate-limited" && "text-luster-warn",
          status === "ok" && "text-luster-ok",
          status === "idle" && "text-luster-ink",
        )}
      />
    </motion.button>
  );
}

function HostDisabledBanner({ hostKind }: { hostKind: HostKind }) {
  const [pending, setPending] = useState<"none" | "enable" | "signin">("none");
  const [error, setError] = useState<string | null>(null);
  const label =
    hostKind === "google-docs"
      ? "Google Docs"
      : hostKind === "notion"
        ? "Notion"
        : hostKind === "prosemirror"
          ? "this editor"
          : "this site";

  async function enableReading(): Promise<void> {
    setError(null);
    setPending("enable");
    await overlayKeyVault.setGoogleDocsMode("bridge");
    await overlayKeyVault.setGoogleDocsEnabled(true);
    window.location.reload();
  }

  async function signInWithGoogle(): Promise<void> {
    setError(null);
    setPending("signin");
    const result = await sendGoogleAuthConnect(true);
    if (!result.connected) {
      setPending("none");
      setError(
        result.error ??
          (result.reason === "not-configured"
            ? "Google sign-in isn't configured for this build."
            : "Sign-in didn't complete."),
      );
      return;
    }
    await overlayKeyVault.setGoogleDocsMode("api");
    await overlayKeyVault.setGoogleDocsEnabled(true);
    window.location.reload();
  }

  return (
    <div className="space-y-2 rounded-md border border-luster-border-strong/50 bg-luster-subtle/40 p-3">
      <div className="luster-eyebrow">Reading is off for {label}</div>
      <p className="text-[12px] leading-snug text-luster-muted">
        Luster is mounted but won't see your draft on this page until you turn
        reading back on. Either let Luster read the page directly, or sign into
        Google for the API path.
      </p>
      {error && (
        <p className="text-[11px] leading-snug text-luster-err">{error}</p>
      )}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          disabled={pending !== "none"}
          onClick={() => void enableReading()}
          className="luster-btn-primary"
        >
          {pending === "enable" ? "Enabling…" : "Enable reading"}
        </button>
        {hostKind === "google-docs" && (
          <button
            type="button"
            disabled={pending !== "none"}
            onClick={() => void signInWithGoogle()}
            className="luster-btn-text"
          >
            {pending === "signin" ? "Signing in…" : "Sign in with Google"}
          </button>
        )}
      </div>
    </div>
  );
}

function GoogleAuthBanner({
  controller,
  state,
}: {
  controller: OverlayController;
  state: OverlayState;
}) {
  const [pending, setPending] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [redirectInfo, setRedirectInfo] = useState<{
    redirectUrl: string | null;
    clientId: string | null;
  } | null>(null);
  const isDenied =
    state.adapterAuth.kind === "needs-auth" &&
    state.adapterAuth.reason === "denied";

  useEffect(() => {
    if (showSetup && !redirectInfo) {
      void sendGoogleAuthRedirect().then(setRedirectInfo);
    }
  }, [showSetup, redirectInfo]);

  return (
    <div className="space-y-2 rounded-md bg-luster-subtle/40 p-3">
      <div className="luster-eyebrow">Connect Google Docs</div>
      <p className="text-[12px] leading-snug text-luster-muted">
        Luster reads your draft through Google's Docs API to keep word count and
        editorial feedback in sync. Read-only — your text never leaves your
        device.
      </p>
      <p className="text-[11px] leading-snug text-luster-faint">
        If your account can't sign in (school / Workspace), turn on Tools →
        Accessibility → Screen reader support and Luster will read the page
        directly without OAuth.
      </p>
      {isDenied && (
        <p className="text-[11px] leading-snug text-luster-warn">
          Authorization was declined. Click connect to try again.
        </p>
      )}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            await controller.requestAdapterAuth(true);
            setPending(false);
          }}
          className="luster-btn-primary"
        >
          {pending ? "Connecting…" : "Connect"}
        </button>
      </div>
    </div>
  );
}

function GoogleDocFetchError({
  controller,
  reason,
  status,
  error,
}: {
  controller: OverlayController;
  reason:
    | "permission-denied"
    | "not-found"
    | "rate-limited"
    | "office-file"
    | "screen-reader-off"
    | "error";
  status?: number;
  error?: string;
}) {
  const [pending, setPending] = useState(false);
  const isOfficeFile = reason === "office-file";
  const isScreenReaderOff = reason === "screen-reader-off";
  const hideReconnect = isOfficeFile || isScreenReaderOff;
  const headline =
    reason === "permission-denied"
      ? "This Google account can't open the doc"
      : reason === "not-found"
        ? "Doc not found for this account"
        : reason === "rate-limited"
          ? "Google Docs rate limit hit"
          : reason === "office-file"
            ? "This is a Word file, not a Google Doc"
            : reason === "screen-reader-off"
              ? "Turn on screen reader support to use Luster here"
              : "Couldn't reach this doc";
  const body =
    reason === "permission-denied" || reason === "not-found"
      ? "The Google account you authorized doesn't have read access to this document. Reconnect with the account that owns or was shared this doc."
      : reason === "rate-limited"
        ? "Google paused requests for a moment. Luster will retry."
        : reason === "office-file"
          ? "Luster can't read Office files via Google's API. Open File → Save as Google Docs, OR enable Tools → Accessibility → Turn on screen reader support and Luster will read this page directly."
          : reason === "screen-reader-off"
            ? "Open Tools → Accessibility, turn on Screen reader support. Luster will pick up the doc text within a few seconds — no Google sign-in needed. (Your work setting may block third-party sign-ins; this path skips that entirely.)"
            : "Google's API returned an error. Reconnecting may help.";
  return (
    <div className="space-y-2 rounded-md border border-luster-border-strong/50 bg-luster-subtle/40 p-3">
      <div className="luster-eyebrow text-luster-warn">{headline}</div>
      <p className="text-[12px] leading-snug text-luster-muted">{body}</p>
      {!hideReconnect && (error || status) && (
        <p className="luster-mono text-[10px] leading-snug text-luster-faint">
          {status ? `HTTP ${status}` : ""}
          {status && error ? " · " : ""}
          {error ?? ""}
        </p>
      )}
      <div className="flex items-center gap-3 pt-1">
        {!hideReconnect && (
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await sendGoogleAuthForget();
              await controller.requestAdapterAuth(true);
              setPending(false);
            }}
            className="luster-btn-primary"
          >
            {pending ? "Reconnecting…" : "Reconnect Google"}
          </button>
        )}
      </div>
    </div>
  );
}

function GoogleAuthNotConfigured({ error }: { error?: string }) {
  return (
    <div className="space-y-2 rounded-md border border-luster-border-strong/50 bg-luster-subtle/40 p-3">
      <div className="luster-eyebrow text-luster-warn">
        Google API not set up
      </div>
      <p className="text-[12px] leading-snug text-luster-muted">
        Luster needs an OAuth client ID for Google Docs. Set
        <code className="luster-mono mx-1 rounded bg-luster-ink/10 px-1 py-0.5 text-[11px]">
          WXT_GOOGLE_OAUTH_CLIENT_ID
        </code>
        and rebuild.
      </p>
      {error && (
        <p className="text-[11px] leading-snug text-luster-faint">{error}</p>
      )}
    </div>
  );
}
