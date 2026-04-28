import { useCallback, useRef } from "react";
import type { ModeName } from "@/core/types";
import { Button } from "@/ui/components/Button";
import { StatusDot } from "@/ui/components/StatusDot";
import { ModeReading } from "@/ui/ModeReading";
import { ModeInterrogation } from "@/ui/ModeInterrogation";
import { ModeCritic } from "@/ui/ModeCritic";
import { StatsPanel } from "@/ui/StatsPanel";
import { useOverlayState } from "@/ui/useOverlayState";
import type { OverlayController } from "@/ui/state";
import { cn } from "@/ui/cn";

const TABS: { mode: ModeName; label: string; key: string }[] = [
  { mode: "reading", label: "Reading", key: "R" },
  { mode: "interrogation", label: "Interrogation", key: "I" },
  { mode: "critic", label: "Critic", key: "C" },
];

export interface OverlayProps {
  controller: OverlayController;
}

export function Overlay({ controller }: OverlayProps) {
  const state = useOverlayState(controller);
  const dragOriginRef = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const onDragPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);
      dragOriginRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        startX: state.position.x,
        startY: state.position.y,
      };
    },
    [state.position.x, state.position.y],
  );

  const onDragPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const origin = dragOriginRef.current;
      if (!origin) return;
      const nextX = origin.startX + (event.clientX - origin.pointerX);
      const nextY = origin.startY + (event.clientY - origin.pointerY);
      controller.setPosition({ x: nextX, y: nextY });
    },
    [controller],
  );

  const onDragPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
      dragOriginRef.current = null;
    },
    [],
  );

  return (
    <div
      role="region"
      aria-label="Luster"
      className="luster-root fixed shadow-overlay rounded-lg border border-luster-border bg-luster-bg text-luster-ink"
      style={{
        right: state.position.x,
        top: state.position.y,
        width: state.collapsed ? 220 : 320,
        zIndex: 2147483647,
      }}
    >
      <div
        data-testid="luster-drag-handle"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onPointerCancel={onDragPointerUp}
        className="flex cursor-grab items-center justify-between border-b border-luster-border bg-luster-panel px-3 py-2 active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <span className="font-serif text-luster-accent">Luster</span>
          <StatusDot status={state.modes[state.activeMode].status} />
        </div>
        <Button
          variant="ghost"
          aria-label={state.collapsed ? "Expand Luster" : "Collapse Luster"}
          onClick={() => controller.setCollapsed(!state.collapsed)}
        >
          {state.collapsed ? "+" : "–"}
        </Button>
      </div>

      {!state.collapsed && (
        <>
          <div
            role="tablist"
            aria-label="Mode"
            className="flex gap-1 border-b border-luster-border bg-luster-panel px-2 py-1"
          >
            {TABS.map((tab) => {
              const isActive = state.activeMode === tab.mode;
              return (
                <Button
                  key={tab.mode}
                  variant={isActive ? "tab-active" : "tab"}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`luster-panel-${tab.mode}`}
                  className={cn("flex-1", isActive && "shadow-inner")}
                  onClick={() => controller.setActiveMode(tab.mode)}
                >
                  <span className="mr-1 rounded bg-black/30 px-1 text-[10px]">
                    {tab.key}
                  </span>
                  {tab.label}
                </Button>
              );
            })}
          </div>

          <div className="space-y-2 p-2">
            <StatsPanel stats={state.stats} />
            <div
              role="tabpanel"
              id={`luster-panel-${state.activeMode}`}
              aria-label={`${state.activeMode} mode`}
            >
              <ActiveModePanel controller={controller} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ActiveModePanel({ controller }: { controller: OverlayController }) {
  const state = useOverlayState(controller);
  switch (state.activeMode) {
    case "reading":
      return <ModeReading info={state.modes.reading} />;
    case "interrogation":
      return <ModeInterrogation info={state.modes.interrogation} />;
    case "critic":
      return (
        <ModeCritic info={state.modes.critic} sentence={state.criticSentence} />
      );
  }
}
