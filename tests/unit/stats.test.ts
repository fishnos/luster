import { describe, expect, it } from "vitest";
import { computeStats } from "@/core/stats";

describe("computeStats", () => {
  it("returns zeros for empty input", () => {
    const stats = computeStats("   ");
    expect(stats.words).toBe(0);
    expect(stats.sentences).toBe(0);
    expect(stats.paragraphs).toBe(0);
    expect(stats.fleschKincaidGrade).toBe(0);
  });

  it("counts words, sentences, and paragraphs", () => {
    const text = "The bell rang. She turned.\n\nNo one was there.";
    const stats = computeStats(text);
    expect(stats.sentences).toBe(3);
    expect(stats.paragraphs).toBe(2);
    expect(stats.words).toBe(9);
  });

  it("computes average and longest sentence word counts", () => {
    const stats = computeStats("Short sentence. Another tiny one.");
    expect(stats.sentences).toBe(2);
    expect(stats.avgSentenceWords).toBeCloseTo(2.5);
    expect(stats.longestSentenceWords).toBe(3);
  });

  it("flags repeated sentence openers", () => {
    const text =
      "She walked away slowly. She returned later that day. She never spoke about it.";
    const stats = computeStats(text);
    const opener = stats.repeatedOpeners.find(
      (entry) => entry.opener === "she",
    );
    expect(opener).toBeDefined();
    expect(opener!.count).toBe(3);
  });

  it("detects passive voice with auxiliary plus past participle", () => {
    const text = "The cake was eaten quickly. The window was broken yesterday.";
    const stats = computeStats(text);
    expect(stats.passiveRatio).toBeGreaterThan(0.5);
  });

  it("does not flag active sentences as passive", () => {
    const text =
      "She wrote the letter. He carried the box. They closed the door.";
    const stats = computeStats(text);
    expect(stats.passiveRatio).toBe(0);
  });

  it("produces a positive Flesch-Kincaid grade for ordinary prose", () => {
    const text =
      "The quick brown fox jumps over the lazy dog repeatedly. The dog watches in silence.";
    const stats = computeStats(text);
    expect(stats.fleschKincaidGrade).toBeGreaterThan(0);
  });

  it("returns the most frequent non-stop words", () => {
    const text =
      "The garden bloomed in spring. The garden withered by autumn. The garden returned again.";
    const stats = computeStats(text);
    const garden = stats.topWords.find((entry) => entry.word === "garden");
    expect(garden).toBeDefined();
    expect(garden!.count).toBe(3);
  });
});
