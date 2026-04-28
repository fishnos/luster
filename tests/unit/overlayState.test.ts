import { describe, expect, it, vi } from "vitest";
import { createOverlayController } from "@/ui/state";
import type { DocStats } from "@/core/stats";

const sampleStats: DocStats = {
  words: 12,
  sentences: 3,
  paragraphs: 1,
  characters: 60,
  avgSentenceWords: 4,
  longestSentenceWords: 6,
  fleschKincaidGrade: 7,
  passiveRatio: 0.1,
  repeatedOpeners: [],
  topWords: [],
};

describe("createOverlayController", () => {
  it("starts with reading mode active and all modes idle", () => {
    const controller = createOverlayController();
    const state = controller.getState();
    expect(state.activeMode).toBe("reading");
    expect(state.view).toBe("main");
    expect(state.minimized).toBe(false);
    expect(state.connectState).toBe("unknown");
    expect(state.autoLaunch).toBe(true);
    expect(state.modes.reading.status).toBe("idle");
    expect(state.modes.interrogation.status).toBe("idle");
    expect(state.modes.critic.status).toBe("idle");
    expect(state.stats).toBeNull();
    expect(state.criticSentence).toBeNull();
  });

  it("toggles between main and settings views", () => {
    const controller = createOverlayController();
    controller.setView("settings");
    expect(controller.getState().view).toBe("settings");
    controller.setView("main");
    expect(controller.getState().view).toBe("main");
  });

  it("minimizes and restores the panel", () => {
    const controller = createOverlayController();
    controller.setMinimized(true);
    expect(controller.getState().minimized).toBe(true);
    controller.setMinimized(false);
    expect(controller.getState().minimized).toBe(false);
  });

  it("records the connection state with the connected provider", () => {
    const controller = createOverlayController();
    controller.setConnectState("connected", "gemini");
    const state = controller.getState();
    expect(state.connectState).toBe("connected");
    expect(state.connectedProvider).toBe("gemini");
  });

  it("toggles the autoLaunch preference", () => {
    const controller = createOverlayController();
    controller.setAutoLaunch(false);
    expect(controller.getState().autoLaunch).toBe(false);
  });

  it("changes the active mode and notifies subscribers", () => {
    const controller = createOverlayController();
    const observer = vi.fn();
    controller.subscribe(observer);
    controller.setActiveMode("critic");
    expect(controller.getState().activeMode).toBe("critic");
    expect(observer).toHaveBeenCalledTimes(1);
  });

  it("does not notify when active mode is set to its current value", () => {
    const controller = createOverlayController();
    const observer = vi.fn();
    controller.subscribe(observer);
    controller.setActiveMode("reading");
    expect(observer).not.toHaveBeenCalled();
  });

  it("marks a mode pending and clears any prior error", () => {
    const controller = createOverlayController();
    controller.setModeError("reading", "previous failure");
    controller.markModePending("reading");
    const info = controller.getState().modes.reading;
    expect(info.status).toBe("pending");
    expect(info.error).toBeUndefined();
  });

  it("records a successful mode output with provider attribution", () => {
    const controller = createOverlayController();
    controller.setModeOutput(
      "reading",
      {
        mode: "reading",
        result: {
          voiceTrend: "measured",
          rhythm: "steady",
          paragraphPurpose: "establishes the scene",
          transitionStrength: "soft",
          notes: [],
        },
      },
      "anthropic",
    );
    const info = controller.getState().modes.reading;
    expect(info.status).toBe("ok");
    expect(info.provider).toBe("anthropic");
    expect(info.output?.mode).toBe("reading");
    expect(info.lastUpdatedAt).toBeGreaterThan(0);
  });

  it("records a rate-limited mode with a retry-after hint", () => {
    const controller = createOverlayController();
    controller.setModeRateLimited("critic", 12_000);
    const info = controller.getState().modes.critic;
    expect(info.status).toBe("rate-limited");
    expect(info.retryAfterMs).toBe(12_000);
  });

  it("updates stats and the critic sentence independently of mode info", () => {
    const controller = createOverlayController();
    controller.setStats(sampleStats);
    controller.setCriticSentence("Hello world.");
    expect(controller.getState().stats).toEqual(sampleStats);
    expect(controller.getState().criticSentence).toBe("Hello world.");
  });

  it("reset returns the state to its initial shape", () => {
    const controller = createOverlayController();
    controller.setActiveMode("critic");
    controller.setStats(sampleStats);
    controller.setModeOutput("reading", {
      mode: "reading",
      result: {
        voiceTrend: "a",
        rhythm: "b",
        paragraphPurpose: "c",
        transitionStrength: "d",
        notes: [],
      },
    });

    controller.reset();

    const state = controller.getState();
    expect(state.activeMode).toBe("reading");
    expect(state.stats).toBeNull();
    expect(state.modes.reading.status).toBe("idle");
  });

  it("subscribe returns an unsubscribe that stops further notifications", () => {
    const controller = createOverlayController();
    const observer = vi.fn();
    const unsubscribe = controller.subscribe(observer);
    controller.setActiveMode("critic");
    expect(observer).toHaveBeenCalledTimes(1);
    unsubscribe();
    controller.setActiveMode("interrogation");
    expect(observer).toHaveBeenCalledTimes(1);
  });
});
