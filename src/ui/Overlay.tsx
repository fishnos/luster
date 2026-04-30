import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ModeName } from "@/core/types";
import { Button } from "@/ui/components/ui/button";
import { Badge } from "@/ui/components/ui/badge";
import { Icon } from "@/ui/components/Icon";
import { Mark } from "@/ui/components/Mark";
import { StatusDot } from "@/ui/components/StatusDot";
import { ModeReading } from "@/ui/ModeReading";
import { ModeInterrogation } from "@/ui/ModeInterrogation";
import { ModeCritic } from "@/ui/ModeCritic";
import { ModeEcho } from "@/ui/ModeEcho";
import { ModeSegment } from "@/ui/ModeSegment";
import { sendRunEchoScan } from "@/core/sendRequest";
import { StatsPanel } from "@/ui/StatsPanel";
import { DocContextRow } from "@/ui/DocContextRow";
import { ConnectBanner } from "@/ui/ConnectBanner";
import { EditorHint, runDocsDiagnostic } from "@/ui/EditorHint";
import { InlineSettings } from "@/ui/InlineSettings";
import { useOverlayState } from "@/ui/useOverlayState";
import type {
  AutoModeReason,
  AutoModeStatus,
  OverlayController,
  OverlayState,
} from "@/ui/state";
import { cn } from "@/ui/cn";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export interface OverlayProps {
  controller: OverlayController;
}

export function Overlay({ controller }: OverlayProps) {
  const state = useOverlayState(controller);
  if (state.closed) return null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {state.minimized ? (
        <MinimizedBadge key="minimized" controller={controller} state={state} />
      ) : (
        <FullPanel key="panel" controller={controller} state={state} />
      )}
    </AnimatePresence>
  );
}

function FullPanel({
  controller,
  state,
}: {
  controller: OverlayController;
  state: OverlayState;
}) {
  return (
    <motion.div
      role="region"
      aria-label="Luster"
      initial={{ opacity: 0, y: 6, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.985 }}
      transition={{ duration: 0.22, ease: EASE_OUT }}
      style={{
        position: "fixed",
        left: state.position.x,
        top: state.position.y,
        width: 360,
        maxHeight: "85vh",
        zIndex: 2147483647,
      }}
      className="luster-root luster-card text-luster-ink overflow-hidden flex flex-col"
    >
      <div className="shrink-0">
        <Header controller={controller} state={state} />
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3"
        style={{ overscrollBehavior: "contain" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {state.view === "main" ? (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
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
              transition={{ duration: 0.2, ease: EASE_OUT }}
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
      </div>
    </motion.div>
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
      className="flex h-12 cursor-grab items-center gap-2.5 px-4 active:cursor-grabbing"
    >
      <Mark size={18} rounded={false} />
      <div className="flex items-center gap-2">
        <span className="luster-display text-[14px] leading-none">Luster</span>
        <StatusDot status={state.modes[state.activeMode].status} />
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
            transition={{ duration: 0.2, ease: EASE_OUT }}
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
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
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
        {!state.editorAttached && state.connectState !== "missing" && (
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
              <div className="flex items-center gap-2 text-[11px] text-luster-faint">
                <span className="relative inline-block h-1 w-12 overflow-hidden rounded bg-luster-subtle">
                  <motion.span
                    className="absolute inset-y-0 w-1/3 rounded bg-luster-accent/60"
                    animate={{ x: ["-50%", "200%"] }}
                    transition={{
                      duration: 1.4,
                      ease: "linear",
                      repeat: Infinity,
                    }}
                  />
                </span>
                Looking for the editor on this page…
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

function MinimizedBadge({
  controller,
  state,
}: {
  controller: OverlayController;
  state: OverlayState;
}) {
  const status = state.modes[state.activeMode].status;
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
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      style={{
        position: "fixed",
        left: state.position.x,
        top: state.position.y,
        zIndex: 2147483647,
      }}
      className={cn(
        "luster-root luster-card flex items-center gap-2 h-9 px-3 rounded-full cursor-grab active:cursor-grabbing",
      )}
    >
      <Mark size={18} />
      <span className="luster-num text-[12px] font-medium text-luster-ink">
        {wordCount.toLocaleString()}
      </span>
      {status !== "idle" && (
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full",
            status === "pending" && "bg-luster-accent luster-pulse",
            status === "error" && "bg-luster-err",
            status === "rate-limited" && "bg-luster-warn",
            status === "ok" && "bg-luster-ok",
          )}
        />
      )}
    </motion.button>
  );
}
