import { useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ModeName } from "@/core/types";
import { Button } from "@/ui/components/Button";
import { Icon } from "@/ui/components/Icon";
import { Mark } from "@/ui/components/Mark";
import { StatusDot } from "@/ui/components/StatusDot";
import { ModeReading } from "@/ui/ModeReading";
import { ModeInterrogation } from "@/ui/ModeInterrogation";
import { ModeCritic } from "@/ui/ModeCritic";
import { ModeSegment } from "@/ui/ModeSegment";
import { StatsPanel } from "@/ui/StatsPanel";
import { ConnectBanner } from "@/ui/ConnectBanner";
import { EditorHint } from "@/ui/EditorHint";
import { InlineSettings } from "@/ui/InlineSettings";
import { useOverlayState } from "@/ui/useOverlayState";
import type { OverlayController, OverlayState } from "@/ui/state";
import { cn } from "@/ui/cn";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export interface OverlayProps {
  controller: OverlayController;
}

export function Overlay({ controller }: OverlayProps) {
  const state = useOverlayState(controller);

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
        right: state.position.x,
        top: state.position.y,
        width: 360,
        zIndex: 2147483647,
      }}
      className="luster-root luster-card text-luster-ink overflow-hidden"
    >
      <Header controller={controller} state={state} />
      <div className="px-3 py-3">
        <AnimatePresence mode="wait" initial={false}>
          {state.view === "main" ? (
            <motion.div
              key="main"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="space-y-3"
            >
              <MainView controller={controller} state={state} />
            </motion.div>
          ) : (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
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
      const nextX = origin.startX - (event.clientX - origin.pointerX);
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

  const wordCount = state.stats?.words ?? 0;

  return (
    <div
      data-testid="luster-drag-handle"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="flex h-11 cursor-grab items-center gap-2 border-b border-luster-border px-3 active:cursor-grabbing"
    >
      <Mark size={20} />
      <div className="flex items-baseline gap-2">
        <span className="luster-serif text-[15px] tracking-tight text-luster-ink">
          Luster
        </span>
        <StatusDot status={state.modes[state.activeMode].status} />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <span
          className="luster-mono text-[11px] tabular-nums text-luster-faint mr-1"
          aria-label={`${wordCount} words in document`}
        >
          {wordCount.toLocaleString("en-US")}{" "}
          <span className="text-luster-faint">words</span>
        </span>
        <Button
          variant="icon"
          aria-label={
            state.view === "settings" ? "Back to main" : "Open settings"
          }
          aria-pressed={state.view === "settings"}
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
          variant="icon"
          aria-label="Minimize Luster"
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

      <ModeSegment
        active={state.activeMode}
        modes={state.modes}
        onSelect={(mode) => controller.setActiveMode(mode)}
      />

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
            <ModeReading info={state.modes.reading} />
          )}
          {state.activeMode === "interrogation" && (
            <ModeInterrogation info={state.modes.interrogation} />
          )}
          {state.activeMode === "critic" && (
            <ModeCritic
              info={state.modes.critic}
              sentence={state.criticSentence}
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

function MinimizedBadge({
  controller,
  state,
}: {
  controller: OverlayController;
  state: OverlayState;
}) {
  const status = state.modes[state.activeMode].status;
  return (
    <motion.button
      type="button"
      aria-label="Open Luster"
      onClick={() => controller.setMinimized(false)}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.04 }}
      style={{
        position: "fixed",
        right: state.position.x,
        top: state.position.y,
        zIndex: 2147483647,
      }}
      className={cn(
        "luster-root flex h-10 w-10 items-center justify-center rounded-full bg-white border border-luster-border shadow-overlay",
      )}
    >
      <Mark size={20} />
      {status !== "idle" && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 inline-block h-2 w-2 rounded-full",
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
