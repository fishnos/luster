import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Overlay } from "@/ui/Overlay";
import { createOverlayController } from "@/ui/state";
import type { DocStats } from "@/core/stats";

const baseStats: DocStats = {
  words: 24,
  sentences: 4,
  paragraphs: 2,
  characters: 110,
  avgSentenceWords: 6,
  longestSentenceWords: 10,
  fleschKincaidGrade: 8.2,
  passiveRatio: 0.25,
  repeatedOpeners: [{ opener: "she", count: 2 }],
  topWords: [],
};

afterEach(cleanup);

function controllerWithKey() {
  const controller = createOverlayController();
  controller.setConnectState("connected", "gemini");
  return controller;
}

describe("Overlay", () => {
  it("renders three mode tabs with the active one selected when connected", () => {
    const controller = controllerWithKey();
    render(<Overlay controller={controller} />);

    expect(screen.getByRole("tab", { name: /reading/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /interrogation/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: /critic/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("shows the idle prompt for the active mode when there is no output", () => {
    const controller = controllerWithKey();
    render(<Overlay controller={controller} />);
    expect(
      screen.getByText(/finish a paragraph to get an editor's read-back/i),
    ).toBeInTheDocument();
  });

  it("switches the visible panel when a different tab is clicked", async () => {
    const controller = controllerWithKey();
    const user = userEvent.setup();
    render(<Overlay controller={controller} />);

    await user.click(screen.getByRole("tab", { name: /critic/i }));
    expect(controller.getState().activeMode).toBe("critic");
    expect(
      await screen.findByText(/finish a sentence to be critiqued/i),
    ).toBeInTheDocument();
  });

  it("renders the live word count in the header", () => {
    const controller = controllerWithKey();
    controller.setStats(baseStats);
    render(<Overlay controller={controller} />);

    expect(screen.getByLabelText(/24 words in document/i)).toBeInTheDocument();
  });

  it("renders live stats in the stats panel", () => {
    const controller = controllerWithKey();
    controller.setStats(baseStats);
    render(<Overlay controller={controller} />);

    expect(screen.getByText("passive")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("she")).toBeInTheDocument();
  });

  it("renders the parsed reading output when reading mode is ok", () => {
    const controller = controllerWithKey();
    controller.setModeOutput("reading", {
      mode: "reading",
      result: {
        voiceTrend: "The voice tightens across the paragraph.",
        rhythm: "Two short clauses then one long one.",
        paragraphPurpose: "Marks an interruption.",
        transitionStrength: "Crisp jump from quiet to bell.",
        notes: ["The bell could become a recurring image."],
      },
    });
    render(<Overlay controller={controller} />);

    expect(screen.getByText(/voice tightens/i)).toBeInTheDocument();
    expect(screen.getByText(/recurring image/i)).toBeInTheDocument();
  });

  it("renders an interrogation question with its kind tag", async () => {
    const controller = controllerWithKey();
    controller.setActiveMode("interrogation");
    controller.setModeOutput("interrogation", {
      mode: "interrogation",
      result: {
        questions: [
          {
            kind: "craft",
            text: "Why open with the verb instead of the subject?",
          },
        ],
      },
    });
    render(<Overlay controller={controller} />);

    expect(screen.getByText("craft")).toBeInTheDocument();
    expect(
      screen.getByText("Why open with the verb instead of the subject?"),
    ).toBeInTheDocument();
  });

  it("renders critic issues with severity badges and a highlighted span", () => {
    const sentence = "The dog quickly ran out the door.";
    const controller = controllerWithKey();
    controller.setActiveMode("critic");
    controller.setCriticSentence(sentence);
    controller.setModeOutput("critic", {
      mode: "critic",
      result: {
        issues: [
          {
            severity: "rhythm",
            span: { start: 8, end: 15 },
            label: "weak adverb",
          },
        ],
      },
    });
    render(<Overlay controller={controller} />);

    expect(screen.getByText("rhythm")).toBeInTheDocument();
    expect(screen.getByText("weak adverb")).toBeInTheDocument();
    expect(screen.getByText("quickly")).toBeInTheDocument();
  });

  it("shows a rate-limited banner when a mode is paused", () => {
    const controller = controllerWithKey();
    controller.setActiveMode("critic");
    controller.setModeRateLimited("critic", 12_000);
    render(<Overlay controller={controller} />);

    expect(
      screen.getByText(/paused to stay under your rate limit/i),
    ).toBeInTheDocument();
  });

  it("shows the connect banner when no key is present", () => {
    const controller = createOverlayController();
    controller.setConnectState("missing", null);
    render(<Overlay controller={controller} />);

    expect(screen.getByText(/connect to ai to start/i)).toBeInTheDocument();
  });

  it("opens the inline settings view from the header", async () => {
    const controller = controllerWithKey();
    const user = userEvent.setup();
    render(<Overlay controller={controller} />);

    await user.click(screen.getByRole("button", { name: /open settings/i }));
    expect(controller.getState().view).toBe("settings");
  });

  it("minimizes to a floating badge when the close button is pressed", async () => {
    const controller = controllerWithKey();
    const user = userEvent.setup();
    render(<Overlay controller={controller} />);

    await user.click(screen.getByRole("button", { name: /minimize luster/i }));
    expect(controller.getState().minimized).toBe(true);
    expect(
      await screen.findByRole("button", { name: /open luster/i }),
    ).toBeInTheDocument();
  });
});
