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

describe("Overlay", () => {
  it("renders three mode tabs with the active one selected", () => {
    const controller = createOverlayController();
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
    const controller = createOverlayController();
    render(<Overlay controller={controller} />);
    expect(
      screen.getByText(/finish a paragraph to get a read-back/i),
    ).toBeInTheDocument();
  });

  it("switches the visible panel when a different tab is clicked", async () => {
    const controller = createOverlayController();
    const user = userEvent.setup();
    render(<Overlay controller={controller} />);

    await user.click(screen.getByRole("tab", { name: /critic/i }));
    expect(controller.getState().activeMode).toBe("critic");
    expect(
      screen.getByText(/finish a sentence to be critiqued/i),
    ).toBeInTheDocument();
  });

  it("renders live stats when the controller publishes them", () => {
    const controller = createOverlayController();
    controller.setStats(baseStats);
    render(<Overlay controller={controller} />);

    expect(screen.getByText("words")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.getByText("passive")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("she")).toBeInTheDocument();
  });

  it("renders the parsed reading output when reading mode is ok", () => {
    const controller = createOverlayController();
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
    const controller = createOverlayController();
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
    const controller = createOverlayController();
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

  it("shows a rate-limited banner when a mode is paused", async () => {
    const controller = createOverlayController();
    controller.setActiveMode("critic");
    controller.setModeRateLimited("critic", 12_000);
    render(<Overlay controller={controller} />);

    expect(
      screen.getByText(/paused to stay under your rate limit/i),
    ).toBeInTheDocument();
  });

  it("collapses and expands when the chevron button is clicked", async () => {
    const controller = createOverlayController();
    const user = userEvent.setup();
    render(<Overlay controller={controller} />);

    const collapseButton = screen.getByRole("button", {
      name: /collapse luster/i,
    });
    await user.click(collapseButton);

    expect(controller.getState().collapsed).toBe(true);
    expect(
      screen.queryByRole("tab", { name: /reading/i }),
    ).not.toBeInTheDocument();
  });
});
